import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { FiCalendar, FiUser, FiFileText, FiPlus, FiEdit2, FiSave } from 'react-icons/fi';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { createTherapistTour } from '../../utils/therapistTour';

const PsicologoSesiones = () => {
  const location = useLocation();
  const lastPrefillRef = useRef('');
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    paciente_id: '',
    cita_id: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '10:00',
    hora_fin: '11:00',
    motivo_consulta: '',
    contenido_sesion: '',
    observaciones: '',
    tareas_asignadas: '',
    proxima_sesion: ''
  });
  const [pacientes, setPacientes] = useState([]);
  const [citasPaciente, setCitasPaciente] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [recientesLimit, setRecientesLimit] = useState(50);
  const [recientesOffset, setRecientesOffset] = useState(0);
  const [hasMoreRecientes, setHasMoreRecientes] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [showSesionModal, setShowSesionModal] = useState(false);
  const tour = createTherapistTour('sesiones');

  const toggleExpand = (id) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev]);
  };

  const openSesionModal = (sesion) => {
    setSelectedSesion(sesion);
    setShowSesionModal(true);
  };

  const closeSesionModal = () => {
    setSelectedSesion(null);
    setShowSesionModal(false);
  };

  const calcularHoraFin = (horaInicio, duracionMinutos = 50) => {
    try {
      const [horas, minutos] = horaInicio.split(':').map(Number);
      const fecha = new Date();
      fecha.setHours(horas, minutos, 0, 0);
      fecha.setMinutes(fecha.getMinutes() + duracionMinutos);
      return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      console.warn('Error calculando hora fin:', e);
      return '11:00';
    }
  };

  useEffect(() => {
    console.log('🔍 useEffect autocompletado - location.search:', location.search);
    if (!location.search) return;
    if (lastPrefillRef.current === location.search) {
      console.log('⚠️ Ya se procesó esta URL, saltando...');
      return;
    }

    const params = new URLSearchParams(location.search);
    const pacienteId = params.get('paciente_id');
    const citaId = params.get('cita_id');
    const fecha = params.get('fecha');
    const hora = params.get('hora');
    const motivo = params.get('motivo');

    console.log('📋 Parámetros extraídos:', { pacienteId, citaId, fecha, hora, motivo });

    if (!pacienteId && !citaId) {
      console.log('❌ No hay pacienteId ni citaId, saltando...');
      return;
    }

    lastPrefillRef.current = location.search;

    console.log('✅ Autocompletando formulario...');

    // Función async para cargar el paciente si no existe
    const cargarPacienteYAutocompletar = async () => {
      setShowForm(true);

      // Obtener la lista actual de pacientes
      const pacientesActuales = pacientes;

      // Si el paciente no está en la lista, cargarlo desde el API
      if (pacienteId && !pacientesActuales.find(p => String(p.id) === String(pacienteId))) {
        console.log('⚠️ Paciente no encontrado en la lista, cargando desde API...');
        try {
          const token = localStorage.getItem('token');
          const apiUrl = process.env.REACT_APP_API_URL;
          const res = await fetch(`${apiUrl}/api/pacientes/${pacienteId}`, {
            headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
          });

          if (res.ok) {
            const json = await res.json();
            const paciente = json.data || json;
            const pacienteNormalizado = {
              id: paciente.id,
              nombre: paciente.nombre || '',
              apellido: paciente.apellido || '',
              nombre_completo: paciente.nombre_completo || `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim()
            };

            // Agregar el paciente a la lista
            setPacientes(prev => [...prev, pacienteNormalizado]);
            console.log('✅ Paciente cargado y agregado a la lista:', pacienteNormalizado);
          }
        } catch (err) {
          console.error('Error cargando paciente:', err);
        }
      } else {
        console.log('✅ Paciente ya está en la lista');
      }

      // Establecer el formData
      setFormData(prev => ({
        ...prev,
        paciente_id: pacienteId || prev.paciente_id,
        cita_id: citaId || prev.cita_id,
        fecha: fecha || prev.fecha,
        hora_inicio: hora || prev.hora_inicio,
        hora_fin: hora ? calcularHoraFin(hora, 50) : prev.hora_fin,
        motivo_consulta: motivo || prev.motivo_consulta
      }));

      console.log('📝 FormData actualizado');

      // Cargar las citas del paciente
      if (pacienteId) {
        console.log('🔄 Cargando citas del paciente:', pacienteId);
        fetchCitasPaciente(pacienteId);
      }
    };

    cargarPacienteYAutocompletar();
  }, [location.search]);

  // Ensure numbering uses chronological order (newest = Sesión 1)
  const sesionesOrdenadas = useMemo(() => {
    return [...sesiones].sort((a, b) => {
      const da = a?.fecha ? new Date(a.fecha).getTime() : 0;
      const db = b?.fecha ? new Date(b.fecha).getTime() : 0;
      return db - da; // newest first
    });
  }, [sesiones]);

  const getSessionNumber = (s) => {
    const idx = sesionesOrdenadas.findIndex(x => String(x.id) === String(s.id));
    return idx >= 0 ? idx + 1 : '?';
  };

  useEffect(() => {
    fetchData();

    // Escuchar eventos de sesiones registradas desde otras vistas: refrescar lista si aplica o añadir optimísticamente
    const onSesionRegistrada = (e) => {
      try {
        const nueva = e?.detail?.sesion;
        if (!nueva) return;

        // Intentar obtener paciente_id desde distintos lugares
        const pacienteIdFromEvent = nueva.paciente_id || (nueva.Cita && nueva.Cita.paciente_id) || null;

        // Si hay paciente seleccionado y coincide con la sesión, refrescamos desde servidor
        if (formData.paciente_id && String(formData.paciente_id) === String(pacienteIdFromEvent)) {
          fetchSesiones(formData.paciente_id).catch(err => console.warn('Error refrescando sesiones tras evento:', err));
          return;
        }

        // Si no hay paciente seleccionado, o la sesión es de otro paciente, añadir de forma optimista
        // Evitar duplicados por id
        setSesiones(prev => {
          if (!nueva.id) {
            // Si no hay id, crear un placeholder
            const pacienteNombre = nueva.paciente_nombre || (nueva.Paciente && `${nueva.Paciente.nombre} ${nueva.Paciente.apellido}`) || 'Paciente';
            return [{
              id: Date.now(),
              paciente_nombre: pacienteNombre,
              fecha: nueva.fecha || new Date().toISOString().split('T')[0],
              hora_inicio: nueva.hora_inicio || nueva.hora_cita || '',
              hora_fin: nueva.hora_fin || '',
              motivo_consulta: nueva.motivo_consulta || '',
              contenido_sesion: nueva.desarrollo || nueva.conclusion || '',
              observaciones: nueva.observaciones || '',
              tareas_asignadas: nueva.tareas_asignadas || '',
              proxima_sesion: nueva.siguiente_cita || ''
            }, ...prev];
          }

          if (prev.some(s => s.id === nueva.id)) return prev; // ya existe

          const pacienteNombre = nueva.paciente_nombre || (nueva.Paciente && `${nueva.Paciente.nombre} ${nueva.Paciente.apellido}`) || (pacientes.find(p => String(p.id) === String(pacienteIdFromEvent))?.nombre_completo) || 'Paciente';

          return [{
            id: nueva.id,
            paciente_nombre: pacienteNombre,
            fecha: nueva.fecha || new Date().toISOString().split('T')[0],
            hora_inicio: nueva.hora_inicio || nueva.hora_cita || '',
            hora_fin: nueva.hora_fin || '',
            motivo_consulta: nueva.motivo_consulta || '',
            contenido_sesion: nueva.desarrollo || nueva.conclusion || '',
            observaciones: nueva.observaciones || '',
            tareas_asignadas: nueva.tareas_asignadas || '',
            proxima_sesion: nueva.siguiente_cita || ''
          }, ...prev];
        });
      } catch (err) { console.warn(err); }
    };

    window.addEventListener('sesionRegistrada', onSesionRegistrada);
    return () => window.removeEventListener('sesionRegistrada', onSesionRegistrada);
  }, []);

  // Cargar sesiones cuando se selecciona un paciente o mostrar recientes si no
  useEffect(() => {
    console.log('🔄 useEffect - paciente_id cambió a:', formData.paciente_id);
    if (formData.paciente_id) {
      console.log('✅ Hay paciente seleccionado, cargando sesiones y citas...');
      fetchSesiones(formData.paciente_id);
      fetchCitasPaciente(formData.paciente_id);
    } else {
      console.log('❌ No hay paciente seleccionado, mostrando recientes');
      fetchRecientes();
      setCitasPaciente([]);
    }
  }, [formData.paciente_id]);

  // Obtener sesiones recientes globales
  const fetchRecientes = async (limit = recientesLimit, offset = recientesOffset, append = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/sesiones/recientes?limit=${limit}&offset=${offset}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error en servidor' }));
        console.error('Error fetching sesiones recientes:', err);
        if (!append) setSesiones([]);
        return;
      }

      const json = await res.json();
      const data = Array.isArray(json) ? json : (json.data || []);
      const normalized = data.map(s => ({
        id: s.id,
        paciente_nombre: s.paciente_nombre ? `${s.paciente_nombre} ${s.paciente_apellido || ''}`.trim() : 'Paciente',
        fecha: s.fecha,
        hora_inicio: s.hora_inicio || s.hora_cita || '',
        hora_fin: s.hora_fin || '',
        motivo_consulta: s.tipo_consulta || '',
        contenido_sesion: s.desarrollo || s.conclusion || '',
        observaciones: s.observaciones || '',
        tareas_asignadas: s.tareas_asignadas || '',
        proxima_sesion: s.siguiente_cita || null
      }));

      if (append) {
        setSesiones(prev => [...prev, ...normalized]);
        setRecientesOffset(prev => prev + data.length);
      } else {
        setSesiones(normalized);
        setRecientesOffset(data.length);
      }

      setHasMoreRecientes(data.length === limit);
    } catch (error) {
      console.error('Error al cargar sesiones recientes:', error);
      if (!append) setSesiones([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      // Obtener pacientes activos para el select
      const res = await fetch(`${apiUrl}/api/pacientes/activos`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error en servidor' }));
        console.error('Error fetching pacientes:', err);
        setPacientes([]);
      } else {
        const json = await res.json();
        const data = Array.isArray(json) ? json : (json.data || []);
        const normalized = data.map(p => ({
          id: p.id,
          nombre: p.nombre || '',
          apellido: p.apellido || '',
          nombre_completo: p.nombre_completo || `${p.nombre || ''} ${p.apellido || ''}`.trim()
        }));
        setPacientes(normalized);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
      setLoading(false);
    }
  };

  // Cargar sesiones de un paciente por ID
  const fetchSesiones = async (pacienteId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/sesiones/paciente/${pacienteId}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error en servidor' }));
        console.error('Error fetching sesiones:', err);
        setSesiones([]);
        return;
      }

      const json = await res.json();
      const data = Array.isArray(json) ? json : (json.data || []);
      // Normalizar para la UI
      const paciente = pacientes.find(p => String(p.id) === String(pacienteId));
      const pacienteNombre = paciente ? paciente.nombre : 'Paciente';
      const normalized = data.map(s => ({
        id: s.id,
        paciente_nombre: pacienteNombre,
        fecha: s.fecha,
        hora_inicio: s.hora_inicio || s.hora_cita || '',
        hora_fin: s.hora_fin || '',
        motivo_consulta: s.tipo_consulta || '',
        contenido_sesion: s.desarrollo || s.conclusion || '',
        observaciones: s.observaciones || '',
        tareas_asignadas: s.tareas_asignadas || '',
        proxima_sesion: s.siguiente_cita || null
      }));

      setSesiones(normalized);
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      setSesiones([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener citas existentes del paciente para ligar la sesión
  const fetchCitasPaciente = async (pacienteId) => {
    try {
      console.log('🔍 Obteniendo citas para paciente_id:', pacienteId);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const url = `${apiUrl}/api/citas/paciente/${pacienteId}`;
      console.log('📡 URL:', url);

      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });

      console.log('📥 Respuesta status:', res.status);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error en servidor' }));
        console.error('❌ Error fetching citas del paciente:', err);
        setCitasPaciente([]);
        return;
      }

      const json = await res.json();
      console.log('📦 Respuesta JSON completa:', json);

      const data = Array.isArray(json) ? json : (json.data || []);
      console.log('📋 Data extraída:', data);

      const normalized = data.map(c => ({
        id: c.id,
        fecha: c.fecha || c.dia || null,
        hora: c.hora || c.hora_inicio || '',
        estado: c.estado || 'pendiente',
        tipo_consulta: c.tipo_consulta || 'presencial'
      }));

      console.log('✅ Citas normalizadas:', normalized);
      setCitasPaciente(normalized);
    } catch (error) {
      console.error('💥 Error al cargar citas del paciente:', error);
      setCitasPaciente([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const apiUrl = process.env.REACT_APP_API_URL;
    try {
      notifications.info('Registrando sesión...');
      const token = localStorage.getItem('token');
      const paciente = pacientes.find(p => p.id == formData.paciente_id);

      // Asegurar nombre y apellido para la API; si sólo hay nombre_completo, lo separamos
      let firstName = paciente?.nombre || '';
      let lastName = paciente?.apellido || '';
      if ((!firstName || !lastName) && paciente?.nombre_completo) {
        const parts = paciente.nombre_completo.split(' ').filter(Boolean);
        firstName = parts.shift() || '';
        lastName = parts.join(' ') || '';
      }

      // Validación básica antes de crear la cita
      if (!firstName || !lastName || !formData.fecha || !formData.hora_inicio) {
        notifications.error('Faltan campos requeridos: paciente (nombre y apellido), fecha y hora');
        return;
      }

      if (!formData.cita_id) {
        notifications.error('Selecciona la cita correspondiente para registrar la sesión');
        return;
      }

      const citaIdNumber = Number(formData.cita_id);
      if (Number.isNaN(citaIdNumber)) {
        notifications.error('La cita seleccionada no es válida');
        return;
      }

      // Obtener los datos completos de la cita para extraer terapeuta, coterapeuta y validar estado
      let terapeutaId = null;
      let coterapeutaId = null;
      let estadoCita = null;

      try {
        console.log(`🔍 Obteniendo datos de la cita ID: ${citaIdNumber}`);
        const resCita = await fetch(`${apiUrl}/api/citas/cita/${citaIdNumber}`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
        });

        if (!resCita.ok) {
          const errorText = await resCita.text();
          console.error(`❌ Error HTTP ${resCita.status} al obtener cita:`, errorText);

          // Continuar sin los datos del terapeuta/coterapeuta si no se puede obtener la cita
          console.warn('⚠️ Continuando sin datos de terapeuta/coterapeuta');
          // No hacer return aquí, permitir que continúe la creación
        } else {
          const jsonCita = await resCita.json();
          const citaCompleta = jsonCita.data || jsonCita;
          terapeutaId = citaCompleta.terapeuta_id || citaCompleta.psicologo_id || null;
          coterapeutaId = citaCompleta.coterapeuta_id || citaCompleta.becario_id || null;
          estadoCita = citaCompleta.estado;
          console.log('✅ Datos de la cita obtenidos:', { terapeutaId, coterapeutaId, estadoCita });

          // Validar el estado de la cita solo si se obtuvo correctamente
          if (estadoCita && estadoCita !== 'confirmada' && estadoCita !== 'completada') {
            notifications.error(`La cita debe estar en estado "confirmada" o "completada" para registrar la sesión. Estado actual: "${estadoCita}"`);
            return;
          }
        }
      } catch (err) {
        console.error('❌ Error obteniendo datos de la cita:', err);
        if (err.message === 'Failed to fetch') {
          notifications.warning('No se puede verificar el estado de la cita. Continuando con el registro...');
        } else {
          notifications.warning(`Error al obtener los datos de la cita: ${err.message}. Continuando...`);
        }
        // No hacer return, permitir que continúe el registro
      }

      // Registrar sesión
      const sesionBody = {
        cita_id: citaIdNumber,
        desarrollo: formData.contenido_sesion,
        conclusion: '',
        tareas_asignadas: formData.tareas_asignadas,
        emocion_predominante: formData.emocion_predominante || '',
        riesgo_suicida: 'ninguno',
        escalas_aplicadas: formData.escalas_aplicadas && formData.escalas_aplicadas.length ? formData.escalas_aplicadas : null,
        siguiente_cita: formData.proxima_sesion || null,
        privado: false,
        terapeuta_id: terapeutaId,
        coterapeuta_id: coterapeutaId
      };

      console.log('📤 Enviando sesión con terapeuta y coterapeuta:', sesionBody);

      const resSesion = await fetch(`${apiUrl}/api/sesiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify(sesionBody)
      });

      const jsonSesion = await resSesion.json().catch(() => ({}));
      if (!resSesion.ok || !jsonSesion.success) {
        notifications.error(jsonSesion.message || 'Error registrando sesión');
        return;
      }

      const nueva = jsonSesion.data;

      // Refrescar la lista de sesiones del paciente para mantener consistencia
      try { await fetchSesiones(formData.paciente_id); } catch (err) { console.warn('Error refrescando sesiones después de crear:', err); }

      setShowForm(false);
      resetForm();
      notifications.success('Sesión registrada exitosamente');

      // Emitir evento global
      try { window.dispatchEvent(new CustomEvent('sesionRegistrada', { detail: { sesion: nueva } })); } catch (e) { console.warn(e); }

    } catch (err) {
      console.error('Error registrando sesión:', err);
      notifications.error('Error registrando sesión');
    }
  };

  const resetForm = () => {
    setFormData({
      paciente_id: '',
      cita_id: '',
      fecha: new Date().toISOString().split('T')[0],
      hora_inicio: '10:00',
      hora_fin: '11:00',
      motivo_consulta: '',
      contenido_sesion: '',
      observaciones: '',
      tareas_asignadas: '',
      proxima_sesion: ''
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando sesiones...</div>
      </div>
    );
  }

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Registro de Sesiones</h1>
          <p>Registro detallado de sesiones terapéuticas</p>
        </div>
        <div className="flex-row gap-10">
          <button className="btn-secondary" onClick={() => tour.drive()}>
            Tour
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            <FiPlus /> Nueva Sesión
          </button>
        </div>
      </div>

      {/* Formulario de Nueva Sesión */}
      {showForm && (
        <div className="card mb-20">
          <div className="modal-header">
            <h3>Registrar Nueva Sesión</h3>
            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Paciente</label>
                <select
                  name="paciente_id"
                  value={formData.paciente_id}
                  onChange={handleInputChange}
                  className="select-field"
                  required
                >
                  <option value="">Seleccionar paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nombre_completo || `${paciente.nombre} ${paciente.apellido}`.trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Cita del paciente</label>
                <select
                  name="cita_id"
                  value={formData.cita_id}
                  onChange={(e) => {
                    console.log('📝 Cita seleccionada:', e.target.value);
                    handleInputChange(e);

                    // Auto-rellenar fecha y hora de la cita seleccionada
                    const citaId = e.target.value;
                    if (citaId) {
                      const citaSeleccionada = citasPaciente.find(c => String(c.id) === String(citaId));
                      if (citaSeleccionada) {
                        console.log('🔄 Auto-rellenando fecha/hora desde cita:', citaSeleccionada);
                        // Convertir fecha a formato local (YYYY-MM-DD) sin conversión de zona horaria
                        let fechaLocal = citaSeleccionada.fecha;
                        if (fechaLocal && fechaLocal.includes('T')) {
                          // Si viene con timestamp, extraer solo la parte de fecha
                          fechaLocal = fechaLocal.split('T')[0];
                        }
                        setFormData(prev => ({
                          ...prev,
                          cita_id: citaId,
                          fecha: fechaLocal || prev.fecha,
                          hora_inicio: citaSeleccionada.hora || prev.hora_inicio,
                          hora_fin: citaSeleccionada.hora ? calcularHoraFin(citaSeleccionada.hora, 50) : prev.hora_fin
                        }));
                      }
                    }
                  }}
                  className="select-field"
                  required
                  disabled={!formData.paciente_id}
                  onClick={() => console.log('👆 Click en selector. Citas disponibles:', citasPaciente.length, citasPaciente)}
                >
                  <option value="">Seleccionar cita</option>
                  {citasPaciente.map(cita => {
                    console.log('🔖 Renderizando opción de cita:', cita);
                    return (
                      <option key={cita.id} value={cita.id}>
                        {cita.fecha ? new Date(cita.fecha).toLocaleDateString() : 'Fecha'} {cita.hora ? `• ${cita.hora}` : ''} ({cita.estado || 'pendiente'}) {cita.tipo_consulta ? `• ${cita.tipo_consulta}` : ''}
                      </option>
                    );
                  })}
                  {formData.paciente_id && citasPaciente.length === 0 && (
                    <option value="" disabled>No hay citas para este paciente</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Fecha de sesión</label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hora inicio</label>
                <input
                  type="time"
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hora fin</label>
                <input
                  type="time"
                  name="hora_fin"
                  value={formData.hora_fin}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Motivo de consulta</label>
                <input
                  type="text"
                  name="motivo_consulta"
                  value={formData.motivo_consulta}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                  placeholder="Motivo principal de la sesión"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Contenido de la sesión</label>
                <textarea
                  name="contenido_sesion"
                  value={formData.contenido_sesion}
                  onChange={handleInputChange}
                  className="textarea-field"
                  rows="4"
                  required
                  placeholder="Descripción detallada de lo trabajado en la sesión..."
                />
              </div>

              <div className="form-group">
                <label>Observaciones</label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  className="textarea-field"
                  rows="3"
                  placeholder="Observaciones relevantes del paciente..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Tareas asignadas</label>
                <textarea
                  name="tareas_asignadas"
                  value={formData.tareas_asignadas}
                  onChange={handleInputChange}
                  className="textarea-field"
                  rows="3"
                  placeholder="Tareas o ejercicios para el paciente..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary btn-large"
                style={{
                  backgroundColor: '#28a745',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  fontSize: '16px'
                }}
              >
                <FiSave /> Guardar Sesión
              </button>
              <button
                type="button"
                className="btn-danger btn-large"
                style={{
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  fontSize: '16px'
                }}
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Sesiones Registradas */}
      <div className="config-content">
        <h3>Sesiones Registradas</h3>

        {sesiones.length > 0 ? (
          <>
            <div className="sesiones-list">
              {sesiones.map((sesion, idx) => (
                <div key={sesion.id} className="session-row" onClick={() => openSesionModal(sesion)}>
                  <div className="flex-row align-center gap-10">
                    <strong>Sesión {getSessionNumber(sesion)}</strong>
                    <FiCalendar />
                    <span>{new Date(sesion.fecha).toLocaleDateString()}</span>
                  </div>

                  <div className="flex-row align-center gap-10">
                    <FiUser />
                    <span>{sesion.paciente_nombre}</span>
                    {(Date.now() - new Date(sesion.fecha).getTime()) < 24 * 60 * 60 * 1000 && (
                      <span className="badge-new ml-8">Nueva</span>
                    )}
                  </div>

                  <div className="flex-row align-center gap-10">
                    <span>{sesion.hora_inicio} - {sesion.hora_fin}</span>
                  </div>
                </div>
              ))}
            </div>
            {!formData.paciente_id && hasMoreRecientes && (
              <div className="mt-10 text-center">
                <button className="btn-secondary" onClick={() => fetchRecientes(recientesLimit, recientesOffset, true)}>Cargar más</button>
              </div>
            )}
          </>
        ) : (
          <div className="no-citas">
            <div className="no-citas-icon">📋</div>
            <div>No hay sesiones registradas</div>
            <p className="text-small mt-10">
              Registra las sesiones terapéuticas para mantener un historial completo.
            </p>
            <button
              className="btn-text mt-10"
              onClick={() => setShowForm(true)}
            >
              <FiPlus /> Registrar tu primera sesión
            </button>
          </div>
        )}
      </div>

      {showSesionModal && selectedSesion && (
        <div className="modal-overlay" onClick={closeSesionModal}>
          <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detalles de la sesión</h3>
              <button className="modal-close" onClick={closeSesionModal}>×</button>
            </div>

            <div className="modal-content">
              <div className="grid-2 gap-20">
                <div>
                  <h4>Información</h4>
                  <div className="detail-row"><strong>Paciente:</strong> {selectedSesion.paciente_nombre}</div>
                  <div className="detail-row"><strong>Fecha:</strong> {selectedSesion.fecha ? new Date(selectedSesion.fecha).toLocaleDateString() : '—'}</div>
                  <div className="detail-row"><strong>Hora:</strong> {selectedSesion.hora_inicio || ''}{selectedSesion.hora_fin ? ` - ${selectedSesion.hora_fin}` : ''}</div>
                  <div className="detail-row"><strong>Cita / ID:</strong> {selectedSesion.cita_id || selectedSesion.id}</div>
                  {selectedSesion.emocion_predominante && <div className="detail-row"><strong>Emoción predominante:</strong> {selectedSesion.emocion_predominante}</div>}
                </div>

                <div>
                  <h4>Próxima sesión</h4>
                  <p>{selectedSesion.proxima_sesion ? new Date(selectedSesion.proxima_sesion).toLocaleDateString() : '—'}</p>
                </div>
              </div>

              <div className="mt-10">
                <h4>Motivo de consulta</h4>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedSesion.motivo_consulta || '—'}</p>

                <h4 className="mt-10">Contenido de la sesión</h4>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedSesion.contenido_sesion || '—'}</p>

                <h4 className="mt-10">Observaciones</h4>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedSesion.observaciones || '—'}</p>

                {selectedSesion.riesgo_suicida && (
                  <>
                    <h4 className="mt-10">Riesgo suicida</h4>
                    <p>{selectedSesion.riesgo_suicida}</p>
                  </>
                )}

                {selectedSesion.escalas_aplicadas && (
                  <>
                    <h4 className="mt-10">Escalas aplicadas</h4>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{typeof selectedSesion.escalas_aplicadas === 'string' ? selectedSesion.escalas_aplicadas : JSON.stringify(selectedSesion.escalas_aplicadas, null, 2)}</pre>
                  </>
                )}

              </div>
            </div>

            <div className="modal-footer" style={{ textAlign: 'right', marginTop: 12 }}>
              <button className="btn-secondary" onClick={closeSesionModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PsicologoSesiones;