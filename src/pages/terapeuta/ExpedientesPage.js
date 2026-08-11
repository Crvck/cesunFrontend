import React, { useState, useEffect } from 'react';
import { FiSearch, FiFileText, FiCalendar, FiUser, FiPhone, FiMail, FiDownload, FiCheckCircle } from 'react-icons/fi';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import ApiService from '../../services/api';
import { createTherapistTour } from '../../utils/therapistTour';

const PsicologoExpedientes = () => {
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpediente, setSelectedExpediente] = useState(null);
  const [showDetalles, setShowDetalles] = useState(false);
  const [showModalPropuesta, setShowModalPropuesta] = useState(false);
  const [propuestaData, setPropuestaData] = useState({
    evaluacion_final: '',
    recomendaciones: ''
  });
  const [expediente, setExpediente] = useState(null);
  const [sesionesPaciente, setSesionesPaciente] = useState([]);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [showSesionModal, setShowSesionModal] = useState(false);
  const tour = createTherapistTour('expedientes');

  useEffect(() => {
    fetchExpedientes();
  }, []);

  const fetchExpedientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Obtener pacientes activos y luego mapear a una vista de expedientes básicos
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/pacientes/activos`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (!res.ok) {
        console.error('Error fetching pacientes activos:', res.status);
        setExpedientes([]);
        setLoading(false);
        return;
      }
      const json = await res.json().catch(() => ([]));
      const data = Array.isArray(json) ? json : (json.data || []);
      // Normalizar para mostrar información básica en la lista
      const lista = data.map(p => ({
        id: p.id,
        paciente_nombre: p.nombre_completo || `${p.nombre || ''} ${p.apellido || ''}`.trim(),
        edad: p.edad || null
      }));
      setExpedientes(lista);
    } catch (error) {
      console.error('Error al obtener expedientes:', error);
      setExpedientes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSesionesPaciente = async (pacienteId) => {
    try {
      const response = await ApiService.get(`/sesiones/paciente/${pacienteId}`);
      const sesiones = response?.data || [];
      setSesionesPaciente(sesiones);

      if (sesiones.length > 0) {
        const ultimaSesion = sesiones[sesiones.length - 1];
        setExpediente(prev => ({
          ...prev,
          totalSesiones: sesiones.length,
          ultimaSesion: {
            estado: ultimaSesion.estado,
            motivoCancelacion: ultimaSesion.motivo_cancelacion || null,
            observaciones: ultimaSesion.observaciones || null,
            tareasAsignadas: ultimaSesion.tareas_asignadas || null
          }
        }));
      }
    } catch (error) {
      console.error('Error cargando sesiones del paciente:', error);
    }
  };

  const filteredExpedientes = expedientes.filter(expediente =>
    (expediente.paciente_nombre && expediente.paciente_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (expediente.diagnostico && expediente.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const showExpedienteDetalles = async (item) => {
    try {
      setLoading(true);
      setSelectedExpediente(item);
      const response = await ApiService.get(`/expedientes/paciente/${item.id}/completo`);
      const expediente = response?.data || {};
      setExpediente(expediente);
      await fetchSesionesPaciente(item.id);
      setShowDetalles(true);
    } catch (error) {
      console.error('Error cargando detalles del expediente:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportarExpediente = (expediente) => {
    notifications.success(`Exportando expediente de ${expediente.paciente_nombre || expediente.nombre || ''}...`);
  };

  const guardarCambiosExpediente = async () => {
    try {
      notifications.info('Guardando cambios...');
      const token = localStorage.getItem('token');

      const pacienteId = selectedExpediente.paciente_id || selectedExpediente.id;
      console.log('🔧 Guardando expediente para paciente:', pacienteId);
      console.log('🔧 Datos a guardar:', { selectedExpediente });

      // Procesar medicamentos si es string JSON
      let medicamentos = editFormData.medicamentos;
      if (medicamentos && typeof medicamentos === 'string') {
        try {
          medicamentos = JSON.parse(medicamentos);
        } catch (e) {
          // Si no es JSON válido, mantener como string
        }
      }

      const dataToSave = {
        tratamiento_actual: editFormData.tratamiento_actual,
        medicamentos,
        alergias: editFormData.alergias,
        historia_personal: editFormData.historia_personal,
        historia_familiar: editFormData.historia_familiar,
        antecedentes_medicos: editFormData.antecedentes_medicos,
        antecedentes_psiquiatricos: editFormData.antecedentes_psiquiatricos,
        redes_apoyo: editFormData.redes_apoyo
      };

      console.log('🔧 URL:', `${process.env.REACT_APP_API_URL}/api/expedientes/paciente/${pacienteId}`);

      let res = await fetch(`${process.env.REACT_APP_API_URL}/api/expedientes/paciente/${pacienteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify(dataToSave)
      });

      // Si retorna 404, significa que no existe el expediente, lo creamos
      if (res.status === 404) {
        console.log('📝 Expediente no existe, creando...');
        res = await fetch(`${process.env.REACT_APP_API_URL}/api/expedientes/paciente/${pacienteId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
          body: JSON.stringify(dataToSave)
        });
      }

      if (!res.ok) {
        const jsonErr = await res.json().catch(() => ({}));
        console.error('❌ Error response:', jsonErr);
        notifications.error(jsonErr.message || 'Error guardando cambios');
        return;
      }

      notifications.success('Cambios guardados exitosamente');
      setEditMode(false);

      // Refrescar expediente
      showExpedienteDetalles(selectedExpediente);
    } catch (err) {
      console.error('Error guardando expediente:', err);
      notifications.error('Error guardando cambios');
    }
  };

  const abrirModalPropuesta = () => {
    setPropuestaData({
      evaluacion_final: '',
      recomendaciones: ''
    });
    setShowModalPropuesta(true);
  };

  const enviarPropuestaAlta = async () => {
    try {
      const token = localStorage.getItem('token');
      const pacienteId = selectedExpediente.paciente_id || selectedExpediente.id;

      const confirmado = await confirmations.warning(
        `¿Proponer a ${selectedExpediente.paciente_nombre} para alta terapéutica? ` +
        'El coordinador revisará tu propuesta y tomará la decisión final.'
      );

      if (!confirmado) return;

      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/altas/proponer/${pacienteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify(propuestaData)
      });

      if (!res.ok) {
        const jsonErr = await res.json().catch(() => ({}));
        notifications.error(jsonErr.message || 'Error al enviar propuesta');
        return;
      }

      notifications.success('Propuesta de alta enviada exitosamente. El coordinador la revisará pronto.');
      setShowModalPropuesta(false);
      setShowDetalles(false);
      setPropuestaData({ evaluacion_final: '', recomendaciones: '' });

    } catch (err) {
      console.error('Error enviando propuesta:', err);
      notifications.error('Error al enviar propuesta de alta');
    }
  };

  const renderUltimaSesion = () => {
    if (!expediente?.ultimaSesion) return null;

    const { estado, motivoCancelacion, observaciones, tareasAsignadas } = expediente.ultimaSesion;

    return (
      <div className="ultima-sesion">
        <h4>Última Sesión</h4>
        <p><strong>Estado:</strong> {estado}</p>
        {estado === 'cancelada' && motivoCancelacion && (
          <p><strong>Motivo de Cancelación:</strong> {motivoCancelacion}</p>
        )}
        {estado === 'completada' && (
          <>
            <p><strong>Observaciones:</strong> {observaciones}</p>
            <p><strong>Tareas Asignadas:</strong> {tareasAsignadas}</p>
          </>
        )}
      </div>
    );
  };

  const renderDetallesExpediente = () => {
    if (!expediente) return null;

    const totalSemanasAcompanamiento = expediente.totalSesiones || sesionesPaciente.length || 0;

    return (
      <div className="detalles-expediente">
        <h3>Detalles del Expediente</h3>
        <p><strong>Nombre del Paciente:</strong> {expediente.paciente_nombre}</p>
        <p><strong>Terapeuta asignado:</strong> {expediente.asignacion_actual?.Psicologo ? `${expediente.asignacion_actual.Psicologo.nombre} ${expediente.asignacion_actual.Psicologo.apellido}` : 'No asignado'}</p>
        <p><strong>Motivo de Consulta Especial:</strong> {expediente.motivo_consulta_especial || 'No aplica'}</p>
        <p><strong>Total de semanas de acompañamiento:</strong> {totalSemanasAcompanamiento}</p>
        <p><strong>Total de sesiones registradas:</strong> {sesionesPaciente.length || 0}</p>
        {renderUltimaSesion()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando expedientes...</div>
      </div>
    );
  }

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Expedientes Clínicos</h1>
          <p>Historial clínico completo de pacientes</p>
        </div>
        <button className="btn-secondary" onClick={() => tour.drive()}>
          Tour
        </button>
      </div>

      {/* Búsqueda */}
      <div className="search-box mb-20">
        <FiSearch />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar expediente por nombre o diagnóstico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de Expedientes */}
      <div className="grid-2 gap-20">
        {filteredExpedientes.map((expediente, index) => (
          <div key={`expediente-${expediente.id}-${index}`} className="card">
            <div className="flex-row align-center justify-between mb-10">
              <div className="flex-row align-center gap-10">
                <div className="avatar">
                  {expediente.paciente_nombre.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3>{expediente.paciente_nombre}</h3>
                  <p className="text-small">{expediente.edad} años</p>
                </div>
              </div>
              <button
                className="btn-text"
                onClick={() => exportarExpediente(expediente)}
                title="Exportar expediente"
              >
                <FiDownload />
              </button>
            </div>

            <div className="mb-10">
              <p className="text-small">Paciente activo</p>
            </div>

            <div className="flex-row gap-10">
              <button
                className="btn-primary flex-1"
                onClick={() => showExpedienteDetalles(expediente)}
              >
                <FiFileText /> Ver Expediente
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Detalles del Expediente */}
      {showDetalles && selectedExpediente && (
        <div className="modal-overlay">
          <div className="modal-container modal-large">
            <div className="modal-header">
              <h3>Expediente Clínico de {selectedExpediente.paciente_nombre}</h3>
              <button className="modal-close" onClick={() => setShowDetalles(false)}>×</button>
            </div>

            <div className="modal-content">
              {!editMode ? (
                <>
                  <div className="grid-2 gap-20">
                    <div>
                      <h4>Datos Generales</h4>
                      <div className="detail-row">
                        <strong>Paciente:</strong> {selectedExpediente.paciente_nombre}
                      </div>
                      <div className="detail-row">
                        <strong>Edad:</strong> {selectedExpediente.paciente?.edad || selectedExpediente.edad || 'No especificada'} años
                      </div>
                      <div className="detail-row">
                        <strong>Email:</strong> {selectedExpediente.paciente?.email || 'No registrado'}
                      </div>
                      <div className="detail-row">
                        <strong>Teléfono:</strong> {selectedExpediente.paciente?.telefono || 'No registrado'}
                      </div>
                      <div className="detail-row">
                        <strong>Motivo de consulta:</strong>
                        <div style={{ marginTop: '5px', padding: '8px', background: 'var(--blud)', borderRadius: '6px' }}>
                          {selectedExpediente.motivo_consulta || selectedExpediente.paciente?.motivo_consulta || 'No especificado'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4>Información Clínica</h4>
                      <div className="detail-row">
                        <strong>Diagnóstico presuntivo:</strong> {selectedExpediente.diagnostico_presuntivo || 'Sin diagnóstico'}
                      </div>
                      <div className="detail-row">
                        <strong>Diagnóstico definitivo:</strong> {selectedExpediente.diagnostico_definitivo || 'Pendiente'}
                      </div>
                      <div className="detail-row">
                        <strong>Antecedentes médicos:</strong>
                        <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                          {selectedExpediente.antecedentes_medicos || 'No registrados'}
                        </div>
                      </div>
                      <div className="detail-row">
                        <strong>Antecedentes psiquiátricos:</strong>
                        <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                          {selectedExpediente.antecedentes_psiquiatricos || 'No registrados'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-20">
                    <h4>Tratamiento</h4>
                    <div className="detail-row">
                      <strong>Tratamiento actual:</strong>
                      <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                        {selectedExpediente.tratamiento_actual || 'Sin tratamiento registrado'}
                      </div>
                    </div>
                    <div className="detail-row">
                      <strong>Medicamentos:</strong>
                      <div style={{ marginTop: '5px' }}>
                        {selectedExpediente.medicamentos ? (
                          typeof selectedExpediente.medicamentos === 'string'
                            ? selectedExpediente.medicamentos
                            : JSON.stringify(selectedExpediente.medicamentos, null, 2)
                        ) : 'Sin medicamentos registrados'}
                      </div>
                    </div>
                    <div className="detail-row">
                      <strong>Alergias:</strong> {selectedExpediente.alergias || 'No registradas'}
                    </div>
                  </div>

                  <div className="mt-20">
                    <h4>Evolución y Seguimiento</h4>
                    <div className="detail-row">
                      <strong>Sesiones totales:</strong> {selectedExpediente.sesiones_totales || 0}
                    </div>
                    <div className="detail-row">
                      <strong>Última sesión:</strong> {selectedExpediente.ultima_evaluacion ? new Date(selectedExpediente.ultima_evaluacion).toLocaleDateString() : 'Sin registro'}
                    </div>
                    <div className="detail-row">
                      <strong>Historia personal:</strong>
                      <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                        {selectedExpediente.historia_personal || 'No registrada'}
                      </div>
                    </div>
                    <div className="detail-row">
                      <strong>Historia familiar:</strong>
                      <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                        {selectedExpediente.historia_familiar || 'No registrada'}
                      </div>
                    </div>
                    <div className="detail-row">
                      <strong>Redes de apoyo:</strong>
                      <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                        {selectedExpediente.redes_apoyo || 'No registradas'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-20">
                    <h4>Expedientes por Sesión</h4>
                    {sesionesPaciente.length > 0 ? (
                      <div className="card" style={{ padding: '10px' }}>
                        {sesionesPaciente.map((s) => (
                          <div
                            key={s.id}
                            className="flex-row align-center justify-between"
                            style={{ padding: '10px 6px', borderBottom: '1px solid #eee' }}
                          >
                            <div>
                              <strong>{s.fecha ? new Date(s.fecha).toLocaleDateString() : 'Sesión'}</strong>
                              <div className="text-small">
                                {s.hora ? s.hora : ''} {s.tipo_consulta ? `• ${s.tipo_consulta}` : ''}
                              </div>
                              <div className="text-small">
                                {s.Cita?.numero_sesion && s.Cita?.total_sesiones
                                  ? `Sesión ${s.Cita.numero_sesion} de ${s.Cita.total_sesiones}`
                                  : (s.Cita?.total_sesiones ? `Total de acompañamiento: ${s.Cita.total_sesiones} semanas` : '')}
                              </div>
                              <div className="text-small">Estado: {s.estado || 'Sin estado'}</div>
                            </div>
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setSelectedSesion(s);
                                setShowSesionModal(true);
                              }}
                            >
                              <FiFileText /> Ver expediente
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-small">No hay sesiones registradas en este expediente.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Tratamiento actual</label>
                    <textarea
                      value={editFormData.tratamiento_actual}
                      onChange={(e) => setEditFormData({ ...editFormData, tratamiento_actual: e.target.value })}
                      className="textarea-field"
                      rows="3"
                      placeholder="Descripción del tratamiento actual..."
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Medicamentos</label>
                    <textarea
                      value={editFormData.medicamentos}
                      onChange={(e) => setEditFormData({ ...editFormData, medicamentos: e.target.value })}
                      className="textarea-field"
                      rows="3"
                      placeholder="Medicamentos y dosis (JSON o texto plano)"
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Alergias</label>
                    <textarea
                      value={editFormData.alergias}
                      onChange={(e) => setEditFormData({ ...editFormData, alergias: e.target.value })}
                      className="textarea-field"
                      rows="2"
                      placeholder="Alergias registradas..."
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Historia personal</label>
                    <textarea
                      value={editFormData.historia_personal}
                      onChange={(e) => setEditFormData({ ...editFormData, historia_personal: e.target.value })}
                      className="textarea-field"
                      rows="3"
                      placeholder="Historia personal del paciente..."
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Historia familiar</label>
                    <textarea
                      value={editFormData.historia_familiar}
                      onChange={(e) => setEditFormData({ ...editFormData, historia_familiar: e.target.value })}
                      className="textarea-field"
                      rows="3"
                      placeholder="Historia familiar relevante..."
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Antecedentes médicos</label>
                    <textarea
                      value={editFormData.antecedentes_medicos}
                      onChange={(e) => setEditFormData({ ...editFormData, antecedentes_medicos: e.target.value })}
                      className="textarea-field"
                      rows="3"
                      placeholder="Antecedentes médicos relevantes..."
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Antecedentes psiquiátricos</label>
                    <textarea
                      value={editFormData.antecedentes_psiquiatricos}
                      onChange={(e) => setEditFormData({ ...editFormData, antecedentes_psiquiatricos: e.target.value })}
                      className="textarea-field"
                      rows="3"
                      placeholder="Antecedentes psiquiátricos..."
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Redes de apoyo</label>
                    <textarea
                      value={editFormData.redes_apoyo}
                      onChange={(e) => setEditFormData({ ...editFormData, redes_apoyo: e.target.value })}
                      className="textarea-field"
                      rows="2"
                      placeholder="Redes de apoyo disponibles para el paciente..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!editMode ? (
                <>
                  <button className="btn-secondary" onClick={() => setShowDetalles(false)}>
                    Cerrar
                  </button>
                  <button className="btn-warning" onClick={() => exportarExpediente(selectedExpediente)}>
                    <FiDownload /> Exportar
                  </button>
                  <button className="btn-success" onClick={abrirModalPropuesta}>
                    <FiCheckCircle /> Proponer para Alta
                  </button>
                  <button className="btn-primary" onClick={() => setEditMode(true)}>
                    Editar
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-danger" onClick={() => setEditMode(false)}>
                    Cancelar
                  </button>
                  <button className="btn-primary" onClick={guardarCambiosExpediente}>
                    Guardar cambios
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Propuesta de Alta */}
      {showModalPropuesta && selectedExpediente && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Proponer Alta para {selectedExpediente.paciente_nombre}</h3>
              <button className="modal-close" onClick={() => setShowModalPropuesta(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="alert-message info mb-20">
                <strong>Nota:</strong> Al proponer este paciente para alta, el coordinador revisará
                tu evaluación y tomará la decisión final.
              </div>

              <div className="form-group mb-15">
                <label>Evaluación Final *</label>
                <select
                  value={propuestaData.evaluacion_final}
                  onChange={(e) => setPropuestaData({ ...propuestaData, evaluacion_final: e.target.value })}
                  className="select-field"
                  required
                >
                  <option value="">Seleccionar evaluación</option>
                  <option value="excelente">Excelente - Alta recuperación</option>
                  <option value="buena">Buena - Progreso significativo</option>
                  <option value="regular">Regular - Progreso moderado</option>
                  <option value="mala">Mala - Progreso limitado</option>
                </select>
              </div>

              <div className="form-group">
                <label>Recomendaciones para el seguimiento</label>
                <textarea
                  value={propuestaData.recomendaciones}
                  onChange={(e) => setPropuestaData({ ...propuestaData, recomendaciones: e.target.value })}
                  className="textarea-field"
                  rows="5"
                  placeholder="Escribe tus recomendaciones, observaciones o seguimiento sugerido..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowModalPropuesta(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={enviarPropuestaAlta}
                disabled={!propuestaData.evaluacion_final}
              >
                <FiCheckCircle /> Enviar Propuesta
              </button>
            </div>
          </div>
        </div>
      )}

      {showSesionModal && selectedSesion && (
        <div className="modal-overlay">
          <div className="modal-container modal-medium">
            <div className="modal-header">
              <h3>Expediente de Sesión</h3>
              <button className="modal-close" onClick={() => setShowSesionModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="detail-row">
                <strong>Fecha:</strong> {selectedSesion.fecha ? new Date(selectedSesion.fecha).toLocaleDateString() : 'Sin fecha'}
              </div>
              <div className="detail-row">
                <strong>Hora:</strong> {selectedSesion.hora || 'Sin hora'}
              </div>
              <div className="detail-row">
                <strong>Acompañamiento:</strong>{' '}
                {selectedSesion.Cita?.numero_sesion && selectedSesion.Cita?.total_sesiones
                  ? `Sesión ${selectedSesion.Cita.numero_sesion} de ${selectedSesion.Cita.total_sesiones}`
                  : (selectedSesion.Cita?.total_sesiones ? `${selectedSesion.Cita.total_sesiones} semanas` : 'No especificado')}
              </div>
              <div className="detail-row">
                <strong>Tipo:</strong> {selectedSesion.tipo_consulta || 'No especificado'}
              </div>
              <div className="detail-row">
                <strong>Motivo de Consulta Especial:</strong> {selectedExpediente?.motivo_consulta_especial || 'No aplica'}
              </div>
              <div className="detail-row">
                <strong>Terapeuta:</strong> {selectedSesion.terapeuta_nombre || selectedSesion.psicologo_nombre || 'No especificado'}
              </div>
              <div className="detail-row">
                <strong>Coterapeuta:</strong> {selectedSesion.coterapeuta_nombre || selectedSesion.becario_nombre || 'No asignado'}
              </div>
              <div className="detail-row">
                <strong>Desarrollo:</strong>
                <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                  {selectedSesion.desarrollo || 'Sin registro'}
                </div>
              </div>
              {selectedSesion.conclusion && (
                <div className="detail-row">
                  <strong>Conclusión:</strong>
                  <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                    {selectedSesion.conclusion}
                  </div>
                </div>
              )}
              {selectedSesion.tareas_asignadas && (
                <div className="detail-row">
                  <strong>Tareas asignadas:</strong>
                  <div style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                    {selectedSesion.tareas_asignadas}
                  </div>
                </div>
              )}
              {selectedSesion.siguiente_cita && (
                <div className="detail-row">
                  <strong>Próxima cita:</strong> {selectedSesion.siguiente_cita}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSesionModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PsicologoExpedientes;