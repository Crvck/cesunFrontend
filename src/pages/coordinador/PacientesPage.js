import React, { useState, useEffect } from 'react';
import { FiSearch, FiUserPlus, FiEdit2, FiTrash2, FiFilter, FiUser, FiCalendar, FiPhone, FiMail, FiFileText, FiXCircle, FiCheckCircle } from 'react-icons/fi';
import './coordinador.css';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { useAuth } from '../../context/AuthContext';
import { createCoordinatorTour } from '../../utils/coordinatorTour';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

const CoordinadorPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [includeInactivos, setIncludeInactivos] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('nuevo');
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    fecha_inscripcion: '',
    genero: '',
    telefono: '',
    email: '',
    direccion: '',
    disponibilidad: {
      dias: [],
      comentarios: ''
    },
    es_estudiante: false,
    matricula: '',
    institucion_educativa: '',
    carrera: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    motivo_consulta: '',
    motivo_consulta_especial: 'No aplica',
    antecedentes: '',
    activo: true,
    estado: 'activo',
    fundacion_id: null
  });

  // Estados para expediente
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showDetalles, setShowDetalles] = useState(false);
  const [expediente, setExpediente] = useState(null);
  const [sesionesPaciente, setSesionesPaciente] = useState([]);
  const [estadisticasExpediente, setEstadisticasExpediente] = useState(null);
  const [showCarreraSuggestions, setShowCarreraSuggestions] = useState(false);
  const [carreraError, setCarreraError] = useState('');
  const opcionesCarreras = [
    'Administración de Empresas',
    'Contaduría Pública',
    'Ingeniería en Multimedia'
  ];
  const { user } = useAuth();
  const [tour] = useState(() => createCoordinatorTour('pacientes'));

  useEffect(() => {
    fetchPacientes();

    // Escuchar asignaciones creadas para actualizar la UI inmediatamente
    const onAsignacionCreada = (e) => {
      const payload = e.detail || {};
      console.log('onAsignacionCreada recibido:', payload);
      const pacienteId = payload.paciente_id;
      if (!pacienteId) return;

      const terapeutaFromPayload = payload.terapeuta || payload.psicologo || (payload.asignacion && (payload.asignacion.Terapeuta || payload.asignacion.Psicologo) ? `${(payload.asignacion.Terapeuta || payload.asignacion.Psicologo).nombre} ${(payload.asignacion.Terapeuta || payload.asignacion.Psicologo).apellido}` : null);
      const coterapeutaFromPayload = payload.coterapeuta || payload.becario || (payload.asignacion && (payload.asignacion.Coterapeuta || payload.asignacion.Becario) ? `${(payload.asignacion.Coterapeuta || payload.asignacion.Becario).nombre} ${(payload.asignacion.Coterapeuta || payload.asignacion.Becario).apellido}` : null);

      setPacientes(prev => {
        let found = false;
        const next = prev.map(p => {
          if (String(p.id) === String(pacienteId)) {
            found = true;
            const updated = {
              ...p,
              terapeuta_asignado: terapeutaFromPayload || p.terapeuta_asignado || p.psicologo_asignado || 'Asignado',
              coterapeuta_asignado: coterapeutaFromPayload || p.coterapeuta_asignado || p.becario_asignado || 'Asignado'
            };
            console.log('Paciente actualizado localmente:', pacienteId, updated);
            return updated;
          }
          return p;
        });
        if (!found) {
          console.warn('onAsignacionCreada: paciente no encontrado localmente:', pacienteId);
          // Sincronizar desde el servidor para asegurar que el paciente aparece con la nueva asignación
          (async () => {
            try {
              console.log('Sincronizando pacientes tras asignación...');
              await fetchPacientes();
              notifications.info('Lista de pacientes sincronizada tras asignación');
            } catch (err) {
              console.warn('Error al sincronizar pacientes tras asignación:', err);
            }
          })();
        }
        return next;
      });
    };

    window.addEventListener('asignacionCreada', onAsignacionCreada);
    return () => window.removeEventListener('asignacionCreada', onAsignacionCreada);
  }, []);

  useEffect(() => {
    if (user?.fundacion_id && !formData.fundacion_id) {
      setFormData(prev => ({ ...prev, fundacion_id: user.fundacion_id }));
    }
  }, [user]);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      // Usar endpoint /activos que incluye información de asignaciones
      const res = await fetch(`${apiUrl}/api/pacientes/activos`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        console.error('Error fetching pacientes activos:', res.status);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const data = json && json.success ? (json.data || []) : (json || []);

      const parseDisponibilidad = (value, comentarios) => {
        let disponibilidad = value;

        if (!disponibilidad || disponibilidad === 'null') {
          disponibilidad = { dias: [] };
        } else if (typeof disponibilidad === 'string') {
          try {
            disponibilidad = JSON.parse(disponibilidad);
          } catch (err) {
            disponibilidad = { dias: [] };
          }
        }

        if (typeof disponibilidad !== 'object' || Array.isArray(disponibilidad)) {
          disponibilidad = { dias: [] };
        }

        disponibilidad.comentarios = disponibilidad.comentarios ?? comentarios ?? '';
        return disponibilidad;
      };

      // Mapear para mantener compatibilidad con el resto del UI
      const mapped = data.map(p => ({
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        email: p.email,
        telefono: p.telefono,
        fecha_inscripcion: p.fecha_inscripcion,
        genero: p.genero,
        direccion: p.direccion,
        disponibilidad: parseDisponibilidad(p.disponibilidad, p.comentarios_disponibilidad),
        es_estudiante: p.es_estudiante ?? false,
        matricula: p.matricula || '',
        institucion_educativa: p.institucion_educativa || '',
        carrera: p.carrera || '',
        edad_registro: p.edad_registro ?? null,
        usuario_registro_id: p.usuario_registro_id ?? null,
        usuario_registro_nombre: p.usuario_registro_nombre || null,
        usuario_registro_rol: p.usuario_registro_rol || null,
        estado: p.estado,
        activo: p.activo,
        notas: p.notas,
        motivo_consulta: p.motivo_consulta || p.motivo || null,
        motivo_consulta_especial: p.motivo_consulta_especial || 'No aplica',
        fundacion_id: p.fundacion_id,
        fecha_ingreso: p.fecha_ingreso || p.created_at,
        fecha_alta: p.deleted_at || null,
        sesiones_completadas: p.sesiones_completadas || 0,
        terapeuta_asignado: p.terapeuta_nombre || p.psicologo_nombre || null,
        coterapeuta_asignado: p.coterapeuta_nombre || p.becario_nombre || null
      }));

      setPacientes(mapped);
    } catch (error) {
      console.error('Error al obtener pacientes (activos):', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPacientes = pacientes.filter(paciente => {
    const matchesSearch =
      `${paciente.nombre} ${paciente.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (paciente.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (paciente.motivo_consulta || paciente.notas || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado = !filterEstado || paciente.estado === filterEstado;
    const matchesActivo = includeInactivos ? true : paciente.activo;

    return matchesSearch && matchesEstado && matchesActivo;
  });

  const validateCarrera = (value) => {
    const trimmed = String(value || '').trim();
    return opcionesCarreras.includes(trimmed);
  };

  const handleCarreraBlur = () => {
    if (!formData.carrera.trim()) {
      setShowCarreraSuggestions(false);
      setCarreraError('');
      return;
    }

    if (!validateCarrera(formData.carrera)) {
      setFormData(prev => ({
        ...prev,
        carrera: ''
      }));
      setCarreraError('Seleccione una opción válida');
    } else {
      setCarreraError('');
    }
    setShowCarreraSuggestions(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'es_estudiante') {
      setFormData({
        ...formData,
        es_estudiante: checked,
        institucion_educativa: checked ? (formData.institucion_educativa || 'Cesun') : ''
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    if (name === 'carrera') {
      setShowCarreraSuggestions(true);
      setCarreraError('');
    }
  };

  const toggleDisponibilidadDia = (dia) => {
    setFormData(prev => {
      const dias = prev.disponibilidad?.dias || [];
      const exists = dias.some(d => d.dia === dia);
      return {
        ...prev,
        disponibilidad: {
          ...prev.disponibilidad,
          dias: exists
            ? dias.filter(d => d.dia !== dia)
            : [...dias, { dia, horarios: [{ inicio: '', fin: '' }] }]
        }
      };
    });
  };

  const handleDisponibilidadHorario = (dia, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      disponibilidad: {
        ...prev.disponibilidad,
        dias: (prev.disponibilidad?.dias || []).map(d => {
          if (d.dia !== dia) return d;
          return {
            ...d,
            horarios: d.horarios.map((h, idx) => idx === index ? { ...h, [field]: value } : h)
          };
        })
      }
    }));
  };

  const addDisponibilidadHorario = (dia) => {
    setFormData(prev => ({
      ...prev,
      disponibilidad: {
        ...prev.disponibilidad,
        dias: (prev.disponibilidad?.dias || []).map(d => {
          if (d.dia !== dia) return d;
          return {
            ...d,
            horarios: [...d.horarios, { inicio: '', fin: '' }]
          };
        })
      }
    }));
  };

  const removeDisponibilidadHorario = (dia, index) => {
    setFormData(prev => ({
      ...prev,
      disponibilidad: {
        ...prev.disponibilidad,
        dias: (prev.disponibilidad?.dias || []).map(d => {
          if (d.dia !== dia) return d;
          return {
            ...d,
            horarios: d.horarios.filter((_, idx) => idx !== index)
          };
        }).filter(d => d.horarios.length > 0)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.carrera && !validateCarrera(formData.carrera)) {
      notifications.error('Debe seleccionar una carrera válida del listado');
      return;
    }

    if (modalType === 'nuevo') {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;
        const payload = {
          ...formData,
          disponibilidad: formData.disponibilidad || { dias: [], comentarios: '' },
          fundacion_id: formData.fundacion_id || user?.fundacion_id || null
        };
        const res = await fetch(`${apiUrl}/api/pacientes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          notifications.error(err.message || 'Error creando paciente');
          return;
        }

        const created = await res.json();
        setPacientes(prev => [...prev, created]);
        // Emitir evento para notificar a otras vistas (ej. Asignaciones) que un paciente fue creado
        window.dispatchEvent(new CustomEvent('pacienteCreado', { detail: created }));
        notifications.success('Paciente creado exitosamente');
      } catch (error) {
        console.error('Error creando paciente:', error);
        notifications.error('Error creando paciente');
      }
    } else {
      // Editar paciente: enviar al backend
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;
        const payload = {
          ...formData,
          disponibilidad: formData.disponibilidad || { dias: [], comentarios: '' },
          fundacion_id: formData.fundacion_id || user?.fundacion_id || null
        };
        const res = await fetch(`${apiUrl}/api/pacientes/${formData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          notifications.error(err.message || 'Error actualizando paciente');
          return;
        }

        const updated = await res.json();
        setPacientes(prev => prev.map(p => p.id === updated.id ? updated : p));
        notifications.success('Paciente actualizado exitosamente');
      } catch (error) {
        console.error('Error actualizando paciente:', error);
        notifications.error('Error actualizando paciente');
      }
    }

    setShowModal(false);
    resetForm();
  };

  const editarPaciente = (paciente) => {
    setFormData({
      ...paciente,
      fundacion_id: paciente.fundacion_id ?? user?.fundacion_id ?? null
    });
    setModalType('editar');
    setShowModal(true);
  };

  const toggleActivoPaciente = async (id) => {
    try {
      const paciente = pacientes.find(p => p.id === id);
      if (!paciente) return;
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/pacientes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ activo: !paciente.activo })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notifications.error(err.message || 'Error cambiando estado');
        return;
      }

      const updated = await res.json();
      setPacientes(prev => prev.map(p => p.id === id ? updated : p));
    } catch (error) {
      console.error('Error toggling paciente activo:', error);
      notifications.error('Error cambiando estado del paciente');
    }
  };

  const deletePaciente = async (id) => {
    const confirmado = await confirmations.danger('¿Seguro que desea eliminar (inactivar) este paciente?');
    if (!confirmado) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/pacientes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notifications.error(err.message || 'Error eliminando paciente');
        return;
      }

      setPacientes(prev => prev.filter(p => p.id !== id));
      notifications.success('Paciente eliminado (inactivado) correctamente');
    } catch (error) {
      console.error('Error eliminando paciente:', error);
      notifications.error('Error eliminando paciente');
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'activo':
        return { text: 'Activo', color: 'success' };
      case 'cerrado':
        return { text: 'Cerrado', color: 'secondary' };
      case 'baja_por_faltas':
        return { text: 'Baja por faltas', color: 'danger' };
      case 'canalizacion_por_cesun':
        return { text: 'Canalización por Cesun', color: 'warning' };
      case 'canalizado_por_prepa_cesun':
        return { text: 'Canalizado por Prepa Cesun', color: 'warning' };
      case 'canalizado_a_psiquiatria':
        return { text: 'Canalizado a Psiquiatría', color: 'warning' };
      case 'canalizado_a_paidopsiquiatra':
        return { text: 'Canalizado a Paidopsiquiatra', color: 'warning' };
      case 'canalizado_a_institucion_drogodependientes':
        return { text: 'Canalizado a institución de atención a drogodependientes', color: 'warning' };
      case 'pendiente_por_asignar_terapeuta':
        return { text: 'Pendiente por asignar terapeuta', color: 'info' };
      case 'sin_contacto_con_el_paciente':
        return { text: 'Sin contacto con el paciente', color: 'danger' };
      case 'por_confirmar':
        return { text: 'Por confirmar', color: 'info' };
      case 'alta_terapeutica':
        return { text: 'Alta Terapéutica', color: 'primary' };
      case 'abandono':
        return { text: 'Abandono', color: 'danger' };
      case 'traslado':
        return { text: 'Traslado', color: 'warning' };
      default:
        return { text: estado, color: 'info' };
    }
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      fecha_inscripcion: '',
      genero: '',
      telefono: '',
      email: '',
      direccion: '',
      disponibilidad: {
        dias: [],
        comentarios: ''
      },
      es_estudiante: false,
      matricula: '',
      institucion_educativa: '',
      carrera: '',
      contacto_emergencia_nombre: '',
      contacto_emergencia_telefono: '',
      motivo_consulta: '',
      motivo_consulta_especial: 'No aplica',
      antecedentes: '',
      activo: true,
      estado: 'activo',
      fundacion_id: user?.fundacion_id || null
    });
  };

  const fetchExpediente = async (pacienteId) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/expedientes/paciente/${pacienteId}/completo`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });

      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        console.warn('No JSON body in expediente response', e);
      }

      if (!res.ok) {
        console.error('Error fetching expediente:', res.status, json);
        notifications.error((json && (json.message || json.error)) || 'Error al obtener expediente');
        setExpediente(null);
        setSesionesPaciente([]);
        return;
      }

      const data = json?.data || {};
      setExpediente(data.expediente || {});
      setSesionesPaciente(data.sesiones || []);
      setEstadisticasExpediente(data.estadisticas || {});
    } catch (err) {
      console.error('Error al obtener expediente completo:', err);
      notifications.error('Error al obtener expediente');
      setExpediente(null);
      setSesionesPaciente([]);
      setEstadisticasExpediente(null);
    }
  };

  const showPacienteDetalles = (paciente) => {
    setSelectedPaciente(paciente);
    setShowDetalles(true);
    fetchExpediente(paciente.id);
  };

  const exportarListadoPacientes = async () => {
    try {
      console.log('exportarListadoPacientes called, pacientes filtrados:', filteredPacientes.length);
      notifications.info('Iniciando exportación...');
      const titulo = filterEstado ? `Listado de ${getEstadoLabel(filterEstado).text}` : 'Listado de todos los pacientes';
      const fecha = new Date().toLocaleString();
      const rows = [];

      // Header
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nombre', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Apellido', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Email', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Teléfono', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Edad', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Motivo', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Terapeuta', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Coterapeuta', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sesiones', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Activo', bold: true })] })] }),
        ]
      }));

      filteredPacientes.forEach(p => {
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(p.nombre || '')] }),
            new TableCell({ children: [new Paragraph(p.apellido || '')] }),
            new TableCell({ children: [new Paragraph(p.email || '')] }),
            new TableCell({ children: [new Paragraph(p.telefono || '')] }),
            new TableCell({ children: [new Paragraph(calcularEdad(p.fecha_inscripcion) || '')] }),
            new TableCell({ children: [new Paragraph(p.motivo_consulta || '')] }),
            new TableCell({ children: [new Paragraph(p.terapeuta_asignado || '')] }),
            new TableCell({ children: [new Paragraph(p.coterapeuta_asignado || '')] }),
            new TableCell({ children: [new Paragraph(String(p.sesiones_completadas || 0))] }),
            new TableCell({ children: [new Paragraph(getEstadoLabel(p.estado).text || '')] }),
            new TableCell({ children: [new Paragraph(p.activo ? 'Sí' : 'No')] }),
          ]
        }));
      });

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `Generado: ${fecha}`, spacing: { after: 200 } }),
            new Table({ rows })
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${titulo.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`);
      notifications.success('Descarga iniciada');
    } catch (err) {
      console.error('Error exportando listado de pacientes (coordinador):', err);
      notifications.error('Error exportando listado');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando pacientes...</div>
      </div>
    );
  }

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Pacientes</h1>
          <p>Administración de pacientes del sistema</p>
        </div>
        <div className="flex-row gap-10">
          <button className="btn-secondary" onClick={() => tour.drive()}>
            Tour
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setModalType('nuevo');
              setShowModal(true);
            }}
          >
            <FiUserPlus /> Nuevo Paciente
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="filters-container mb-20">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar paciente por nombre, email o motivo de consulta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="select-field"
            style={{ width: '200px' }}
          >
            <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="cerrado">Cerrado</option>
          <option value="baja_por_faltas">Baja por faltas</option>
          <option value="canalizacion_por_cesun">Canalización por Cesun</option>
          <option value="canalizado_por_prepa_cesun">Canalizado por Prepa Cesun</option>
          <option value="canalizado_a_psiquiatria">Canalizado a Psiquiatría</option>
          <option value="canalizado_a_paidopsiquiatra">Canalizado a Paidopsiquiatra</option>
          <option value="canalizado_a_institucion_drogodependientes">Canalizado a institución de atención a drogodependientes</option>
          <option value="pendiente_por_asignar_terapeuta">Pendiente por asignar terapeuta</option>
          <option value="sin_contacto_con_el_paciente">Sin contacto con el paciente</option>
          <option value="por_confirmar">Por confirmar</option>
          <option value="alta_terapeutica">Alta Terapéutica</option>
          <option value="abandono">Abandono</option>
          <option value="traslado">Traslado</option>
          </select>

          <label className="ml-10 flex-row align-center">
            <input
              type="checkbox"
              checked={includeInactivos}
              onChange={(e) => setIncludeInactivos(e.target.checked)}
            />
            <span className="ml-5">Incluir inactivos</span>
          </label>

          <button
            className="btn-secondary ml-10"
            onClick={() => { setFilterEstado(''); setSearchTerm(''); setIncludeInactivos(true); fetchPacientes(); }}
            title="Mostrar todos"
          >
            Mostrar todos
          </button>

          <button
            className="btn-secondary ml-10"
            onClick={() => fetchPacientes()}
            title="Refrescar"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Tabla de Pacientes */}
      <div className="table-container" style={{ maxHeight: '480px', overflowY: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Contacto</th>
              <th>Edad</th>
              <th>Motivo</th>
              <th>Asignaciones</th>
              <th>Sesiones</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPacientes.map((paciente) => {
              const estadoInfo = getEstadoLabel(paciente.estado);
              const edad = calcularEdad(paciente.fecha_inscripcion);

              return (
                <tr key={paciente.id}>
                  <td>
                    <div className="flex-row align-center gap-10">
                      <div className="avatar">
                        {paciente.nombre[0]}{paciente.apellido[0]}
                      </div>
                      <div>
                        <div className="font-bold">{paciente.nombre} {paciente.apellido}</div>
                        <div className="text-small">
                          {paciente.es_estudiante ? 'Estudiante' : 'No estudiante'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{paciente.email}</div>
                    <div className="text-small">{paciente.telefono}</div>
                  </td>
                  <td>{edad} años</td>
                  <td>
                    <div className="diagnostico-tag">
                      {paciente.motivo_consulta}
                    </div>
                  </td>
                  <td>
                    {paciente.terapeuta_asignado || paciente.coterapeuta_asignado ? (
                      <>
                        {paciente.terapeuta_asignado && (
                          <div className="text-small"><span className="badge badge-info">Terapeuta: {paciente.terapeuta_asignado}</span></div>
                        )}
                        {(!paciente.terapeuta_asignado && paciente.coterapeuta_asignado) && (
                          <div className="text-small"><span className="badge badge-warning">Coterapeuta: {paciente.coterapeuta_asignado}</span></div>
                        )}
                      </>
                    ) : (
                      <div className="text-small text-muted">Sin asignar</div>
                    )}
                  </td>
                  <td>
                    <div className="font-bold">{paciente.sesiones_completadas}</div>
                    <div className="text-small">sesiones</div>
                  </td>
                  <td>
                    <span className={`badge badge-${estadoInfo.color}`}>
                      {estadoInfo.text}
                    </span>
                  </td>
                  <td>
                    <div className="flex-row gap-5">
                      <button
                        className="btn-text"
                        onClick={() => editarPaciente(paciente)}
                        title="Editar"
                      >
                        <FiEdit2 />
                      </button>

                      <button
                        className={`btn-text ${paciente.activo ? 'text-danger' : 'text-success'}`}
                        onClick={() => toggleActivoPaciente(paciente.id)}
                        title={paciente.activo ? 'Desactivar' : 'Activar'}
                      >
                        {paciente.activo ? <FiXCircle /> : <FiCheckCircle />}
                      </button>

                      <button
                        className="btn-text text-danger"
                        onClick={() => deletePaciente(paciente.id)}
                        title="Eliminar"
                      >
                        <FiTrash2 />
                      </button>

                      <button
                        className="btn-text"
                        title="Ver expediente"
                        onClick={() => showPacienteDetalles(paciente)}
                      >
                        <FiFileText />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumen */}
      <div className="grid-3 mt-20">
        <div className="card">
          <h4>Resumen de Pacientes</h4>
          <div className="mt-10">
            <p>Total: {pacientes.length}</p>
            <p>Activos: {pacientes.filter(p => p.activo).length}</p>
            <p>Estudiantes: {pacientes.filter(p => p.es_estudiante).length}</p>
            <p>Con coterapeuta: {pacientes.filter(p => p.coterapeuta_asignado).length}</p>
            <p>Asignados: {pacientes.filter(p => p.terapeuta_asignado || p.coterapeuta_asignado).length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Estadísticas</h4>
          <div className="mt-10">
            <p>Sesiones totales: {pacientes.reduce((sum, p) => sum + (p.sesiones_completadas || 0), 0)}</p>
            <p>Promedio por paciente: {
              Math.round(pacientes.reduce((sum, p) => sum + (p.sesiones_completadas || 0), 0) / Math.max(pacientes.length, 1))
            }</p>
            <p>Altas este mes: {pacientes.filter(p => p.estado === 'alta_terapeutica').length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Acciones</h4>
          <div className="mt-10 flex-col gap-10">

            <button type="button" className="btn-secondary w-100" onClick={exportarListadoPacientes}>
              Exportar Listado
            </button>

          </div>
        </div>
      </div>

      {/* Modal de Paciente */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container modal-large">
            <div className="modal-header">
              <h3>{modalType === 'nuevo' ? 'Nuevo Paciente' : 'Editar Paciente'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de nacimiento</label>
                  <input
                    type="date"
                    name="fecha_inscripcion"
                    value={formData.fecha_inscripcion}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label>Género</label>
                  <select
                    name="genero"
                    value={formData.genero}
                    onChange={handleInputChange}
                    className="select-field"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                    <option value="prefiero_no_decir">Prefiero no decir</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="flex-row align-center gap-10">
                    <input
                      type="checkbox"
                      name="es_estudiante"
                      checked={formData.es_estudiante}
                      onChange={handleInputChange}
                    />
                    <span>Es estudiante</span>
                  </label>
                </div>

                {formData.es_estudiante && (
                  <>
                    <div className="form-group">
                      <label>Matrícula</label>
                      <input
                        type="text"
                        name="matricula"
                        value={formData.matricula}
                        onChange={handleInputChange}
                        className="input-field"
                      />
                    </div>

                    <div className="form-group">
                      <label>Institución educativa</label>
                      <input
                        type="text"
                        name="institucion_educativa"
                        value={formData.institucion_educativa}
                        onChange={handleInputChange}
                        className="input-field"
                      />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                      <label>Carrera / programa académico</label>
                      <input
                        type="text"
                        name="carrera"
                        value={formData.carrera}
                        onChange={(e) => {
                          setFormData({ ...formData, carrera: e.target.value });
                          setCarreraError('');
                          setShowCarreraSuggestions(true);
                        }}
                        onFocus={() => setShowCarreraSuggestions(true)}
                        onBlur={handleCarreraBlur}
                        className="input-field"
                        placeholder="Escribe para buscar y selecciona una opción"
                        autoComplete="off"
                      />
                      {showCarreraSuggestions && (
                        <div className="autocomplete-panel">
                          {opcionesCarreras
                            .filter(option => option.toLowerCase().includes(formData.carrera.toLowerCase()))
                            .map(option => (
                              <div
                                key={option}
                                className="autocomplete-option"
                                onMouseDown={() => {
                                  setFormData({ ...formData, carrera: option });
                                  setCarreraError('');
                                }}
                              >
                                {option}
                              </div>
                            ))}
                          {opcionesCarreras.filter(option => option.toLowerCase().includes(formData.carrera.toLowerCase())).length === 0 && (
                            <div className="autocomplete-empty">No hay coincidencias</div>
                          )}
                        </div>
                      )}
                      {carreraError && (
                        <div className="field-error" style={{ color: '#ff6b6b', marginTop: '6px' }}>
                          {carreraError}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>Contacto de emergencia</label>
                  <input
                    type="text"
                    name="contacto_emergencia_nombre"
                    value={formData.contacto_emergencia_nombre}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Nombre"
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono emergencia</label>
                  <input
                    type="tel"
                    name="contacto_emergencia_telefono"
                    value={formData.contacto_emergencia_telefono}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Teléfono"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Motivo de consulta</label>
                  <textarea
                    name="motivo_consulta"
                    value={formData.motivo_consulta}
                    onChange={handleInputChange}
                    className="textarea-field"
                    rows="3"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Motivo de Consulta Especial</label>
                  <select
                    name="motivo_consulta_especial"
                    value={formData.motivo_consulta_especial}
                    onChange={handleInputChange}
                    className="select-field"
                  >
                    <option value="No aplica">No aplica</option>
                    <option value="Por canalizacion">Por canalización</option>
                    <option value="Por Crisis">Por Crisis</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Antecedentes</label>
                  <textarea
                    name="antecedentes"
                    value={formData.antecedentes}
                    onChange={handleInputChange}
                    className="textarea-field"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Disponibilidad del paciente para atención</label>
                  <div className="checkbox-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => (
                      <label key={dia} className="flex-row align-center gap-10" style={{ fontSize: '14px' }}>
                        <input
                          type="checkbox"
                          checked={(formData.disponibilidad?.dias || []).some(d => d.dia === dia.toLowerCase())}
                          onChange={() => toggleDisponibilidadDia(dia.toLowerCase())}
                        />
                        <span>{dia}</span>
                      </label>
                    ))}
                  </div>
                  {(formData.disponibilidad?.dias || []).map((disponibilidadDia) => (
                    <div key={disponibilidadDia.dia} className="form-group" style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '15px', borderRadius: '10px', marginBottom: '12px' }}>
                      <div className="flex-row justify-between align-center" style={{ marginBottom: '10px' }}>
                        <strong style={{ textTransform: 'capitalize' }}>{disponibilidadDia.dia}</strong>
                        <button
                          type="button"
                          className="btn-text text-danger"
                          onClick={() => removeDisponibilidadHorario(disponibilidadDia.dia, disponibilidadDia.horarios.length - 1)}
                        >
                          Eliminar último horario
                        </button>
                      </div>
                      {(disponibilidadDia.horarios || []).map((horario, index) => (
                        <div key={`${disponibilidadDia.dia}-${index}`} className="grid-2 gap-10" style={{ marginBottom: '10px' }}>
                          <div>
                            <label>Hora inicio</label>
                            <input
                              type="time"
                              className="input-field"
                              value={horario.inicio || ''}
                              onChange={(e) => handleDisponibilidadHorario(disponibilidadDia.dia, index, 'inicio', e.target.value)}
                            />
                          </div>
                          <div>
                            <label>Hora fin</label>
                            <input
                              type="time"
                              className="input-field"
                              value={horario.fin || ''}
                              onChange={(e) => handleDisponibilidadHorario(disponibilidadDia.dia, index, 'fin', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => addDisponibilidadHorario(disponibilidadDia.dia)}
                      >
                        Agregar horario para {disponibilidadDia.dia}
                      </button>
                    </div>
                  ))}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Comentarios de disponibilidad</label>
                    <textarea
                      name="comentarios_disponibilidad"
                      value={formData.disponibilidad?.comentarios || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        disponibilidad: {
                          ...formData.disponibilidad,
                          comentarios: e.target.value
                        }
                      })}
                      className="textarea-field"
                      rows="3"
                      placeholder="Comentarios adicionales sobre la disponibilidad"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="select-field"
                  >
                    <option value="activo">Activo</option>
                    <option value="cerrado">Cerrado</option>
                    <option value="baja_por_faltas">Baja por faltas</option>
                    <option value="canalizacion_por_cesun">Canalización por Cesun</option>
                    <option value="canalizado_por_prepa_cesun">Canalizado por Prepa Cesun</option>
                    <option value="canalizado_a_psiquiatria">Canalizado a Psiquiatría</option>
                    <option value="canalizado_a_paidopsiquiatra">Canalizado a Paidopsiquiatra</option>
                    <option value="canalizado_a_institucion_drogodependientes">Canalizado a institución de atención a drogodependientes</option>
                    <option value="pendiente_por_asignar_terapeuta">Pendiente por asignar terapeuta</option>
                    <option value="sin_contacto_con_el_paciente">Sin contacto con el paciente</option>
                    <option value="por_confirmar">Por confirmar</option>
                    <option value="alta_terapeutica">Alta Terapéutica</option>
                    <option value="abandono">Abandono</option>
                    <option value="traslado">Traslado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="flex-row align-center gap-10">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={formData.activo}
                      onChange={handleInputChange}
                    />
                    <span>Paciente activo</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-primary">
                  {modalType === 'nuevo' ? 'Crear Paciente' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Expediente */}
      {showDetalles && selectedPaciente && (
        <div className="modal-overlay">
          <div className="modal-container modal-large" style={{ width: '95vw', maxWidth: '1400px' }}>
            <div className="modal-header">
              <div>
                <h3>Expediente Clínico</h3>
                <p className="text-small" style={{ marginTop: '5px', color: 'var(--gray)' }}>
                  {selectedPaciente.nombre} {selectedPaciente.apellido} • {calcularEdad(selectedPaciente.fecha_inscripcion)} años
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDetalles(false)}>×</button>
            </div>

            <div className="modal-content">
              {/* Estadísticas rápidas (expandido) */}
              <div className="grid-4 gap-20 mb-25" style={{}}>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Sesiones Totales</div>
                  <div className="stat-value" style={{ fontSize: '36px', lineHeight: '1' }}>{selectedPaciente.sesiones_completadas || 0}</div>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Estado</div>
                  <span className={`badge badge-${getEstadoLabel(selectedPaciente.estado).color}`} style={{ fontSize: '16px', padding: '6px 10px' }}>
                    {getEstadoLabel(selectedPaciente.estado).text}
                  </span>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Terapeuta</div>
                  <div className="font-bold" style={{ fontSize: '16px' }}>
                    {selectedPaciente.terapeuta_asignado || 'No asignado'}
                  </div>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Coterapeuta</div>
                  <div className="font-bold" style={{ fontSize: '16px' }}>
                    {selectedPaciente.coterapeuta_asignado || 'No asignado'}
                  </div>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Total de semanas de acompañamiento</div>
                  <div className="stat-value" style={{ fontSize: '36px', lineHeight: '1' }}>
                    {estadisticasExpediente?.total_sesiones || sesionesPaciente.length || 0}
                  </div>
                </div>
              </div>

              {/* Información detallada */}
              <div className="grid-2 gap-20 mb-20">
                <div className="card" style={{ padding: '20px', background: 'var(--blub)' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Datos Personales</h4>
                  <div className="detail-row">
                    <strong>Nombre completo:</strong> {selectedPaciente.nombre} {selectedPaciente.apellido}
                  </div>
                  <div className="detail-row">
                    <strong>Edad:</strong> {calcularEdad(selectedPaciente.fecha_inscripcion)} años
                  </div>
                  <div className="detail-row">
                    <strong>Género:</strong> {selectedPaciente.genero || 'N/A'}
                  </div>
                  <div className="detail-row">
                    <strong>Email:</strong> {selectedPaciente.email || 'No registrado'}
                  </div>
                  <div className="detail-row">
                    <strong>Teléfono:</strong> {selectedPaciente.telefono || 'No registrado'}
                  </div>
                  <div className="detail-row">
                    <strong>Dirección:</strong> {selectedPaciente.direccion || 'N/A'}
                  </div>
                  {selectedPaciente.es_estudiante && (
                    <>
                      <div className="detail-row">
                        <strong>Matrícula:</strong> {selectedPaciente.matricula || 'N/A'}
                      </div>
                      <div className="detail-row">
                        <strong>Institución:</strong> {selectedPaciente.institucion_educativa || 'N/A'}
                      </div>
                      <div className="detail-row">
                        <strong>Carrera:</strong> {selectedPaciente.carrera || 'N/A'}
                      </div>
                    </>
                  )}
                </div>

                <div className="card" style={{ padding: '20px', background: 'var(--blub)' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Información Clínica</h4>
                  <div className="detail-row">
                    <strong>Motivo de consulta:</strong>
                    <div style={{ marginTop: '5px', padding: '8px', background: 'var(--blud)', borderRadius: '6px' }}>
                      {selectedPaciente.motivo_consulta || 'No especificado'}
                    </div>
                  </div>
                  <div className="detail-row">
                    <strong>Motivo de Consulta Especial:</strong>
                    <div style={{ marginTop: '5px', padding: '8px', background: 'var(--blud)', borderRadius: '6px' }}>
                      {selectedPaciente.motivo_consulta_especial || 'No aplica'}
                    </div>
                  </div>
                  <div className="detail-row">
                    <strong>Contacto de emergencia:</strong>
                    <div style={{ marginTop: '5px' }}>
                      {selectedPaciente.contacto_emergencia_nombre || 'N/A'}
                      {selectedPaciente.contacto_emergencia_telefono && (
                        <div className="text-small" style={{ color: 'var(--gray)' }}>
                          Tel: {selectedPaciente.contacto_emergencia_telefono}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="detail-row" style={{ marginTop: '15px' }}>
                    <strong>Disponibilidad:</strong>
                    {(selectedPaciente.disponibilidad?.dias || []).length === 0 ? (
                      <div style={{ marginTop: '5px', color: 'var(--gray)' }}>No hay disponibilidad definida</div>
                    ) : (
                      <div style={{ marginTop: '10px' }}>
                        {selectedPaciente.disponibilidad.dias.map(dia => (
                          <div key={dia.dia} style={{ marginBottom: '10px' }}>
                            <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{dia.dia}</div>
                            {dia.horarios.map((horario, idx) => (
                              <div key={`${dia.dia}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', marginTop: '6px' }}>
                                <span>{horario.inicio || '---'} - {horario.fin || '---'}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedPaciente.disponibilidad?.comentarios && (
                    <div className="detail-row" style={{ marginTop: '10px' }}>
                      <strong>Comentarios de disponibilidad:</strong>
                      <div style={{ marginTop: '5px', padding: '8px', background: 'var(--blud)', borderRadius: '6px' }}>
                        {selectedPaciente.disponibilidad.comentarios}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Historial de sesiones */}
              <div className="card" style={{ padding: '20px', background: 'var(--blub)' }}>
                <div className="flex-row justify-between align-center mb-15">
                  <h4 style={{ color: 'var(--blu)' }}>Historial de Sesiones ({sesionesPaciente.length})</h4>
                </div>
                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Horario</th>
                        <th>Desarrollo</th>
                        <th>Terapeuta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sesionesPaciente.length > 0 ? (
                        sesionesPaciente.map(s => (
                          <tr key={s.id}>
                            <td>{s.fecha ? new Date(s.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                            <td>
                              <span className="badge badge-info">
                                {s.tipo_sesion || s.tipo_consulta || (s.Cita && s.Cita.tipo_consulta) || 'terapia'}
                              </span>
                            </td>
                            <td style={{ fontSize: '13px' }}>{s.hora_inicio && s.hora_fin ? `${s.hora_inicio.slice(0, 5)} - ${s.hora_fin.slice(0, 5)}` : (s.hora_inicio ? s.hora_inicio.slice(0, 5) : 'N/A')}</td>
                            <td style={{ maxWidth: '300px' }}>
                              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {s.desarrollo || s.conclusion || 'Sin notas'}
                              </div>
                            </td>
                            <td>{(s.terapeuta_nombre || (s.Terapeuta && `${s.Terapeuta.nombre} ${s.Terapeuta.apellido}`) || s.psicologo_nombre || (s.Psicologo && `${s.Psicologo.nombre} ${s.Psicologo.apellido}`) || 'N/A')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--gray)' }}>
                            <div>📋</div>
                            <div style={{ marginTop: '10px' }}>No hay sesiones registradas para este paciente</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={() => {
                setShowDetalles(false);
                editarPaciente(selectedPaciente);
              }}>
                Editar Paciente
              </button>
              <button className="btn-secondary" onClick={() => setShowDetalles(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinadorPacientes;