import React, { useState, useEffect } from 'react';
import { FiFileText, FiPlus, FiEdit2, FiTrash2, FiCalendar, FiUser, FiSave, FiClock } from 'react-icons/fi';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';

const BecarioObservaciones = () => {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    paciente_id: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fin: '',
    motivo_consulta: '',
    contenido_sesion: '',
    observaciones: '',
    tareas_asignadas: ''
  });
  const [citasPaciente, setCitasPaciente] = useState([]);
  const [selectedCitaId, setSelectedCitaId] = useState('');
  const [pacientes, setPacientes] = useState([]);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [showSesionModal, setShowSesionModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      // Obtener pacientes activos
      const resPacientes = await fetch(`${apiUrl}/api/pacientes/activos`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!resPacientes.ok) {
        console.error('Error fetching pacientes');
        setPacientes([]);
      } else {
        const json = await resPacientes.json();
        const data = Array.isArray(json) ? json : (json.data || []);
        const normalized = data.map(p => ({
          id: p.id,
          nombre: p.nombre || '',
          apellido: p.apellido || '',
          nombre_completo: p.nombre_completo || `${p.nombre || ''} ${p.apellido || ''}`.trim()
        }));
        setPacientes(normalized);
      }

      // Obtener sesiones recientes (para becarios, muestra últimas registradas)
      const resSesiones = await fetch(`${apiUrl}/api/sesiones/recientes?limit=50`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!resSesiones.ok) {
        console.error('Error fetching sesiones');
        setSesiones([]);
      } else {
        const json = await resSesiones.json();
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
          tareas_asignadas: s.tareas_asignadas || ''
        }));
        setSesiones(normalized);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Calcular hora fin agregando 50 minutos a hora inicio
  const calcularHoraFin = (horaInicio, duracionMin = 50) => {
    if (!horaInicio) return '';
    const [h, m] = horaInicio.split(':').map(n => parseInt(n, 10));
    const total = h * 60 + m + duracionMin;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  };

  // Cargar citas del paciente seleccionado
  const fetchCitasPaciente = async (pacienteId) => {
    try {
      if (!pacienteId) { setCitasPaciente([]); return; }
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/citas/paciente/${pacienteId}`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) { setCitasPaciente([]); return; }
      const json = await res.json().catch(() => ({ data: [] }));
      const citas = Array.isArray(json) ? json : (json.data || []);
      setCitasPaciente(citas);
    } catch (err) {
      console.warn('Error obteniendo citas del paciente:', err);
      setCitasPaciente([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      notifications.info('Registrando sesión...');
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;
      if (!formData.paciente_id || !selectedCitaId) {
        notifications.error('Selecciona el paciente y una cita programada');
        return;
      }

      // Registrar sesión con observaciones
      const sesionBody = {
        cita_id: selectedCitaId,
        desarrollo: formData.contenido_sesion,
        conclusion: formData.observaciones,
        tareas_asignadas: formData.tareas_asignadas,
        emocion_predominante: '',
        riesgo_suicida: 'ninguno',
        escalas_aplicadas: null,
        privado: false
      };

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

      setSesiones([nueva, ...sesiones]);
      setShowForm(false);
      resetForm();
      notifications.success('Sesión registrada exitosamente');

    } catch (err) {
      console.error('Error registrando sesión:', err);
      notifications.error('Error registrando sesión');
    }
  };

  const resetForm = () => {
    setFormData({
      paciente_id: '',
      fecha: new Date().toISOString().split('T')[0],
      hora_inicio: '',
      hora_fin: '',
      motivo_consulta: '',
      contenido_sesion: '',
      observaciones: '',
      tareas_asignadas: ''
    });
    setSelectedCitaId('');
    setCitasPaciente([]);
  };

  const openSesionModal = (sesion) => {
    setSelectedSesion(sesion);
    setShowSesionModal(true);
  };

  const closeSesionModal = () => {
    setSelectedSesion(null);
    setShowSesionModal(false);
  };

  const handleDelete = async (id) => {
    const confirmado = await confirmations.danger('¿Estás seguro de eliminar esta sesión?');
    
    if (confirmado) {
      setSesiones(sesiones.filter(s => s.id !== id));
      // Aquí podrías llamar a la API para eliminar
    }
  };
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Sesiones y Observaciones</h1>
          <p>Registro de sesiones terapéuticas y observaciones para supervisión</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(true)}
        >
          <FiPlus /> Nueva Sesión
        </button>
      </div>

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
                  onChange={(e) => { handleInputChange(e); fetchCitasPaciente(e.target.value); setSelectedCitaId(''); }}
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
                <label>Cita programada</label>
                <select
                  value={selectedCitaId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedCitaId(cid);
                    const cita = citasPaciente.find(c => String(c.id) === String(cid));
                    if (cita) {
                      const fechaISO = typeof cita.fecha === 'string' ? cita.fecha.split('T')[0] : new Date(cita.fecha).toISOString().split('T')[0];
                      const horaInicio = cita.hora || cita.hora_inicio || '';
                      setFormData(prev => ({
                        ...prev,
                        fecha: fechaISO,
                        hora_inicio: horaInicio,
                        hora_fin: calcularHoraFin(horaInicio)
                      }));
                    }
                  }}
                  className="select-field"
                  required
                  disabled={!formData.paciente_id}
                >
                  <option value="">Seleccionar cita</option>
                  {citasPaciente.map(c => (
                    <option key={c.id} value={c.id}>
                      {`${(c.fecha || '').toString().split('T')[0]} ${c.hora || c.hora_inicio || ''} (${c.estado})`}
                    </option>
                  ))}
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
                  disabled
                />
              </div>
              
              <div className="form-group">
                <label>Hora inicio</label>
                <input
                  type="time"
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={(e) => {
                    handleInputChange(e);
                    const nuevaFin = calcularHoraFin(e.target.value);
                    setFormData(prev => ({ ...prev, hora_fin: nuevaFin }));
                  }}
                  className="input-field"
                  required
                  disabled
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
                  disabled
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
              
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Observaciones generales</label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  className="textarea-field"
                  rows="3"
                  placeholder="Observaciones relevantes..."
                />
              </div>
              
              <div className="form-group">
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
              <button type="submit" className="btn-primary">
                <FiSave /> Guardar Sesión
              </button>
              <button 
                type="button" 
                className="btn-danger"
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

      {/* Lista de Sesiones */}
      <div className="config-content">
        <h3>Sesiones Registradas</h3>
        
        {sesiones.length > 0 ? (
          <div className="sesiones-list">
            {sesiones.map((sesion) => (
              <div key={sesion.id} className="session-row" onClick={() => openSesionModal(sesion)}>
                <div className="flex-row align-center gap-10">
                  <FiCalendar />
                  <span>{new Date(sesion.fecha).toLocaleDateString()}</span>
                </div>
                <div className="flex-row align-center gap-10">
                  <FiUser />
                  <span>{sesion.paciente_nombre}</span>
                </div>
                <div className="flex-row align-center gap-10">
                  <FiClock />
                  <span>{sesion.hora_inicio} - {sesion.hora_fin}</span>
                </div>
                <div className="flex-row gap-5">
                  <button className="btn-text text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(sesion.id); }}>
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-citas">
            <div className="no-citas-icon">📋</div>
            <div>No hay sesiones registradas</div>
            <p className="text-small mt-10">
              Registra las sesiones terapéuticas con observaciones para supervisión.
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
              <h3 className="modal-title">Detalles de la Sesión</h3>
              <button className="modal-close" onClick={closeSesionModal}>×</button>
            </div>

            <div className="modal-content">
              <div className="grid-2 gap-20">
                <div>
                  <h4>Información</h4>
                  <div className="detail-row"><strong>Paciente:</strong> {selectedSesion.paciente_nombre}</div>
                  <div className="detail-row"><strong>Fecha:</strong> {selectedSesion.fecha ? new Date(selectedSesion.fecha).toLocaleDateString() : '—'}</div>
                  <div className="detail-row"><strong>Hora:</strong> {selectedSesion.hora_inicio || ''}{selectedSesion.hora_fin ? ` - ${selectedSesion.hora_fin}` : ''}</div>
                  <div className="detail-row"><strong>Motivo:</strong> {selectedSesion.motivo_consulta || '—'}</div>
                </div>

                
              </div>

              <div className="mt-10">
                <h4>Contenido de la sesión</h4>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedSesion.contenido_sesion || '—'}</p>

                <h4 className="mt-10">Observaciones</h4>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedSesion.observaciones || '—'}</p>

                

                <h4 className="mt-10">Tareas asignadas</h4>
                <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{selectedSesion.tareas_asignadas || '—'}</p>
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

export default BecarioObservaciones;