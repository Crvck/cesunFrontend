import React, { useState, useEffect } from 'react';
import {
  FiClock, FiUser,
  FiChevronLeft, FiChevronRight,
  FiRefreshCw
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import ConfiguracionService from '../../services/configuracionService';
import notifications from '../../utils/notifications';
import { createCoterapeutaTour } from '../../utils/coterapeutaTour';
import '../coordinador/coordinador.css';

const BecarioCitas = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [citas, setCitas] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('');
  const [configCitas, setConfigCitas] = useState({ horarioInicio: '09:00', horarioFin: '20:00' });
  const [userId, setUserId] = useState(null);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [otroMotivo, setOtroMotivo] = useState('');
  const [showCancelarFuturasModal, setShowCancelarFuturasModal] = useState(false);
  const [pendingCancelCita, setPendingCancelCita] = useState(null);
  const [pendingCancelMotivo, setPendingCancelMotivo] = useState('');
  const tour = createCoterapeutaTour('citas');

  // Opciones predefinidas de motivos de cancelación
  const motivosCancelacionOpciones = [
    'Paciente no llegó',
    'Paciente no asistirá',
    'Paciente ya no asistirá a las sesiones'
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.id || payload.userId || payload.sub || null);
      } catch (e) {
        console.warn('No se pudo decodificar token para obtener userId');
      }
    }
  }, []);

  useEffect(() => {
    fetchCitas();
    fetchConfigCitas();
  }, [selectedDate, filterEstado, userId]);

  // Escuchar eventos de creación o actualización de cita para refrescar sin recargar manualmente
  React.useEffect(() => {
    const onCitaCreada = (e) => {
      try {
        console.log('Evento citaCreada recibido (citas):', e.detail);
        fetchCitas();
      } catch (err) {
        console.warn('Error manejando citaCreada:', err);
      }
    };

    const onCitaActualizada = (e) => {
      try {
        console.log('Evento citaActualizada recibido (citas):', e.detail);
        fetchCitas();
      } catch (err) { console.warn('Error manejando citaActualizada:', err); }
    };

    window.addEventListener('citaCreada', onCitaCreada);
    window.addEventListener('citaActualizada', onCitaActualizada);
    return () => {
      window.removeEventListener('citaCreada', onCitaCreada);
      window.removeEventListener('citaActualizada', onCitaActualizada);
    };
  }, [selectedDate, userId]);

  const fetchCitas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };

      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const fechaInicio = format(start, 'yyyy-MM-dd');
      const fechaFin = format(end, 'yyyy-MM-dd');

      const query = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        becario_id: userId || ''
      });

      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/api/agenda/global?${query.toString()}`, { headers });

      if (response.ok) {
        const data = await response.json();
        const raw = Array.isArray(data) ? data : (data.data?.citas || data.data || []);

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
            becario_id: cita.becario_id || cita.Becario?.id || null,
            fecha: fechaNormalizada,
            hora: horaNormalizada || '00:00',
            duracion: cita.duracion || cita.duracion_minutos || 50,
            tipo_consulta: cita.tipo_consulta,
            estado: cita.estado,
            notas: cita.notas,
            color: cita.color || cita.cita_color || null,
            paciente_nombre: cita.Paciente ? `${cita.Paciente.nombre} ${cita.Paciente.apellido}` : (cita.paciente_nombre || 'Paciente'),
            psicologo_nombre: cita.Psicologo ? `${cita.Psicologo.nombre} ${cita.Psicologo.apellido}` : (cita.psicologo_nombre || '')
          };
        });

        const soloAsignadas = userId
          ? normalized.filter(cita => String(cita.becario_id || '') === String(userId))
          : normalized;

        const citasFiltradas = filterEstado
          ? soloAsignadas.filter(cita => cita.estado === filterEstado)
          : soloAsignadas;

        setCitas(citasFiltradas);
      } else {
        setCitas([]);
      }
    } catch (error) {
      console.error('Error al obtener citas:', error);
    } finally {
      setLoading(false);
    }
  };

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
      console.error('Error cargando configuración de citas (becario):', error);
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
    return citas.filter(cita => {
      const hora = typeof cita.hora === 'string' ? cita.hora.split(':')[0] : cita.hora;
      return cita.fecha === dayStr && Number.parseInt(hora, 10) === hour;
    });
  };

  const openCitaModal = (cita) => {
    setSelectedCita(cita);
    setCancelMotivo('');
    setOtroMotivo('');
    setShowCitaModal(true);
  };

  const closeCitaModal = () => {
    setShowCitaModal(false);
    setSelectedCita(null);
    setCancelMotivo('');
    setOtroMotivo('');
  };

  const irARegistroSesion = (cita) => {
    if (!cita) return;
    const params = new URLSearchParams({
      openRegistro: '1',
      paciente_id: cita.paciente_id ? String(cita.paciente_id) : '',
      paciente_nombre: cita.paciente_nombre || '',
      cita_id: cita.id ? String(cita.id) : '',
      fecha: cita.fecha || '',
      hora: cita.hora || '',
      motivo: cita.notas || cita.tipo_consulta || ''
    });
    const targetPath = location.pathname.startsWith('/psicopedagogico')
      ? '/psicopedagogico/pacientes'
      : '/coterapeuta/pacientes';
    navigate(`${targetPath}?${params.toString()}`);
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

  const handleConfirmarCita = async (cita = selectedCita) => {
    if (!cita) return;
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/citas/cita/${cita.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ estado: 'completada' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        notifications.error(json.message || 'No se pudo completar la cita');
        return;
      }
      notifications.success('Cita completada');
      fetchCitas();
      closeCitaModal();
    } catch (error) {
      console.error('Error completando cita:', error);
      notifications.error('Error al completar la cita');
    }
  };

  const handleCancelarCita = async (cita = selectedCita) => {
    if (!cita) return;

    const motivoFinal = getMotivoFinal();
    if (!motivoFinal) {
      notifications.warning('Selecciona un motivo de cancelación');
      return;
    }

    // Mostrar modal de confirmación si se cancelan todas las citas futuras
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
      fetchCitas();
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
      fetchCitas();
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
          <p>Gestión de citas asignadas</p>
        </div>
        <div className="flex-row gap-10">
          <button className="btn-secondary" onClick={() => tour.drive()}>
            Tour
          </button>
          <button className="btn-secondary" onClick={fetchCitas}>
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
              Total: <span style={{ fontWeight: 'bold' }}>{citas.length}</span>
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
          <div className="filter-select">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="select-field"
              style={{ width: '170px' }}
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
            const citasCount = citas.filter(c => c.fecha === dayStr).length;
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
                        title={`${cita.hora} - ${cita.paciente_nombre}\n${cita.tipo_consulta}\nEstado: ${cita.estado}`}
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
        <h3>Citas para {getWeekRange()} ({citas.length})</h3>

        {citas.length > 0 ? (
          <div className="citas-cards">
            {citas.map((cita) => (
              <div
                key={cita.id}
                className="cita-card"
                onClick={() => openCitaModal(cita)}
                style={{ cursor: 'pointer' }}
              >
                <div className="cita-card-header">
                  <div className="cita-time">
                    <FiClock /> {cita.hora} ({cita.duracion || 50} min)
                  </div>
                  <div className={`cita-status badge ${cita.estado === 'confirmada' ? 'badge-success' :
                    cita.estado === 'completada' ? 'badge-primary' :
                      cita.estado === 'programada' ? 'badge-warning' :
                        'badge-danger'
                    }`}>
                    {cita.estado}
                  </div>
                </div>

                <div className="cita-card-body">
                  <div className="cita-paciente">
                    <FiUser /> {cita.paciente_nombre || 'Paciente'}
                  </div>

                  <div className="cita-info">
                    <div className="cita-tipo">
                      {cita.tipo_consulta === 'presencial' ? '📋 Presencial' : '💻 Virtual'}
                    </div>

                    {cita.psicologo_nombre && (
                      <div className="cita-psicologo">
                        👨‍⚕️ {cita.psicologo_nombre}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        irARegistroSesion(cita);
                      }}
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
            <div>No hay citas programadas para este día</div>
          </div>
        )}
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
              <div className="form-group">
                <strong>Fecha:</strong> {selectedCita.fecha ? new Date(selectedCita.fecha).toLocaleDateString() : 'Sin fecha'}
              </div>
              <div className="form-group">
                <strong>Hora:</strong> {selectedCita.hora}
              </div>
              <div className="form-group">
                <strong>Tipo:</strong> {selectedCita.tipo_consulta === 'presencial' ? 'Presencial' : 'Virtual'}
              </div>
              <div className="form-group">
                <strong>Terapeuta:</strong> {selectedCita.psicologo_nombre || 'No asignado'}
              </div>
              <div className="form-group">
                <strong>Estado:</strong> {selectedCita.estado}
              </div>
              {selectedCita.notas && (
                <div className="form-group">
                  <strong>Notas:</strong> {selectedCita.notas}
                </div>
              )}

              {selectedCita.estado === 'cancelada' && selectedCita.motivo_cancelacion && (
                <div className="form-group">
                  <strong>Motivo de cancelación:</strong> {selectedCita.motivo_cancelacion}
                </div>
              )}

              {(selectedCita.estado === 'programada' || selectedCita.estado === 'confirmada') && (
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
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {(selectedCita?.estado === 'programada' || selectedCita?.estado === 'confirmada') ? (
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
                <button className="btn-secondary" onClick={closeCitaModal}>Cerrar</button>
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

      {/* Estadísticas del Día */}
      <div className="grid-3 mt-20">
        <div className="card">
          <h4>Resumen del Día</h4>
          <div className="mt-10">
            <p>Total: {citas.length}</p>
            <p>Confirmadas: {citas.filter(c => c.estado === 'confirmada').length}</p>
            <p>Completadas: {citas.filter(c => c.estado === 'completada').length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Tipos de Consulta</h4>
          <div className="mt-10">
            <p>Presencial: {citas.filter(c => c.tipo_consulta === 'presencial').length}</p>
            <p>Virtual: {citas.filter(c => c.tipo_consulta === 'virtual').length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Acciones</h4>
          <div className="mt-10 flex-col gap-10">
            <div className="text-small">Vista semanal activa</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BecarioCitas;