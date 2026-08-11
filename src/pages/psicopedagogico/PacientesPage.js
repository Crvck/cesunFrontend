import React, { useState, useEffect } from 'react';
import { FiSearch, FiUser, FiCalendar, FiPhone, FiMail, FiFileText, FiFilter } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { createPsychopedagogicoTour } from '../../utils/psychopedagogicoTour';

const PsicologoPacientes = () => {
  const location = useLocation();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showDetalles, setShowDetalles] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');

  // Estados para agendar cita
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [tipoCitaAgendar, setTipoCitaAgendar] = useState('psicologo'); // 'psicologo' o 'becario'
  const [becarios, setBecarios] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    hora: '10:00',
    tipo_consulta: 'presencial',
    duracion: 50,
    becario_id: null,
    notas: ''
  });

  // Estados para expediente y sesiones reales
  const [expediente, setExpediente] = useState(null);
  const [sesionesPaciente, setSesionesPaciente] = useState([]);
  const [perfilPsicopedagogico, setPerfilPsicopedagogico] = useState(null);
  const [evolucionesCaso, setEvolucionesCaso] = useState([]);
  const [diagnosticoInput, setDiagnosticoInput] = useState('');
  const [evolucionForm, setEvolucionForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: ''
  });
  const [guardandoDiagnostico, setGuardandoDiagnostico] = useState(false);
  const [guardandoEvolucion, setGuardandoEvolucion] = useState(false);
  const [showRegistrarSesionModal, setShowRegistrarSesionModal] = useState(false);
  const [registroDesdeCitaAplicado, setRegistroDesdeCitaAplicado] = useState(false);
  const [registroSesionForm, setRegistroSesionForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    hora_inicio: '10:00',
    hora_fin: '10:50',
    desarrollo: '',
    conclusion: '',
    tareas_asignadas: '',
    siguiente_cita: '',
    privado: false
  });
  const tour = createPsychopedagogicoTour('pacientes');

  const fetchExpediente = async (pacienteId) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
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
        if (res.status !== 403) {
          notifications.error((json && (json.message || json.error)) || 'Error al obtener expediente');
        }
        setExpediente(null);
        setSesionesPaciente([]);
        return;
      }

      const data = json?.data || {};
      setExpediente(data.expediente || {});
      setSesionesPaciente(data.sesiones || []);
    } catch (err) {
      console.error('Error al obtener expediente completo:', err);
      notifications.error('Error al obtener expediente');
      setExpediente(null);
      setSesionesPaciente([]);
    }
  };

  const fetchPerfilPsicopedagogico = async (pacienteId) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
      const res = await fetch(`${apiUrl}/api/psicopedagogico/paciente/${pacienteId}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });

      const json = await res.json();
      if (!res.ok) {
        notifications.error(json?.message || 'Error al obtener perfil psicopedagógico');
        setPerfilPsicopedagogico(null);
        setEvolucionesCaso([]);
        setDiagnosticoInput('');
        return;
      }

      const perfil = json?.data?.perfil || null;
      const evoluciones = json?.data?.evoluciones || [];
      setPerfilPsicopedagogico(perfil);
      setEvolucionesCaso(evoluciones);
      setDiagnosticoInput(perfil?.diagnostico || '');
      setEvolucionForm(prev => ({ ...prev, descripcion: '' }));
    } catch (error) {
      console.error('Error al obtener perfil psicopedagógico:', error);
      notifications.error('Error al obtener perfil psicopedagógico');
      setPerfilPsicopedagogico(null);
      setEvolucionesCaso([]);
      setDiagnosticoInput('');
    }
  };

  useEffect(() => {
    fetchPacientes();
    fetchBecarios();

    // Escuchar creación de citas para refrescar si es necesario
    const onCitaCreada = (e) => {
      try {
        console.log('Evento citaCreada recibido (psicologo):', e.detail);
        fetchPacientes();
      } catch (e) { console.warn(e); }
    };

    const onCitaActualizada = (e) => {
      try {
        console.log('Evento citaActualizada recibido (psicologo):', e.detail);
        fetchPacientes();
      } catch (e) { console.warn(e); }
    };

    window.addEventListener('citaCreada', onCitaCreada);
    window.addEventListener('citaActualizada', onCitaActualizada);
    return () => {
      window.removeEventListener('citaCreada', onCitaCreada);
      window.removeEventListener('citaActualizada', onCitaActualizada);
    };
  }, []);

  useEffect(() => {
    if (registroDesdeCitaAplicado) return;

    const params = new URLSearchParams(location.search);
    const openRegistro = params.get('openRegistro');
    const pacienteId = Number(params.get('paciente_id') || 0);
    const pacienteNombre = (params.get('paciente_nombre') || '').trim();

    if (openRegistro !== '1' || !pacienteId) return;

    const paciente = pacientes.find((p) => Number(p.id) === pacienteId);
    const pacienteTarget = paciente || {
      id: pacienteId,
      nombre: pacienteNombre,
      apellido: '',
      nombre_completo: pacienteNombre || `Paciente #${pacienteId}`,
      edad: '',
      telefono: '',
      email: '',
      motivo_consulta: '',
      diagnostico: '',
      becario_id: null,
      ultima_sesion: null,
      proxima_cita: null,
      sesiones_completadas: 0,
      estado: 'activo',
      becario: null,
      activo: true
    };

    const fecha = params.get('fecha') || new Date().toISOString().slice(0, 10);
    const hora = (params.get('hora') || '10:00').slice(0, 5);
    const motivo = (params.get('motivo') || '').trim();
    const openRegistroFromCita = openRegistro === '1';

    const sumarMinutos = (horaBase, minutos) => {
      const [h, m] = (horaBase || '10:00').split(':').map(Number);
      const d = new Date();
      d.setHours(Number.isNaN(h) ? 10 : h, Number.isNaN(m) ? 0 : m, 0, 0);
      d.setMinutes(d.getMinutes() + minutos);
      return d.toTimeString().slice(0, 5);
    };

    setSelectedPaciente(pacienteTarget);
    setShowDetalles(true);
    if (!openRegistroFromCita) {
      fetchExpediente(pacienteId);
      fetchPerfilPsicopedagogico(pacienteId);
    }
    setRegistroSesionForm((prev) => ({
      ...prev,
      fecha,
      hora_inicio: hora,
      hora_fin: sumarMinutos(hora, 50),
      desarrollo: motivo ? `Seguimiento de cita completada.\nMotivo/nota: ${motivo}` : prev.desarrollo
    }));
    setShowRegistrarSesionModal(true);
    setRegistroDesdeCitaAplicado(true);

    const cleanUrl = `${window.location.pathname}`;
    window.history.replaceState({}, '', cleanUrl);
  }, [location.search, pacientes, registroDesdeCitaAplicado]);

  const fetchBecarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
      const res = await fetch(`${apiUrl}/api/users/becarios`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json();
      const normalized = (data || []).map(b => ({ ...b, nombre_completo: b.nombre + (b.apellido ? ` ${b.apellido}` : '') }));
      setBecarios(normalized);
    } catch (err) {
      console.warn('No se pudieron obtener becarios:', err);
    }
  };

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
      const res = await fetch(`${apiUrl}/api/pacientes/activos`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        console.error('Error fetching pacientes activos:', res.status);
        return;
      }

      const json = await res.json();
      // El endpoint puede devolver { success: true, data: [...] } o directamente un array
      const data = Array.isArray(json) ? json : (json.data || []);

      const mapped = data.map(p => ({
        id: p.id,
        nombre: p.nombre || '',
        apellido: p.apellido || '',
        nombre_completo: p.nombre_completo || `${p.nombre || ''} ${p.apellido || ''}`.trim(),
        edad: p.edad,
        telefono: p.telefono,
        email: p.email,
        motivo_consulta: p.motivo_consulta || p.motivo || '',
        diagnostico: p.diagnostico_presuntivo || p.diagnostico || '',
        becario_id: p.becario_id || p.becarioId || null,
        ultima_sesion: p.ultima_sesion || null,
        proxima_cita: p.proxima_cita || null,
        sesiones_completadas: p.sesiones_completadas || 0,
        estado: p.estado,
        becario: p.becario_nombre || p.becario || null,
        activo: p.activo !== undefined ? p.activo : true
      }));

      setPacientes(mapped);
    } catch (error) {
      console.error('Error al obtener pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPacientes = pacientes.filter(paciente => {
    const matchesSearch =
      paciente.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paciente.diagnostico.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado = !filterEstado || paciente.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const showPacienteDetalles = (paciente) => {
    setSelectedPaciente(paciente);
    setShowDetalles(true);
    // Cargar expediente y sesiones reales
    fetchExpediente(paciente.id);
    fetchPerfilPsicopedagogico(paciente.id);
  };

  const handleGuardarDiagnostico = async () => {
    if (!selectedPaciente?.id) return;
    setGuardandoDiagnostico(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/psicopedagogico/paciente/${selectedPaciente.id}/diagnostico`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ diagnostico: diagnosticoInput })
      });

      const json = await res.json();
      if (!res.ok) {
        notifications.error(json?.message || 'Error al guardar diagnóstico');
        return;
      }

      notifications.success('Diagnóstico actualizado');
      setPerfilPsicopedagogico(json?.data || perfilPsicopedagogico);
    } catch (error) {
      console.error('Error al guardar diagnóstico:', error);
      notifications.error('Error al guardar diagnóstico');
    } finally {
      setGuardandoDiagnostico(false);
    }
  };

  const handleAgregarEvolucion = async () => {
    if (!selectedPaciente?.id) return;
    if (!evolucionForm.descripcion?.trim()) {
      notifications.error('Escribe la descripción de la evolución');
      return;
    }

    setGuardandoEvolucion(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/psicopedagogico/paciente/${selectedPaciente.id}/evoluciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify({
          fecha: evolucionForm.fecha,
          descripcion: evolucionForm.descripcion.trim()
        })
      });

      const json = await res.json();
      if (!res.ok) {
        notifications.error(json?.message || 'Error al registrar evolución');
        return;
      }

      notifications.success('Evolución registrada');
      setEvolucionForm({ fecha: new Date().toISOString().slice(0, 10), descripcion: '' });
      fetchPerfilPsicopedagogico(selectedPaciente.id);
    } catch (error) {
      console.error('Error al registrar evolución:', error);
      notifications.error('Error al registrar evolución');
    } finally {
      setGuardandoEvolucion(false);
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'activo':
        return { text: 'Activo', color: 'success' };
      case 'alta_terapeutica':
        return { text: 'Alta Terapéutica', color: 'primary' };
      case 'abandono':
        return { text: 'Abandono', color: 'danger' };
      default:
        return { text: estado, color: 'warning' };
    }
  };

  const exportarListadoPacientes = async () => {
    try {
      const titulo = filterEstado ? `Listado de ${getEstadoLabel(filterEstado).text}` : 'Listado de todos los pacientes';
      const fecha = new Date().toLocaleString();
      const rows = [];

      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nombre', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Email', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Teléfono', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Edad', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Diagnóstico', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Sesiones', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Última Sesión', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Becario', bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Estado', bold: true })] })] }),
        ],
      }));

      filteredPacientes.forEach(p => {
        rows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(p.nombre || '')] }),
            new TableCell({ children: [new Paragraph(p.email || '')] }),
            new TableCell({ children: [new Paragraph(p.telefono || '')] }),
            new TableCell({ children: [new Paragraph(p.edad ? String(p.edad) : '')] }),
            new TableCell({ children: [new Paragraph(p.diagnostico || p.motivo_consulta || '')] }),
            new TableCell({ children: [new Paragraph(String(p.sesiones_completadas || 0))] }),
            new TableCell({ children: [new Paragraph(p.ultima_sesion ? new Date(p.ultima_sesion).toLocaleDateString() : '')] }),
            new TableCell({ children: [new Paragraph(p.becario || '')] }),
            new TableCell({ children: [new Paragraph(getEstadoLabel(p.estado).text)] }),
          ],
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
      console.error('Error exportando listado de pacientes:', err);
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
    <div className="pacientes-page">
      <div className="page-header">
        <div>
          <h1>Mis Pacientes</h1>
          <p>Gestión de pacientes en tratamiento</p>
        </div>
        <button className="btn-secondary" onClick={() => tour.drive()}>
          Tour
        </button>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="filters-container mb-20">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar paciente por nombre, email o diagnóstico..."
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
            <option value="activo">Activos</option>
            <option value="alta_terapeutica">Altas Terapéuticas</option>
            <option value="abandono">Abandonos</option>
          </select>
        </div>
      </div>

      {/* Tabla de Pacientes */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Contacto</th>
              <th>Diagnóstico</th>
              <th>Sesiones</th>
              <th>Última Sesión</th>
              <th>Becario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPacientes.map((paciente) => {
              const estadoInfo = getEstadoLabel(paciente.estado);

              return (
                <tr key={paciente.id}>
                  <td>
                    <div className="flex-row align-center gap-10">
                      <div className="avatar">
                        {paciente.nombre_completo.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold">{paciente.nombre_completo}</div>
                        <div className="text-small">{paciente.edad} años</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>{paciente.email}</div>
                    <div className="text-small">{paciente.telefono}</div>
                  </td>
                  <td>
                    <div className="diagnostico-tag">
                      <div className="font-bold">{paciente.diagnostico || paciente.motivo_consulta || 'Sin diagnóstico'}</div>
                      {paciente.motivo_consulta && paciente.diagnostico && (
                        <div className="text-small">Motivo: {paciente.motivo_consulta}</div>
                      )}
                      {!paciente.diagnostico && paciente.motivo_consulta && (
                        <div className="text-small">{paciente.motivo_consulta}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="font-bold">{paciente.sesiones_completadas}</div>
                    <div className="text-small">sesiones</div>
                  </td>
                  <td>
                    {paciente.ultima_sesion ? new Date(paciente.ultima_sesion).toLocaleDateString() : 'N/A'}
                  </td>
                  <td>
                    {paciente.becario || 'Sin asignar'}
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
                        onClick={() => showPacienteDetalles(paciente)}
                        title="Ver detalles"
                      >
                        <FiFileText />
                      </button>
                      <button
                        className="btn-text btn-success"
                        title="Agendar cita con psicólogo"
                        onClick={() => {
                          setSelectedPaciente(paciente);
                          setTipoCitaAgendar('psicologo');
                          setScheduleForm(prev => ({
                            ...prev,
                            fecha: new Date().toISOString().slice(0, 10),
                            hora: '10:00',
                            notas: '',
                            becario_id: null
                          }));
                          setShowAgendarModal(true);
                        }}
                      >
                        <FiCalendar />
                      </button>
                      {/* Opción para agendar cita solo para becario - comentar si no se necesita */}
                      <button
                        className="btn-text btn-info"
                        title="Agendar cita para becario"
                        onClick={() => {
                          setSelectedPaciente(paciente);
                          setTipoCitaAgendar('becario');
                          setScheduleForm(prev => ({
                            ...prev,
                            fecha: new Date().toISOString().slice(0, 10),
                            hora: '10:00',
                            notas: '',
                            becario_id: paciente.becario_id || null
                          }));
                          setShowAgendarModal(true);
                        }}
                      >
                        <FiUser />
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
            <p>Activos: {pacientes.filter(p => p.estado === 'activo').length}</p>
            <p>Con becario: {pacientes.filter(p => p.becario).length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Sesiones Totales</h4>
          <div className="mt-10">
            <p className="stat-value">{pacientes.reduce((sum, p) => sum + p.sesiones_completadas, 0)}</p>
            <p className="text-small">sesiones realizadas</p>
          </div>
        </div>

        <div className="card">
          <h4>Acciones</h4>
          <div className="mt-10 flex-col gap-10">
            {/* <button className="btn-primary w-100">
              Agendar Cita Grupal
            </button> */}
            <button className="btn-secondary w-100">
              Generar Reporte
            </button>
            <button className="btn-primary w-100" onClick={exportarListadoPacientes}>
              Exportar Listado
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalles */}
      {showDetalles && selectedPaciente && (
        <div className="modal-overlay">
          <div className="modal-container modal-large" style={{ width: '95vw', maxWidth: '1400px' }}>
            <div className="modal-header">
              <div>
                <h3>Expediente Clínico</h3>
                <p className="text-small" style={{ marginTop: '5px', color: 'var(--gray)' }}>
                  {selectedPaciente.nombre_completo} • {selectedPaciente.edad} años
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDetalles(false)}>×</button>
            </div>

            <div className="modal-content" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Estadísticas rápidas (expandido) */}
              <div className="grid-3 gap-20 mb-25">
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Sesiones Totales</div>
                  <div className="stat-value" style={{ fontSize: '36px', lineHeight: '1' }}>{selectedPaciente.sesiones_completadas || 0}</div>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Última Sesión</div>
                  <div className="font-bold" style={{ fontSize: '16px' }}>
                    {selectedPaciente.ultima_sesion ? new Date(selectedPaciente.ultima_sesion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin registro'}
                  </div>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Estado</div>
                  <span className={`badge badge-${getEstadoLabel(selectedPaciente.estado).color}`} style={{ fontSize: '16px', padding: '6px 10px' }}>
                    {getEstadoLabel(selectedPaciente.estado).text}
                  </span>
                </div>
              </div>

              {/* Información detallada */}
              <div className="grid-2 gap-20 mb-20">
                <div className="card" style={{ padding: '20px', background: 'var(--blub)' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Datos Personales</h4>
                  <div className="detail-row">
                    <strong>Nombre completo:</strong> {selectedPaciente.nombre_completo}
                  </div>
                  <div className="detail-row">
                    <strong>Edad:</strong> {selectedPaciente.edad} años
                  </div>
                  <div className="detail-row">
                    <strong>Email:</strong> {selectedPaciente.email || 'No registrado'}
                  </div>
                  <div className="detail-row">
                    <strong>Teléfono:</strong> {selectedPaciente.telefono || 'No registrado'}
                  </div>
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
                    <strong>Diagnóstico:</strong> {selectedPaciente.diagnostico || 'Sin diagnóstico'}
                  </div>
                  <div className="detail-row">
                    <strong>Becario asignado:</strong> {selectedPaciente.becario || 'No asignado'}
                  </div>
                </div>
              </div>

              {/* Perfil Psicopedagógico */}
              <div className="card mb-20" style={{ padding: '20px', background: 'var(--blub)' }}>
                <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Perfil Psicopedagógico</h4>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>Diagnóstico (editable)</label>
                  <textarea
                    rows="4"
                    className="textarea-field"
                    value={diagnosticoInput}
                    onChange={(e) => setDiagnosticoInput(e.target.value)}
                    placeholder="Escribe el diagnóstico psicopedagógico..."
                  />
                </div>

                <div className="flex-row justify-between align-center" style={{ marginBottom: '15px' }}>
                  <span className="text-small" style={{ color: 'var(--gray)' }}>
                    Última actualización: {perfilPsicopedagogico?.updated_at ? new Date(perfilPsicopedagogico.updated_at).toLocaleDateString() : 'Sin registro'}
                  </span>
                  <button className="btn-primary" onClick={handleGuardarDiagnostico} disabled={guardandoDiagnostico}>
                    {guardandoDiagnostico ? 'Guardando...' : 'Guardar diagnóstico'}
                  </button>
                </div>

                <div className="card" style={{ padding: '15px', background: 'var(--blud)' }}>
                  <h5 style={{ marginBottom: '10px' }}>Registro de evolución del caso</h5>
                  <div className="form-grid" style={{ gap: '10px', alignItems: 'center' }}>
                    <div className="form-group">
                      <label>Fecha</label>
                      <input
                        type="date"
                        className="input-field"
                        value={evolucionForm.fecha}
                        onChange={(e) => setEvolucionForm(prev => ({ ...prev, fecha: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Descripción</label>
                      <input
                        type="text"
                        className="input-field"
                        value={evolucionForm.descripcion}
                        onChange={(e) => setEvolucionForm(prev => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Describe la evolución..."
                      />
                    </div>
                    <div className="form-group" style={{ alignSelf: 'end' }}>
                      <button className="btn-secondary" onClick={handleAgregarEvolucion} disabled={guardandoEvolucion}>
                        {guardandoEvolucion ? 'Agregando...' : 'Agregar'}
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto', marginTop: '15px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Descripción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evolucionesCaso.length > 0 ? (
                          evolucionesCaso.map(ev => (
                            <tr key={ev.id}>
                              <td>{ev.fecha ? new Date(ev.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                              <td>{ev.descripcion}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: 'var(--gray)' }}>
                              No hay evoluciones registradas
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
                        <th>Psicólogo</th>
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
                            <td>{(s.psicologo_nombre || (s.Psicologo && `${s.Psicologo.nombre} ${s.Psicologo.apellido}`) || 'N/A')}</td>
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
              <button
                className="btn-primary"
                onClick={() => setShowRegistrarSesionModal(true)}
              >
                <FiFileText /> Registrar Sesión
              </button>
              <button className="btn-primary" onClick={() => {
                setShowDetalles(false);
                setSelectedPaciente(selectedPaciente);
                setTipoCitaAgendar('psicologo');
                setScheduleForm(prev => ({
                  ...prev,
                  fecha: new Date().toISOString().slice(0, 10),
                  hora: '10:00',
                  notas: '',
                  becario_id: null
                }));
                setShowAgendarModal(true);
              }}>
                <FiCalendar /> Agendar Cita (Psicólogo)
              </button>
              {/* Opción para agendar cita solo para becario - comentar si no se necesita */}
              <button className="btn-info" onClick={() => {
                setShowDetalles(false);
                setSelectedPaciente(selectedPaciente);
                setTipoCitaAgendar('becario');
                setScheduleForm(prev => ({
                  ...prev,
                  fecha: new Date().toISOString().slice(0, 10),
                  hora: '10:00',
                  notas: '',
                  becario_id: selectedPaciente.becario_id || null
                }));
                setShowAgendarModal(true);
              }}>
                <FiUser /> Agendar Cita (Becario)
              </button>
              <button className="btn-secondary" onClick={() => setShowDetalles(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendar Cita */}
      {showAgendarModal && selectedPaciente && (
        <div className="modal-overlay">
          <div className="modal-container modal-medium">
            <div className="modal-header">
              <h3>
                {tipoCitaAgendar === 'psicologo'
                  ? `Agendar cita (Psicólogo) para ${selectedPaciente.nombre_completo}`
                  : `Agendar cita (Becario) para ${selectedPaciente.nombre_completo}`
                }
              </h3>
              <button className="modal-close" onClick={() => setShowAgendarModal(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" className="input-field" value={scheduleForm.fecha} onChange={(e) => setScheduleForm({ ...scheduleForm, fecha: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Hora</label>
                  <input type="time" className="input-field" value={scheduleForm.hora} onChange={(e) => setScheduleForm({ ...scheduleForm, hora: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Tipo</label>
                  <select className="select-field" value={scheduleForm.tipo_consulta} onChange={(e) => setScheduleForm({ ...scheduleForm, tipo_consulta: e.target.value })}>
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Duración (min)</label>
                  <input type="number" className="input-field" value={scheduleForm.duracion} onChange={(e) => setScheduleForm({ ...scheduleForm, duracion: Number(e.target.value) })} />
                </div>

                {/* Mostrar selector de becario solo si es cita de psicólogo (opcional) o si es cita de becario (obligatorio) */}
                {tipoCitaAgendar === 'becario' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Becario *</label>
                    <select
                      className="select-field"
                      value={scheduleForm.becario_id || ''}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, becario_id: e.target.value ? Number(e.target.value) : null })}
                      required
                    >
                      <option value="">Seleccionar becario</option>
                      {becarios.map(b => (
                        <option key={b.id} value={b.id}>{b.nombre_completo}</option>
                      ))}
                    </select>
                  </div>
                )}

                {tipoCitaAgendar === 'psicologo' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Becario observador (opcional)</label>
                    <select
                      className="select-field"
                      value={scheduleForm.becario_id || ''}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, becario_id: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">Sin becario</option>
                      {becarios.map(b => (
                        <option key={b.id} value={b.id}>{b.nombre_completo}</option>
                      ))}
                    </select>
                    <small className="text-small" style={{ marginTop: '5px', display: 'block', color: 'var(--gray)' }}>
                      El becario podrá observar la sesión pero el psicólogo será el responsable
                    </small>
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Notas</label>
                  <textarea rows="3" className="textarea-field" value={scheduleForm.notas} onChange={(e) => setScheduleForm({ ...scheduleForm, notas: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={async () => {
                try {
                  // Validación: si es cita de becario, debe seleccionar un becario
                  if (tipoCitaAgendar === 'becario' && !scheduleForm.becario_id) {
                    notifications.error('Debe seleccionar un becario para este tipo de cita');
                    return;
                  }

                  notifications.info('Creando cita...');
                  const token = localStorage.getItem('token');
                  const body = {
                    paciente: { nombre: selectedPaciente.nombre, apellido: selectedPaciente.apellido, email: selectedPaciente.email || null, telefono: selectedPaciente.telefono || null },
                    fecha: scheduleForm.fecha,
                    hora: scheduleForm.hora,
                    tipo_consulta: scheduleForm.tipo_consulta,
                    duracion: scheduleForm.duracion,
                    notas: scheduleForm.notas,
                    becario_id: scheduleForm.becario_id || null,
                    // Indicar si la cita es para el becario o para el psicólogo
                    tipo_asignacion: tipoCitaAgendar // 'psicologo' o 'becario'
                  };

                  // Debug: registrar body que vamos a enviar
                  console.log('🚀 Enviando request POST /api/citas/nueva con body:', body);

                  const apiUrl = process.env.REACT_APP_API_URL;
                  const res = await fetch(`${apiUrl}/api/citas/nueva`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                    body: JSON.stringify(body)
                  });

                  let json;
                  try {
                    json = await res.json();
                  } catch (err) {
                    console.error('Error parseando JSON de respuesta al crear cita:', err);
                    notifications.error('Error procesando respuesta del servidor');
                    return;
                  }

                  // Debug: ver respuesta del servidor
                  console.log('📥 Respuesta POST /api/citas/nueva:', res.status, json);

                  if (!res.ok) {
                    notifications.error(json.message || 'Error creando cita');
                    return;
                  }

                  notifications.success(`Cita para ${tipoCitaAgendar === 'psicologo' ? 'psicólogo' : 'becario'} creada exitosamente`);
                  setShowAgendarModal(false);

                  // Emitir evento para que calendario y otras vistas sincronicen
                  try { window.dispatchEvent(new CustomEvent('citaCreada', { detail: { cita: json.data } })); } catch (e) { console.warn(e); }

                } catch (err) {
                  console.error('Error creando cita:', err);
                  notifications.error('Error creando cita');
                }
              }}>
                Guardar cita
              </button>

              <button className="btn-danger" onClick={() => setShowAgendarModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Sesión - afuera del modal detalles */}
      {showRegistrarSesionModal && selectedPaciente && (
        <div className="modal-overlay">
          <div className="modal-container modal-medium">
            <div className="modal-header">
              <h3>Registrar sesión para {selectedPaciente.nombre_completo}</h3>
              <button className="modal-close" onClick={() => setShowRegistrarSesionModal(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" className="input-field" value={registroSesionForm.fecha} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, fecha: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Hora inicio</label>
                  <input type="time" className="input-field" value={registroSesionForm.hora_inicio} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, hora_inicio: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Hora fin</label>
                  <input type="time" className="input-field" value={registroSesionForm.hora_fin} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, hora_fin: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Desarrollo</label>
                  <textarea rows="4" className="textarea-field" value={registroSesionForm.desarrollo} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, desarrollo: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Conclusión</label>
                  <textarea rows="3" className="textarea-field" value={registroSesionForm.conclusion} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, conclusion: e.target.value })} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Tareas asignadas</label>
                  <textarea rows="3" className="textarea-field" value={registroSesionForm.tareas_asignadas} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, tareas_asignadas: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Próxima sesión</label>
                  <input type="date" className="input-field" value={registroSesionForm.siguiente_cita || ''} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, siguiente_cita: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Privado</label>
                  <div>
                    <input type="checkbox" checked={registroSesionForm.privado} onChange={(e) => setRegistroSesionForm({ ...registroSesionForm, privado: e.target.checked })} /> Privado
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={async () => {
                try {
                  notifications.info('Registrando sesión...');
                  const token = localStorage.getItem('token');
                  const apiUrl = process.env.REACT_APP_API_URL;

                  const nombreCompleto = (selectedPaciente?.nombre_completo || `${selectedPaciente?.nombre || ''} ${selectedPaciente?.apellido || ''}`).trim();
                  const [nombrePaciente, ...restoNombre] = nombreCompleto.split(' ').filter(Boolean);
                  const apellidoPaciente = selectedPaciente?.apellido || restoNombre.join(' ') || '';
                  const nombrePacienteFinal = selectedPaciente?.nombre || nombrePaciente || '';

                  if (!nombrePacienteFinal || !apellidoPaciente) {
                    notifications.error('No se pudo identificar el nombre del paciente para registrar la cita');
                    return;
                  }

                  // 1) Crear una cita temporal (si no existe) y marcarla completada
                  const citaBody = {
                    paciente: {
                      nombre: nombrePacienteFinal,
                      apellido: apellidoPaciente,
                      email: selectedPaciente.email || null,
                      telefono: selectedPaciente.telefono || null
                    },
                    fecha: registroSesionForm.fecha,
                    hora: registroSesionForm.hora_inicio,
                    tipo_consulta: 'presencial',
                    duracion: 50,
                    notas: 'Sesión registrada desde expediente'
                  };

                  const resCita = await fetch(`${apiUrl}/api/citas/nueva`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                    body: JSON.stringify(citaBody)
                  });

                  let jsonCita = null;
                  try { jsonCita = await resCita.json(); } catch (e) { console.warn('No JSON in create-cita response', e); }
                  if (!resCita.ok) {
                    console.error('Error creando cita temporal:', resCita.status, jsonCita);
                    notifications.error((jsonCita && (jsonCita.message || jsonCita.error)) || 'Error creando cita temporal');
                    return;
                  }

                  if (!jsonCita || !jsonCita.success) {
                    console.error('Create-cita response missing success flag:', jsonCita);
                    notifications.error(jsonCita && (jsonCita.message || 'Error creando cita temporal') || 'Error creando cita temporal');
                    return;
                  }

                  const citaCreada = jsonCita.data;

                  // Marcar cita como completada
                  const resPut = await fetch(`${apiUrl}/api/citas/cita/${citaCreada.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                    body: JSON.stringify({ estado: 'completada' })
                  });

                  let jsonPut = null;
                  try { jsonPut = await resPut.json(); } catch (e) { console.warn('No JSON in put-cita response', e); }
                  console.log('PUT /api/citas/cita/:id ->', resPut.status, jsonPut);
                  if (!resPut.ok) {
                    console.error('Error marcando cita como completada:', resPut.status, jsonPut);
                    notifications.error((jsonPut && (jsonPut.message || jsonPut.error)) || 'Error marcando cita como completada');
                    return;
                  }

                  if (!jsonPut || !jsonPut.success) {
                    console.error('Put-cita response missing success flag:', jsonPut);
                    notifications.error(jsonPut && (jsonPut.message || 'Error marcando cita como completada') || 'Error marcando cita como completada');
                    return;
                  }

                  // 2) Registrar sesión usando la cita creada
                  const sesionBody = {
                    cita_id: citaCreada.id,
                    desarrollo: registroSesionForm.desarrollo,
                    conclusion: registroSesionForm.conclusion,
                    tareas_asignadas: registroSesionForm.tareas_asignadas,
                    emocion_predominante: registroSesionForm.emocion_predominante || '',
                    // Enviar valores compatibles con el enum del backend
                    riesgo_suicida: 'ninguno',
                    // Enviar null si no hay escalas
                    escalas_aplicadas: registroSesionForm.escalas_aplicadas && registroSesionForm.escalas_aplicadas.length ? registroSesionForm.escalas_aplicadas : null,
                    siguiente_cita: registroSesionForm.siguiente_cita || null,
                    privado: registroSesionForm.privado || false
                  };

                  console.log('🚀 Enviando POST /api/sesiones con body:', sesionBody);

                  const resSesion = await fetch(`${apiUrl}/api/sesiones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
                    body: JSON.stringify(sesionBody)
                  });

                  let jsonSesion = null;
                  try { jsonSesion = await resSesion.json(); } catch (e) { console.warn('No JSON in sesiones response', e); }
                  console.log('POST /api/sesiones ->', resSesion.status, jsonSesion);

                  if (!resSesion.ok) {
                    console.error('Error registrando sesión:', resSesion.status, jsonSesion);
                    notifications.error((jsonSesion && (jsonSesion.message || jsonSesion.error)) || 'Error registrando sesión');
                    return;
                  }

                  if (!jsonSesion || !jsonSesion.success) {
                    console.error('Sesion response missing success flag:', jsonSesion);
                    notifications.error(jsonSesion && (jsonSesion.message || 'Error registrando sesión') || 'Error registrando sesión');
                    return;
                  }

                  notifications.success('Sesión registrada exitosamente');
                  setShowRegistrarSesionModal(false);

                  // Refrescar expediente y sesiones
                  fetchExpediente(selectedPaciente.id);

                  // Emitir evento para sincronizar con la vista de Sesiones
                  try { window.dispatchEvent(new CustomEvent('sesionRegistrada', { detail: { sesion: jsonSesion.data } })); } catch (e) { console.warn(e); }

                } catch (err) {
                  console.error('Error registrando sesión:', err);
                  notifications.error('Error registrando sesión');
                }
              }}>
                Guardar sesión
              </button>

              <button className="btn-danger" onClick={() => setShowRegistrarSesionModal(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PsicologoPacientes;