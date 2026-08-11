import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiClock, FiUser,
  FiChevronLeft, FiChevronRight, FiRefreshCw
} from 'react-icons/fi';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import notifications from '../../utils/notifications';
import ConfiguracionService from '../../services/configuracionService';
import { createTherapistTour } from '../../utils/therapistTour';
import '../coordinador/coordinador.css';

const PsicologoCitas = () => {
  const navigate = useNavigate();
  const [citas, setCitas] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [filterBecario, setFilterBecario] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [becarios, setBecarios] = useState([]);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [otroMotivo, setOtroMotivo] = useState('');
  const [showCancelarFuturasModal, setShowCancelarFuturasModal] = useState(false);
  const [pendingCancelCita, setPendingCancelCita] = useState(null);
  const [pendingCancelMotivo, setPendingCancelMotivo] = useState('');
  const [configCitas, setConfigCitas] = useState({ horarioInicio: '09:00', horarioFin: '20:00' });
  const tour = createTherapistTour('citas');

  // Opciones predefinidas de motivos de cancelación
  const motivosCancelacionOpciones = [
    'Paciente no llegó',
    'Paciente no asistirá',
    'Paciente ya no asistirá a las sesiones'
  ];

  useEffect(() => {
    fetchData();
    fetchConfigCitas();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };

      let decodedUserId = null;
      try {
        const payload = token?.split('.')[1];
        const json = payload ? JSON.parse(atob(payload)) : null;
        decodedUserId = json?.id || json?.userId || null;

      } catch (_) {

      }

      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const fechaInicio = format(start, 'yyyy-MM-dd');
      const fechaFin = format(end, 'yyyy-MM-dd');

      const query = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        psicologo_id: decodedUserId || ''
      });

      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
      const res = await fetch(`${apiUrl}/api/agenda/global?${query.toString()}`, { headers });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error en servidor' }));
        console.error('Error fetching citas:', err);
        notifications.error('No se pudieron obtener las citas');
        setCitas([]);
      } else {
        const json = await res.json();
        const raw = Array.isArray(json) ? json : (json.data?.citas || json.data || []);

        const normalized = raw.map((cita) => {
          const fechaNormalizada = typeof cita.fecha === 'string'
            ? cita.fecha.split('T')[0]
            : format(new Date(cita.fecha), 'yyyy-MM-dd');
          const horaNormalizada = typeof cita.hora === 'string'
            ? cita.hora.slice(0, 5)
            : cita.hora;
          return {
            id: cita.id,
            paciente_id: cita.paciente_id || cita.Paciente?.id || null,
            fecha: fechaNormalizada,
            hora: horaNormalizada || '00:00',
            duracion: cita.duracion || cita.duracion_minutos || 50,
            tipo_consulta: cita.tipo_consulta,
            estado: cita.estado,
            notas: cita.notas,
            color: cita.color || cita.cita_color || null,
            paciente_nombre: cita.Paciente ? `${cita.Paciente.nombre} ${cita.Paciente.apellido}` : (cita.paciente_nombre || 'Paciente'),
            paciente_telefono: cita.Paciente?.telefono || cita.paciente_telefono || '',
            paciente_email: cita.Paciente?.email || cita.paciente_email || '',
            becario_nombre: cita.Becario ? `${cita.Becario.nombre} ${cita.Becario.apellido}` : (cita.becario_nombre || '')
          };
        });

        setCitas(normalized);
      }

      try {
        const apiUrl = process.env.REACT_APP_API_URL;
        const resB = await fetch(`${apiUrl}/api/users/becarios`, { headers });
        const dataB = await resB.json();
        const normalized = (dataB || []).map(b => ({
          ...b,
          nombre_completo: b.nombre + (b.apellido ? ` ${b.apellido}` : '')
        }));
        setBecarios(normalized);
      } catch (err) {
        console.warn('No se pudieron obtener becarios:', err);
        setBecarios([]);
      }
    } catch (error) {
      console.error('Error al cargar citas:', error);
      notifications.error('Error al cargar citas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onCitaCreada = () => fetchData();
    const onCitaActualizada = () => fetchData();
    window.addEventListener('citaCreada', onCitaCreada);
    window.addEventListener('citaActualizada', onCitaActualizada);
    return () => {
      window.removeEventListener('citaCreada', onCitaCreada);
      window.removeEventListener('citaActualizada', onCitaActualizada);
    };
  }, [selectedDate]);

  const filteredCitas = citas.filter(cita => {
    const matchesBecario = !filterBecario
      ? true
      : (filterBecario === 'sin_becario'
        ? !cita.becario_nombre
        : cita.becario_nombre?.includes(filterBecario));
    const matchesEstado = !filterEstado || cita.estado === filterEstado;
    return matchesBecario && matchesEstado;
  });

  const goToPreviousWeek = () => {
    setSelectedDate(prev => subDays(prev, 7));
  };

  const goToNextWeek = () => {
    setSelectedDate(prev => addDays(prev, 7));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const fetchConfigCitas = async () => {
    try {
      const response = await ConfiguracionService.obtenerPorCategoria('citas');
      const data = response?.data || response || {};
      setConfigCitas({
        horarioInicio: data.horarioInicio || '09:00',
        horarioFin: data.horarioFin || '20:00'
      });
    } catch (error) {
      console.error('Error cargando configuración de citas (psicólogo):', error);
    }
  };

  const generateHours = () => {
    const startHour = parseInt((configCitas.horarioInicio || '09:00').split(':')[0], 10);
    const endHour = parseInt((configCitas.horarioFin || '20:00').split(':')[0], 10);
    const safeStart = Number.isNaN(startHour) ? 9 : startHour;
    const safeEnd = Number.isNaN(endHour) ? 20 : endHour;
    const hours = [];
    for (let i = safeStart; i <= safeEnd; i++) {
      hours.push(i);
    }
    return hours;
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 })
  });

  const getWeekRange = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return `Semana del ${format(start, 'd MMM')} al ${format(end, 'd MMM, yyyy')}`;
  };

  const getCitasPorDiaYHora = (day, hour) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredCitas.filter(cita => {
      const hora = typeof cita.hora === 'string' ? cita.hora.split(':')[0] : cita.hora;
      return cita.fecha === dayStr && Number.parseInt(hora, 10) === hour;
    });
  };

  const openCitaModal = (cita) => {
    setSelectedCita(cita);
    setCancelMotivo('');
    setShowCitaModal(true);
  };

  const renderCitaEstado = () => {
    if (!selectedCita) return null;

    if (selectedCita.estado === 'cancelada') {
      return (
        <div className="form-group">
          <span className="badge badge-danger">Cancelada</span>
          <br />
          <strong>Motivo de Cancelación:</strong> {selectedCita.motivo_cancelacion || 'No especificado'}
        </div>
      );
    }

    if (selectedCita.estado === 'programada') {
      return (
        <div className="form-group">
          <span className="badge badge-warning">Programada</span>
        </div>
      );
    }

    if (selectedCita.estado === 'confirmada') {
      return (
        <div className="form-group">
          <span className="badge badge-success">Confirmada</span>
        </div>
      );
    }

    if (selectedCita.estado === 'Confirmada') {
      return (
        <div className="form-group">
          <strong>Estado:</strong> Confirmada y Completada
        </div>
      );
    }

    return null;
  };

  const closeCitaModal = () => {
    setShowCitaModal(false);
    setSelectedCita(null);
    setCancelMotivo('');
    setOtroMotivo('');
  };

  const handleConfirmarCita = async (cita = selectedCita) => {
    if (!cita) return;
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/citas/cita/${cita.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ estado: 'completada' }) // Cambiamos el estado a 'completada'
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        notifications.error(json.message || 'No se pudo completar la cita');
        return;
      }
      notifications.success('Cita completada');
      fetchData();
      closeCitaModal();
    } catch (error) {
      console.error('Error completando cita:', error);
      notifications.error('Error al completar la cita');
    }
  };

  const getMotivoFinal = () => {
    if (cancelMotivo && cancelMotivo !== 'otro') {
      return cancelMotivo;
    }
    if (cancelMotivo === 'otro' && otroMotivo.trim()) {
      return `Otro: ${otroMotivo.trim()}`;
    }
    return cancelMotivo.trim();
  };

  const handleCancelarCita = async (cita = selectedCita) => {
    if (!cita) return;

    const motivoFinal = getMotivoFinal();
    if (!motivoFinal) {
      notifications.warning('Selecciona un motivo de cancelación');
      return;
    }

    // Mostrar modal de confirmación interno si se cancelan todas las citas futuras
    if (motivoFinal === 'Paciente ya no asistirá a las sesiones') {
      setPendingCancelCita(cita);
      setPendingCancelMotivo(motivoFinal);
      setShowCancelarFuturasModal(true);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/citas/cita/${cita.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ estado: 'cancelada', motivo_cancelacion: motivoFinal })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        notifications.error(json.message || 'No se pudo cancelar la cita');
        return;
      }
      notifications.success('Cita cancelada');
      fetchData();
      closeCitaModal();
    } catch (error) {
      console.error('Error cancelando cita:', error);
      notifications.error('Error al cancelar la cita');
    }
  };

  const confirmCancelarFuturas = async () => {
    if (!pendingCancelCita || !pendingCancelMotivo) {
      setShowCancelarFuturasModal(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/citas/cancelar-futuras/${pendingCancelCita.paciente_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ motivo_cancelacion: pendingCancelMotivo })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        notifications.error(json.message || 'No se pudieron cancelar las citas futuras');
        return;
      }
      notifications.success(`Se cancelaron ${json.citasCanceladas || 'todas las'} citas futuras del paciente`);
      fetchData();
      closeCitaModal();
    } catch (error) {
      console.error('Error cancelando citas futuras:', error);
      notifications.error('Error al cancelar las citas futuras');
    } finally {
      setShowCancelarFuturasModal(false);
      setPendingCancelCita(null);
      setPendingCancelMotivo('');
    }
  };

  const cancelCancelarFuturas = () => {
    setShowCancelarFuturasModal(false);
    setPendingCancelCita(null);
    setPendingCancelMotivo('');
  };

  const irARegistroSesion = (cita) => {
    if (!cita) return;
    const params = new URLSearchParams({
      paciente_id: cita.paciente_id ? String(cita.paciente_id) : '',
      cita_id: cita.id ? String(cita.id) : '',
      fecha: cita.fecha || '',
      hora: cita.hora || '',
      motivo: cita.notas || cita.tipo_consulta || ''
    });
    navigate(`/terapeuta/sesiones?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando citas...</div>
      </div>
    );
  }

  return (
    <div className="citas-page">
      <div className="page-header">
        <div>
          <h1>Mis Citas</h1>
          <p>Agenda de sesiones y supervisiones</p>
        </div>
        <div className="flex-row gap-10">
          <button className="btn-secondary" onClick={() => tour.drive()}>
            Tour
          </button>
          <button className="btn-secondary" onClick={fetchData}>
            <FiRefreshCw /> Actualizar
          </button>
        </div>
      </div>

      <div className="calendar-controls">
        <div className="date-navigation">
          <button className="btn-header" onClick={goToPreviousWeek}>
            <FiChevronLeft /> Semana anterior
          </button>

          <div className="current-date">
            <h3>{getWeekRange()}</h3>
            <div className="text-small">
              Total: <span style={{ fontWeight: 'bold' }}>{filteredCitas.length}</span>
            </div>
          </div>

          <button className="btn-header" onClick={goToNextWeek}>
            Semana siguiente <FiChevronRight />
          </button>
        </div>

        <div className="quick-actions">
          <button className="btn-primary" onClick={goToToday}>
            Hoy
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-container mb-20">
        <div className="grid-2 gap-20">
          <div className="form-group">
            <label className="form-label">Filtrar por becario</label>
            <select
              value={filterBecario}
              onChange={(e) => setFilterBecario(e.target.value)}
              className="select-field"
            >
              <option value="">Todos los becarios</option>
              {becarios.map(becario => (
                <option key={becario.id} value={becario.nombre}>
                  {becario.nombre} {becario.apellido}
                </option>
              ))}
              <option value="sin_becario">Sin becario</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Filtrar por estado</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="select-field"
            >
              <option value="">Todos los estados</option>
              <option value="programada">Programadas</option>
              <option value="confirmada">Confirmadas</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendario Semanal (solo lectura) */}
      <div className="calendar-week-view" style={{ minHeight: '600px' }}>
        <div className="week-header">
          <div className="time-header"></div>
          {weekDays.map((day) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const citasCount = filteredCitas.filter(c => c.fecha === dayStr).length;
            return (
              <div key={day.toISOString()} className="day-header">
                <div className="day-name">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className="day-number">
                  {format(day, 'd')}
                </div>
                <div className="text-small">
                  {citasCount} citas
                </div>
              </div>
            );
          })}
        </div>

        <div className="week-body">
          <div className="time-column">
            {generateHours().map(hour => (
              <div key={hour} className="time-slot">{hour}</div>
            ))}
          </div>

          {weekDays.map((day) => (
            <div key={day.toISOString()} className="day-column">
              {generateHours().map(hour => {
                const citasHora = getCitasPorDiaYHora(day, hour);
                const maxVisible = 6;
                const citasVisibles = citasHora.slice(0, maxVisible);

                return (
                  <div key={hour} className="hour-cell" style={{ height: '60px' }}>
                    {citasVisibles.map((cita, index) => (
                      <div
                        key={cita.id}
                        className="week-event"
                        style={{
                          backgroundColor: cita.color || '#1F85BA',
                          opacity: 0.95,
                          width: `${100 / citasVisibles.length}%`,
                          left: `${index * (100 / citasVisibles.length)}%`,
                          height: '100%',
                          top: '0',
                          position: 'absolute',
                          zIndex: 10 + index
                        }}
                        title={`${cita.hora} - ${cita.paciente_nombre}\n${cita.tipo_consulta}\nEstado: ${cita.estado}\n${cita.paciente_telefono || ''} ${cita.paciente_email || ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openCitaModal(cita);
                        }}
                      >
                        <div className="week-event-time">{(cita.hora || '').slice(0, 5)}</div>
                        <div className="week-event-patient">
                          {cita.paciente_nombre?.length > 15
                            ? `${cita.paciente_nombre.slice(0, 15)}...`
                            : cita.paciente_nombre}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Citas */}
      <div className="day-citas-list">
        <h3>Citas para {getWeekRange()} ({filteredCitas.length})</h3>

        {filteredCitas.length > 0 ? (
          <div className="citas-cards">
            {filteredCitas.map((cita) => (
              <div
                key={cita.id}
                className="cita-card"
                onClick={() => openCitaModal(cita)}
                style={{ cursor: 'pointer' }}
              >
                <div className="cita-card-header">
                  <div className="cita-time">
                    <FiClock /> {cita.hora} ({cita.duracion} min)
                  </div>
                  <div
                    className={`cita-status badge ${cita.estado === 'confirmada' ? 'badge-success' :
                        cita.estado === 'completada' ? 'badge-success' :
                          cita.estado === 'programada' ? 'badge-warning' :
                            'badge-danger'
                      }`}
                    style={
                      (cita.estado === 'confirmada' || cita.estado === 'completada')
                        ? { backgroundColor: '#5b8666', color: '#28a745' }
                        : cita.estado === 'cancelada'
                          ? { backgroundColor: '#8a545a', color: '#dc3545' }
                          : {}
                    }
                  >
                    <span style={{
                      color: (cita.estado === 'confirmada' || cita.estado === 'completada')
                        ? '#28a745'
                        : cita.estado === 'cancelada'
                          ? '#dc3545'
                          : 'inherit'
                    }}>
                      {cita.estado}
                    </span>
                  </div>
                </div>

                <div className="cita-card-body">
                  <div className="cita-paciente">
                    <FiUser /> {cita.paciente_nombre}
                  </div>

                  <div className="cita-info">
                    <div className="cita-tipo">
                      {cita.tipo_consulta === 'presencial' ? '📋 Presencial' : '💻 Virtual'}
                    </div>

                    {(cita.paciente_telefono || cita.paciente_email) && (
                      <div className="cita-notas">
                        {cita.paciente_telefono && (
                          <div><strong>Tel:</strong> {cita.paciente_telefono}</div>
                        )}
                        {cita.paciente_email && (
                          <div><strong>Email:</strong> {cita.paciente_email}</div>
                        )}
                      </div>
                    )}

                    {cita.becario_nombre && (
                      <div className="cita-becario">
                        👨‍🎓 {cita.becario_nombre}
                      </div>
                    )}

                    {cita.notas && (
                      <div className="cita-notas">
                        <strong>Notas:</strong> {cita.notas}
                      </div>
                    )}
                  </div>
                </div>

                <div className="cita-card-footer">
                  {(cita.estado === 'confirmada' || cita.estado === 'completada') && (
                    <div
                      className="cita-status badge"
                      onClick={() => irARegistroSesion(cita)}
                      style={{
                        backgroundColor: '#1b87cfff',
                        color: '#fff',
                        cursor: 'pointer',
                        border: 'none'
                      }}
                    >
                      Llenar Registro
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-citas">
            <div className="no-citas-icon">📅</div>
            <div>No hay citas programadas para esta semana</div>
            <p className="text-small mt-10">Prueba con otros filtros o selecciona otra fecha</p>
          </div>
        )}
      </div>

      {/* Estadísticas del Día */}
      <div className="grid-3 mt-20">
        <div className="card">
          <h4>Resumen del Día</h4>
          <div className="mt-10">
            <p>Total: {citas.length}</p>
            <p>Confirmadas: {citas.filter(c => c.estado === 'confirmada').length}</p>
            <p>Con becario: {citas.filter(c => c.becario_nombre).length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Tipos de Consulta</h4>``
          <div className="mt-10">
            <p>Presencial: {citas.filter(c => c.tipo_consulta === 'presencial').length}</p>
            <p>Virtual: {citas.filter(c => c.tipo_consulta === 'virtual').length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Notas</h4>
          <div className="mt-10">
            <p className="text-small">Vista solo lectura de tus citas asignadas.</p>
          </div>
        </div>
      </div>

      {showCitaModal && selectedCita && (
        <div className="modal-overlay">
          <div className="modal-container modal-medium">
            <div className="modal-header">
              <h3>Detalle de cita</h3>
              <button className="modal-close" onClick={closeCitaModal}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <strong>Paciente:</strong> {selectedCita.paciente_nombre}
              </div>
              {(selectedCita.paciente_telefono || selectedCita.paciente_email) && (
                <div className="form-group">
                  {selectedCita.paciente_telefono && (
                    <div><strong>Tel:</strong> {selectedCita.paciente_telefono}</div>
                  )}
                  {selectedCita.paciente_email && (
                    <div><strong>Email:</strong> {selectedCita.paciente_email}</div>
                  )}
                </div>
              )}
              <div className="form-group">
                <strong>Hora:</strong> {selectedCita.hora}
              </div>
              <div className="form-group">
                <strong>Tipo:</strong> {selectedCita.tipo_consulta === 'presencial' ? 'Presencial' : 'Virtual'}
              </div>
              <div className="form-group">
                <strong>Coterapeuta:</strong> {selectedCita.becario_nombre || 'No asignado'}
              </div>
              <div className="form-group">
                <strong>Estado:</strong> {selectedCita.estado}
              </div>

              {renderCitaEstado()}

              <div className="form-group" style={{ marginTop: '10px' }}>
                <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Motivo de cancelación</label>
                <select
                  className="select-field"
                  value={cancelMotivo}
                  onChange={(e) => setCancelMotivo(e.target.value)}
                  style={{
                    marginTop: '8px',
                    padding: '10px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    width: '100%',
                    backgroundColor: '#2c3e50',
                    color: '#ecf0f1',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ backgroundColor: '#2c3e50', color: '#ecf0f1' }}>Seleccionar motivo...</option>
                  {motivosCancelacionOpciones.map((opcion, idx) => (
                    <option key={idx} value={opcion} style={{ backgroundColor: '#2c3e50', color: '#ecf0f1' }}>{opcion}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedCita?.estado === 'completada' && (
                <button className="btn-primary" onClick={() => irARegistroSesion(selectedCita)}>
                  Registrar sesión
                </button>
              )}
              {selectedCita?.estado === 'programada' ? (
                <>
                  <button
                    className="btn-danger"
                    onClick={() => handleCancelarCita(selectedCita)}
                    style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                  >
                    Cancelar cita
                  </button>
                  <button
                    className="btn-success"
                    onClick={() => handleConfirmarCita(selectedCita)}
                    style={{ backgroundColor: '#28a745', color: '#fff', border: 'none', marginLeft: 'auto', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                  >
                    Completada
                  </button>
                </>
              ) : (
                <div className="text-small">Este estado ya no se puede modificar.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelarFuturasModal && (
        <div className="modal-overlay">
          <div className="modal-container modal-small">
            <div className="modal-header">
              <h3>Confirmar cancelación</h3>
              <button className="modal-close" onClick={cancelCancelarFuturas}>×</button>
            </div>
            <div className="modal-content">
              <p style={{ marginBottom: '10px' }}>
                Esta acción cancelará <strong>TODAS</strong> las citas futuras del paciente.
              </p>
              <p className="text-small" style={{ color: '#c0392b' }}>
                ¿Estás seguro de que deseas continuar?
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn-secondary"
                onClick={cancelCancelarFuturas}
                style={{ padding: '10px 20px', borderRadius: '4px' }}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={confirmCancelarFuturas}
                style={{ backgroundColor: '#dc3545', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '4px', marginLeft: 'auto' }}
              >
                Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PsicologoCitas;