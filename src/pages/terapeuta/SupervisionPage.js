import React, { useState, useEffect } from 'react';
import { FiUser, FiFileText, FiCalendar, FiMessageSquare, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { createTherapistTour } from '../../utils/therapistTour';

const PsicologoSupervision = () => {
  const [becarios, setBecarios] = useState([]);
  const [observaciones, setObservaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBecario, setSelectedBecario] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showPacienteObservaciones, setShowPacienteObservaciones] = useState(false);
  const [observacionesPaciente, setObservacionesPaciente] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState(null);

  const [horasInputs, setHorasInputs] = useState({});
  const tour = createTherapistTour('supervision');

  useEffect(() => {
    fetchData();
  }, []);

  const isValidDate = (v) => {
    if (!v) return false;
    const d = new Date(v);
    return !isNaN(d.getTime());
  };

  const formatDateSafe = (v) => (isValidDate(v) ? new Date(v).toLocaleDateString() : '—');

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Obtener becarios asignados al psicólogo actual
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
      const becariosRes = await fetch(`${apiUrl}/api/asignaciones/mis-becarios`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });

      if (becariosRes.ok) {
        const becariosData = await becariosRes.json();
        const raw = Array.isArray(becariosData) ? becariosData : (becariosData.data || []);
        const becariosAsignados = raw.map(b => ({
          ...b,
          horas_acumuladas: b.horas_acumuladas || 0,
          sesiones_supervisadas: b.sesiones_supervisadas || 0
        }));
        setBecarios(becariosAsignados);

        // Obtener observaciones recientes para los becarios asignados
        const observacionesPromises = becariosAsignados.map(async (becario) => {
          try {
            const obsRes = await fetch(`${apiUrl}/api/observaciones/becario/${becario.id}`, {
              headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
            });
            if (!obsRes.ok) return [];
            const obsData = await obsRes.json();
            const obsArray = Array.isArray(obsData?.data)
              ? obsData.data
              : Array.isArray(obsData)
                ? obsData
                : [];
            return obsArray.map(obs => ({
              ...obs,
              becario_id: becario.id,
              becario_nombre: becario.nombre + ' ' + (becario.apellido || ''),
              paciente_nombre: obs.paciente_nombre || 'Paciente'
            }));
          } catch (err) {
            console.warn(`Error obteniendo observaciones para becario ${becario.id}:`, err);
            return [];
          }
        });

        const observacionesArrays = await Promise.all(observacionesPromises);
        const todasObservaciones = observacionesArrays.flat();
        setObservaciones(todasObservaciones);

        // Nota: Se removió todo lo relacionado con citas de becarios en esta vista

      }

    } catch (error) {
      console.error('Error al cargar datos:', error);
      notifications.error('Error al cargar datos de supervisión');
    } finally {
      setLoading(false);
    }
  };

  const enviarFeedback = async (becarioId) => {
    if (!feedback.trim()) {
      notifications.error('Por favor, escribe algún feedback');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      // Intentar registrar feedback (si el backend lo soporta)
      try {
        await fetch(`${apiUrl}/api/observaciones/feedback/${becarioId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({
            feedback: feedback,
            tipo: 'supervision'
          })
        });
      } catch (_) {
        // Ignorar errores de este endpoint: la notificación es lo importante para el becario
      }

      // Enviar notificación al becario (siempre que sea posible)
      const notifRes = await fetch(`${apiUrl}/api/notificaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          usuario_id: becarioId,
          titulo: 'Nuevo feedback de supervisión',
          mensaje: `Has recibido feedback de tu supervisor: "${feedback.substring(0, 200)}${feedback.length > 200 ? '...' : ''}"`,
          tipo: 'alerta_sistema',
          datos_extra: { origen: 'supervision', categoria: 'feedback' }
        })
      });

      if (notifRes.ok) {
        notifications.success(`Mensaje enviado al becario`);
        setFeedback('');
        setShowFeedback(false);
        fetchData();
      } else {
        const err = await notifRes.json().catch(() => ({}));
        notifications.error(err.message || 'No se pudo notificar al becario');
      }
    } catch (error) {
      console.error('Error enviando feedback:', error);
      notifications.error('Error al enviar feedback');
    }
  };

  const handleHorasChange = (becarioId, value) => {
    setHorasInputs(prev => ({ ...prev, [becarioId]: value }));
  };

  const agregarHoras = async (becarioId) => {
    const valor = parseFloat(horasInputs[becarioId]);
    if (Number.isNaN(valor) || valor <= 0) {
      notifications.error('Ingresa horas mayores a 0');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
      const res = await fetch(`${apiUrl}/api/asignaciones/becarios/${becarioId}/horas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ horas: valor })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        notifications.error(err.message || 'No se pudieron registrar las horas (verificar endpoint /api/becarios/:id/horas)');
        return;
      }

      notifications.success('Horas registradas');
      setHorasInputs(prev => ({ ...prev, [becarioId]: '' }));
      fetchData();
    } catch (error) {
      console.error('Error agregando horas:', error);
      notifications.error('Error agregando horas');
    }
  };

  const getBecarioObservaciones = (becarioId) => {
    return observaciones.filter(obs => obs.becario_id === becarioId);
  };

  const verObservacionesPaciente = async (pacienteId, pacienteNombre) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) throw new Error('REACT_APP_API_URL no definida');
      const response = await fetch(`${apiUrl}/api/observaciones/paciente/${pacienteId}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });

      if (response.ok) {
        const data = await response.json();
        const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setObservacionesPaciente(arr);
        setSelectedPaciente({ id: pacienteId, nombre: pacienteNombre });
        setShowPacienteObservaciones(true);
      } else {
        notifications.error('Error al obtener observaciones del paciente');
      }
    } catch (error) {
      console.error('Error obteniendo observaciones del paciente:', error);
      notifications.error('Error al obtener observaciones del paciente');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando supervisión...</div>
      </div>
    );
  }

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Supervisión de Becarios</h1>
          <p>Gestión y seguimiento de becarios en formación</p>
        </div>
        <button className="btn-secondary" onClick={() => tour.drive()}>
          Tour
        </button>
      </div>

      {/* Lista de Becarios */}
      <div className="config-content">
        <h3>Becarios en Supervisión</h3>

        <div className="grid-2 gap-20 mt-20">
          {becarios.map((becario) => {
            const becarioObservaciones = getBecarioObservaciones(becario.id);
            const observacionesPendientes = becarioObservaciones.filter(o => o.tipo_observacion !== 'retroalimentacion').length;

            return (
              <div key={becario.id} className="card">
                <div className="flex-row align-center justify-between mb-10">
                  <div className="flex-row align-center gap-10">
                    <div className="avatar">
                      {becario.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3>{becario.nombre}</h3>
                      <p className="text-small">{becario.email}</p>
                    </div>
                  </div>
                  {observacionesPendientes > 0 && (
                    <span className="badge badge-warning">
                      {observacionesPendientes} pendientes
                    </span>
                  )}
                </div>

                <div className="mb-10">
                  <div className="grid-2 gap-10">
                    <div>
                      <p><strong>Pacientes:</strong> {becario.pacientes_asignados ?? 0}</p>
                      <p><strong>Sesiones:</strong> {becario.sesiones_supervisadas ?? 0}</p>
                      <p><strong>Horas acumuladas:</strong> {becario.horas_acumuladas ?? 0} h</p>
                    </div>
                    <div>
                      <p><strong>Inicio:</strong> {formatDateSafe(becario.fecha_inicio)}</p>
                      <p><strong>Última supervisión:</strong> {formatDateSafe(becario.ultima_supervision)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-row gap-10">
                  <button
                    className="btn-primary flex-1"
                    onClick={() => {
                      setSelectedBecario(becario);
                      setShowFeedback(true);
                    }}
                  >
                    <FiMessageSquare /> Dar Feedback
                  </button>

                </div>

                <div className="mt-10">
                  <label className="text-small">Sumar horas de servicio</label>
                  <div className="flex-row gap-10 mt-5">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={horasInputs[becario.id] ?? ''}
                      onChange={(e) => handleHorasChange(becario.id, e.target.value)}
                      className="input"
                      placeholder="Horas"
                      style={{ maxWidth: '120px' }}
                    />
                    <button className="btn-secondary" onClick={() => agregarHoras(becario.id)}>
                      + Agregar horas
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>



        {/* Estadísticas */}
        <div className="grid-2 mt-30 gap-20">
          <div className="card">
            <h4>Resumen de Supervisión</h4>
            <div className="mt-10">
              <p>Total becarios: {becarios.length}</p>
              <p>Observaciones totales: {observaciones.length}</p>
              <p>Observaciones pendientes: {observaciones.filter(o => o.tipo_observacion !== 'retroalimentacion').length}</p>
              <p>Sesiones supervisadas: {becarios.reduce((sum, b) => sum + (b.sesiones_supervisadas || 0), 0)}</p>
            </div>
          </div>

          {/* <div className="card">
            <h4>Acciones</h4>
            <div className="mt-10 flex-col gap-10">
              <button className="btn-primary w-100">
                Generar Informe
              </button>
            </div>
          </div> */}
        </div>
      </div>

      {/* Modal para Feedback */}
      {showFeedback && selectedBecario && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Feedback para {selectedBecario.nombre}</h3>
              <button className="modal-close" onClick={() => setShowFeedback(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Escribe tu feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="textarea-field"
                  rows="6"
                  placeholder="Comparte tus observaciones, sugerencias y áreas de mejora..."
                />
              </div>

              <div className="mt-10">
                <p className="text-small">
                  <FiAlertCircle /> El feedback debe ser constructivo y específico.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowFeedback(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={() => enviarFeedback(selectedBecario.id)}
              >
                <FiCheckCircle /> Enviar Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Observaciones del Paciente */}
      {showPacienteObservaciones && selectedPaciente && (
        <div className="modal-overlay">
          <div className="modal-container modal-large">
            <div className="modal-header">
              <h3>Observaciones de {selectedPaciente.nombre}</h3>
              <button className="modal-close" onClick={() => setShowPacienteObservaciones(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="observaciones-list">
                {observacionesPaciente.length > 0 ? (
                  observacionesPaciente.map((obs) => (
                    <div key={obs.id} className="observacion-card">
                      <div className="observacion-header">
                        <div className="flex-row align-center gap-10">
                          <FiCalendar />
                          <span>{formatDateSafe(obs.fecha)}</span>
                        </div>
                        <div className="flex-row align-center gap-10">
                          <FiUser />
                          <span>Becario: {obs.becario_nombre}</span>
                        </div>
                        <div className={`badge ${obs.tipo_observacion === 'retroalimentacion' ? 'badge-success' : 'badge-warning'}`}>
                          {obs.tipo_observacion === 'retroalimentacion' ? 'Feedback' : 'Observación'}
                        </div>
                      </div>

                      <div className="observacion-content">
                        <div className="grid-2 gap-20">
                          <div>
                            <h5>Observaciones</h5>
                            <p>{obs.contenido || obs.fortalezas || 'Sin observaciones detalladas'}</p>

                            <h5 className="mt-10">Áreas de mejora</h5>
                            <p>{obs.areas_mejora || 'Sin áreas específicas'}</p>
                          </div>

                          <div>
                            <h5>Feedback del supervisor</h5>
                            {obs.recomendaciones || obs.feedback ? (
                              <p>{obs.recomendaciones || obs.feedback}</p>
                            ) : (
                              <p className="text-danger">Sin feedback aún</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">
                    <p>No hay observaciones registradas para este paciente</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowPacienteObservaciones(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PsicologoSupervision;
