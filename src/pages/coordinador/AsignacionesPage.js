import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiUserPlus, FiCheckCircle, FiXCircle,
  FiRefreshCw, FiSearch, FiFilter, FiEdit2
} from 'react-icons/fi';
import './coordinador.css';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { createCoordinatorTour } from '../../utils/coordinatorTour';

const CoordinadorAsignaciones = () => {
  const [becarios, setBecarios] = useState([]);
  const [psicologos, setPsicologos] = useState([]);
  const [pacientesSinAsignar, setPacientesSinAsignar] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBecario, setSelectedBecario] = useState(null);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [selectedPsicologo, setSelectedPsicologo] = useState(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [becarioQuery, setBecarioQuery] = useState('');
  const [psicologoQuery, setPsicologoQuery] = useState('');
  const [listaPacienteQuery, setListaPacienteQuery] = useState('');
  const [listaPsicologoQuery, setListaPsicologoQuery] = useState('');
  const [tour] = useState(() => createCoordinatorTour('asignaciones'));
  const [showPatientList, setShowPatientList] = useState(false);
  const [showBecarioList, setShowBecarioList] = useState(false);
  const [showPsicologoList, setShowPsicologoList] = useState(false);

  useEffect(() => {
    if (showModal) {
      if (selectedPaciente) setPatientQuery(selectedPaciente.nombre || '');
      if (selectedBecario) setBecarioQuery(selectedBecario.nombre || '');
      if (selectedPsicologo) setPsicologoQuery(selectedPsicologo.nombre || '');
    } else {
      setShowPatientList(false);
      setShowBecarioList(false);
      setShowPsicologoList(false);
    }
  }, [showModal]);

  useEffect(() => {
    fetchData();
  }, []);

  // Escuchar evento global cuando se crea un paciente para refrescar listas
  useEffect(() => {
    const onPacienteCreado = (e) => {
      // opcional: podríamos usar e.detail si necesitamos datos del paciente
      fetchData();
    };

    window.addEventListener('pacienteCreado', onPacienteCreado);
    return () => window.removeEventListener('pacienteCreado', onPacienteCreado);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;

      // Fetch coterapeutas (normalizar campos para UI)
      const resBec = await fetch(`${apiUrl}/api/users?rol=coterapeuta`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const becariosData = await resBec.json();
      // Asegurar valores por defecto para evitar que aparezcan como "Inactivo" si campo faltante
      const normalizedBecarios = (becariosData || []).map(b => ({
        ...b,
        activo: typeof b.activo === 'boolean' ? b.activo : true,
        pacientes_asignados: typeof b.pacientes_asignados === 'number' ? b.pacientes_asignados : (b.pacientes_asignados || 0),
        capacidad: typeof b.capacidad === 'number' ? b.capacidad : (b.capacidad || null)
      }));
      setBecarios(normalizedBecarios);

      // Fetch terapeutas
      const resUsers = await fetch(`${apiUrl}/api/users?rol=terapeuta`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const usersData = await resUsers.json();
      const psicologosList = (usersData || []).filter(u => u.rol === 'terapeuta');
      setPsicologos(psicologosList);

      // Fetch pacientes sin asignar
      const resPacSin = await fetch(`${apiUrl}/api/pacientes/sin-asignar`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const pacSinJson = await resPacSin.json();
      const pacSinData = Array.isArray(pacSinJson) ? pacSinJson : (pacSinJson.data || []);
      setPacientesSinAsignar(pacSinData.map(p => ({
        id: p.id,
        nombre: `${p.nombre} ${p.apellido}`,
        email: p.email || '',
        motivo: p.motivo_consulta || '',
        fecha_ingreso: p.fecha_ingreso
      })));

      // Fetch asignaciones activas
      const resAsig = await fetch(`${apiUrl}/api/asignaciones`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const asigJson = await resAsig.json();
      const asigData = Array.isArray(asigJson) ? asigJson : (asigJson.data || []);
      setAsignaciones(asigData.map(a => ({
        id: a.id,
        paciente: a.Paciente ? `${a.Paciente.nombre} ${a.Paciente.apellido}` : (a.paciente || ''),
        coterapeuta: a.Coterapeuta ? `${a.Coterapeuta.nombre} ${a.Coterapeuta.apellido}` : (a.Becario ? `${a.Becario.nombre} ${a.Becario.apellido}` : (a.becario || '')),
        terapeuta: a.Terapeuta ? `${a.Terapeuta.nombre} ${a.Terapeuta.apellido}` : (a.Psicologo ? `${a.Psicologo.nombre} ${a.Psicologo.apellido}` : (a.psicologo || '')),
        fecha_asignacion: a.fecha_inicio || a.created_at,
        estado: a.estado
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error cargando asignaciones:', error);
      setLoading(false);
    }
  };

  const handleAsignarPaciente = async () => {
    const matchPaciente = (!selectedPaciente && patientQuery)
      ? pacientesSinAsignar.find(p => (p.nombre || '').toLowerCase() === patientQuery.trim().toLowerCase())
      : null;
    const matchPsicologo = (!selectedPsicologo && psicologoQuery)
      ? psicologos.find(p => (p.nombre || '').toLowerCase() === psicologoQuery.trim().toLowerCase())
      : null;

    const resolvedPaciente = selectedPaciente || matchPaciente;
    const resolvedPsicologo = selectedPsicologo || matchPsicologo;

    if (matchPaciente) setSelectedPaciente(matchPaciente);
    if (matchPsicologo) setSelectedPsicologo(matchPsicologo);

    if (!resolvedPaciente || !resolvedPsicologo) {
      notifications.error('Seleccione paciente y terapeuta');
      return;
    }

    try {
      setAssigning(true);
      const token = localStorage.getItem('token');
      const body = {
        paciente_id: resolvedPaciente.id,
        terapeuta_id: resolvedPsicologo.id,
        coterapeuta_id: selectedBecario ? selectedBecario.id : null,
        notas: assignNotes
      };

      const apiUrl = process.env.REACT_APP_API_URL;
      const res = await fetch(`${apiUrl}/api/asignaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' },
        body: JSON.stringify(body)
      });

      const json = await res.json();
      console.log('AsignarPaciente response:', res.status, json);
      if (!res.ok) {
        notifications.error(json.message || 'Error creando asignación');
        setAssigning(false);
        return;
      }

      notifications.success('Asignación creada exitosamente');

      // Emitir evento global para que otras vistas (p. ej. PacientesPage) actualicen la UI inmediatamente
      try {
        const terapeutaName = (json && json.data && (json.data.Terapeuta || json.data.Psicologo)) ? `${(json.data.Terapeuta || json.data.Psicologo).nombre} ${(json.data.Terapeuta || json.data.Psicologo).apellido || ''}`.trim() : (selectedPsicologo ? `${selectedPsicologo.nombre} ${selectedPsicologo.apellido || ''}`.trim() : null);
        const coterapeutaName = (json && json.data && (json.data.Coterapeuta || json.data.Becario)) ? `${(json.data.Coterapeuta || json.data.Becario).nombre} ${(json.data.Coterapeuta || json.data.Becario).apellido || ''}`.trim() : (selectedBecario ? `${selectedBecario.nombre} ${selectedBecario.apellido || ''}`.trim() : null);
        const payload = {
          paciente_id: selectedPaciente?.id,
          terapeuta: terapeutaName,
          coterapeuta: coterapeutaName,
          asignacion: json && json.data ? json.data : null
        };
        console.log('Emitiendo evento asignacionCreada con payload:', payload);
        window.dispatchEvent(new CustomEvent('asignacionCreada', { detail: payload }));
      } catch (e) {
        console.warn('No se pudo emitir evento asignacionCreada:', e);
      }

      // Añadido: manejar la estructura { success, message, data } que retorna el backend
      // Si el backend devuelve la asignación completa, usarla para actualizar UI optimista

      // Actualizar UI localmente (optimista) usando la respuesta del servidor
      if (json && json.data && json.data.id) {
        const asignData = json.data;
        const newAsignacion = {
          id: asignData.id,
          paciente: asignData.Paciente ? `${asignData.Paciente.nombre} ${asignData.Paciente.apellido}` : (selectedPaciente ? selectedPaciente.nombre : ''),
          coterapeuta: asignData.Coterapeuta ? `${asignData.Coterapeuta.nombre} ${asignData.Coterapeuta.apellido}` : (asignData.Becario ? `${asignData.Becario.nombre} ${asignData.Becario.apellido}` : (selectedBecario ? selectedBecario.nombre : '')),
          terapeuta: asignData.Terapeuta ? `${asignData.Terapeuta.nombre} ${asignData.Terapeuta.apellido}` : (asignData.Psicologo ? `${asignData.Psicologo.nombre} ${asignData.Psicologo.apellido}` : (selectedPsicologo ? selectedPsicologo.nombre : '')),
          fecha_asignacion: asignData.fecha_inicio || asignData.created_at || new Date().toISOString(),
          estado: asignData.estado || 'activa'
        };

        setAsignaciones(prev => [newAsignacion, ...prev]);
        setPacientesSinAsignar(prev => prev.filter(p => p.id !== selectedPaciente?.id));

        if (selectedBecario) {
          setBecarios(prev => prev.map(b => b.id === selectedBecario.id ? { ...b, pacientes_asignados: (b.pacientes_asignados || 0) + 1 } : b));
        }
      } else {
        // Si no vino la estructura esperada, reintentar un fetch para sincronizar
        await fetchData();
      }

      setShowModal(false);
      setSelectedPaciente(null);
      setSelectedBecario(null);
      setSelectedPsicologo(null);
      setAssignNotes('');

      // Hacer un refresco en background (no bloqueante) para asegurar consistencia
      fetchData().catch(err => console.warn('Refresco posterior falló:', err));
    } catch (error) {
      console.error('Error al asignar paciente:', error);
      notifications.error('Error al asignar paciente');
    } finally {
      setAssigning(false);
    }
  };

  const handleReasignar = (asignacionId, nuevoBecarioId) => {
    // Lógica para reasignar (por ahora simple placeholder)
    notifications.success(`Paciente reasignado exitosamente`);
  };

  const handleFinalizarAsignacion = async (asignacionId) => {
    try {
      const confirmado = await confirmations.warning('¿Estás seguro de finalizar esta asignación?');

      if (confirmado) {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL;
        const res = await fetch(`${apiUrl}/api/asignaciones/${asignacionId}/finalizar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }
        });

        const json = await res.json();
        if (!res.ok) {
          notifications.error(json.message || 'Error finalizando asignación');
          return;
        }

        notifications.success('Asignación finalizada exitosamente');
        await fetchData();
      }
    } catch (error) {
      console.error('Error al finalizar asignación:', error);
      notifications.error('No se pudo finalizar la asignación');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando asignaciones...</div>
      </div>
    );
  }

  const LIST_LIMIT = 6;
  const PACIENTES_LIMIT = 8;

  const listaPacienteQueryLower = listaPacienteQuery.trim().toLowerCase();
  const listaPsicologoQueryLower = listaPsicologoQuery.trim().toLowerCase();

  const filteredPacientesSinAsignar = listaPacienteQueryLower
    ? pacientesSinAsignar.filter(p => (
      (p.nombre || '').toLowerCase().includes(listaPacienteQueryLower) ||
      (p.email || '').toLowerCase().includes(listaPacienteQueryLower)
    ))
    : pacientesSinAsignar;

  const filteredPsicologosList = listaPsicologoQueryLower
    ? psicologos.filter(p => (
      `${p.nombre || ''} ${p.apellido || ''}`.toLowerCase().includes(listaPsicologoQueryLower) ||
      (p.especialidad || '').toLowerCase().includes(listaPsicologoQueryLower) ||
      (p.email || '').toLowerCase().includes(listaPsicologoQueryLower)
    ))
    : psicologos;

  const visiblePacientesSinAsignar = filteredPacientesSinAsignar.slice(0, PACIENTES_LIMIT);
  const visiblePsicologos = filteredPsicologosList.slice(0, LIST_LIMIT);

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Asignaciones</h1>
          <p>Asignación de pacientes a terapeutas</p>
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

      {/* Estadísticas Rápidas */}
      <div className="grid-3 mb-30">
        <div className="card">
          <h4>Terapeutas Activos</h4>
          <div className="stat-value">{psicologos.filter(p => p.activo).length}</div>
          <div className="text-small">de {psicologos.length} total</div>
        </div>

        <div className="card">
          <h4>Pacientes Sin Asignar</h4>
          <div className="stat-value">{pacientesSinAsignar.length}</div>
          <div className="text-small">esperando asignación</div>
        </div>

        <div className="card">
          <h4>Asignaciones Activas</h4>
          <div className="stat-value">{asignaciones.filter(a => a.estado === 'activa').length}</div>
          <div className="text-small">en curso</div>
        </div>
      </div>

      {/* Terapeutas Disponibles */}
      <div className="dashboard-section mb-20">
        <div className="section-header">
          <h3>Terapeutas Disponibles</h3>
          <div className="flex-row gap-10" style={{ alignItems: 'center' }}>
            <div className="search-box" style={{ minWidth: '260px' }}>
              <FiSearch />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar terapeuta por nombre o correo..."
                value={listaPsicologoQuery}
                onChange={(e) => setListaPsicologoQuery(e.target.value)}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowModal(true)}
            >
              <FiUserPlus /> Asignar Paciente
            </button>
          </div>
        </div>

        <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '10px' }}>
          Mostrando {visiblePsicologos.length} de {filteredPsicologosList.length} terapeutas
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Terapeuta</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visiblePsicologos.map((psicologo) => (
                <tr key={psicologo.id}>
                  <td>
                    <div className="flex-row align-center gap-10">
                      <div className="avatar-small">
                        {(psicologo.nombre || '').split(' ').map(n => n[0]).join('')}
                      </div>
                      <span>{psicologo.nombre}</span>
                    </div>
                  </td>
                  <td>{psicologo.especialidad || ''}</td>
                  <td>
                    {psicologo.activo ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Inactivo</span>
                    )}
                  </td>
                  <td>
                    {psicologo.activo ? (
                      <button
                        className="btn-text"
                        onClick={() => { setSelectedPsicologo(psicologo); setShowModal(true); }}
                      >
                        Asignar paciente
                      </button>
                    ) : (
                      <span className="text-small">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pacientes Sin Asignar */}
      <div className="dashboard-section mb-20">
        <div className="section-header">
          <h3>Pacientes Sin Asignar ({pacientesSinAsignar.length})</h3>
          <div className="flex-row gap-10" style={{ alignItems: 'center' }}>
            <div className="search-box" style={{ minWidth: '260px' }}>
              <FiSearch />
              <input
                type="text"
                className="search-input"
                placeholder="Buscar paciente por nombre o correo..."
                value={listaPacienteQuery}
                onChange={(e) => setListaPacienteQuery(e.target.value)}
              />
            </div>
            <span className="text-small" style={{ color: 'var(--gray)' }}>
              Mostrando {visiblePacientesSinAsignar.length} de {filteredPacientesSinAsignar.length}
            </span>
          </div>
        </div>

        {filteredPacientesSinAsignar.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Motivo</th>
                  <th>Fecha Ingreso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visiblePacientesSinAsignar.map((paciente) => (
                  <tr key={paciente.id}>
                    <td>
                      <div className="flex-row align-center gap-10">
                        <div className="avatar-small">
                          {paciente.nombre.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span>{paciente.nombre}</span>
                      </div>
                    </td>
                    <td>
                      <span className="diagnostico-tag">{paciente.motivo}</span>
                    </td>
                    <td>{new Date(paciente.fecha_ingreso).toLocaleDateString()}</td>
                    <td>
                      <div className="flex-row gap-5">
                        <button
                          className="btn-text"
                          onClick={() => {
                            setSelectedPaciente(paciente);
                            setShowModal(true);
                          }}
                        >
                          Asignar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-citas">
            <div className="no-citas-icon">✅</div>
            <div>Todos los pacientes están asignados</div>
          </div>
        )}
      </div>

      {/* Asignaciones Activas */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Asignaciones Activas</h3>
          <div className="flex-row gap-10">
            <select className="select-field" style={{ width: '150px' }}>
              <option value="">Todas las asignaciones</option>
              <option value="activa">Activas</option>
              <option value="finalizada">Finalizadas</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Coterapeuta</th>
                <th>Terapeuta Supervisor</th>
                <th>Fecha Asignación</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((asignacion) => (
                <tr key={asignacion.id}>
                  <td>{asignacion.paciente}</td>
                  <td>
                    <div className="flex-row align-center gap-10">
                      <div className="avatar-small">
                        {asignacion.coterapeuta.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span>{asignacion.coterapeuta}</span>
                    </div>
                  </td>
                  <td>{asignacion.terapeuta}</td>
                  <td>{new Date(asignacion.fecha_asignacion).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${asignacion.estado === 'activa' ? 'badge-success' : 'badge-primary'}`}>
                      {asignacion.estado}
                    </span>
                  </td>
                  <td>
                    <div className="flex-row gap-5">
                      <button
                        className="btn-text"
                        onClick={() => handleReasignar(asignacion.id, 1)}
                      >
                        <FiEdit2 /> Reasignar
                      </button>
                      {asignacion.estado === 'activa' && (
                        <button
                          className="btn-text text-danger"
                          onClick={() => handleFinalizarAsignacion(asignacion.id)}
                        >
                          <FiXCircle /> Finalizar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Asignación */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container modal-large assign-modal">
            <div className="modal-header">
              <h3>Asignar Paciente</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="form-grid">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Seleccionar Paciente</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Buscar paciente..."
                    value={patientQuery}
                    onChange={(e) => { setPatientQuery(e.target.value); setShowPatientList(true); }}
                    onFocus={() => setShowPatientList(true)}
                    onBlur={() => setTimeout(() => setShowPatientList(false), 120)}
                  />
                  {showPatientList && (
                    <div className="autocomplete-panel">
                      {pacientesSinAsignar.filter(p => (`${p.nombre}`.toLowerCase().includes(patientQuery.toLowerCase()) || (`${p.nombre} ${p.motivo}` || '').toLowerCase().includes(patientQuery.toLowerCase()))).slice(0, 50).map(p => (
                        <div
                          key={p.id}
                          className="autocomplete-option"
                          onClick={() => { setSelectedPaciente(p); setPatientQuery(p.nombre); setShowPatientList(false); }}
                        >
                          <div className="autocomplete-title">{p.nombre}</div>
                          <div className="text-small autocomplete-subtitle">{p.motivo}</div>
                        </div>
                      ))}
                      {pacientesSinAsignar.filter(p => (`${p.nombre}`.toLowerCase().includes(patientQuery.toLowerCase()) || (`${p.nombre} ${p.motivo}` || '').toLowerCase().includes(patientQuery.toLowerCase()))).length === 0 && (
                        <div className="text-small autocomplete-empty">No se encontraron pacientes</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Seleccionar Coterapeuta</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Buscar coterapeuta..."
                    value={becarioQuery}
                    onChange={(e) => { setBecarioQuery(e.target.value); setShowBecarioList(true); }}
                    onFocus={() => setShowBecarioList(true)}
                    onBlur={() => setTimeout(() => setShowBecarioList(false), 120)}
                  />
                  {showBecarioList && (
                    <div className="autocomplete-panel">
                      {becarios.filter(b => (`${b.nombre}`.toLowerCase().includes(becarioQuery.toLowerCase()) || (b.especialidad || '').toLowerCase().includes(becarioQuery.toLowerCase()))).slice(0, 50).map(b => (
                        <div
                          key={b.id}
                          className="autocomplete-option"
                          onClick={() => { setSelectedBecario(b); setBecarioQuery(b.nombre); setShowBecarioList(false); }}
                        >
                          <div className="autocomplete-title">{b.nombre}</div>
                          <div className="text-small autocomplete-subtitle">{b.pacientes_asignados}/{b.capacidad || '-'}</div>
                        </div>
                      ))}
                      {becarios.filter(b => (`${b.nombre}`.toLowerCase().includes(becarioQuery.toLowerCase()) || (b.especialidad || '').toLowerCase().includes(becarioQuery.toLowerCase()))).length === 0 && (
                        <div className="text-small autocomplete-empty">No se encontraron coterapeutas</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Terapeuta Supervisor</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Buscar terapeuta..."
                    value={psicologoQuery}
                    onChange={(e) => { setPsicologoQuery(e.target.value); setShowPsicologoList(true); }}
                    onFocus={() => setShowPsicologoList(true)}
                    onBlur={() => setTimeout(() => setShowPsicologoList(false), 120)}
                  />
                  {showPsicologoList && (
                    <div className="autocomplete-panel">
                      {psicologos.filter(p => (`${p.nombre}`.toLowerCase().includes(psicologoQuery.toLowerCase()) || (p.especialidad || '').toLowerCase().includes(psicologoQuery.toLowerCase()))).slice(0, 50).map(p => (
                        <div
                          key={p.id}
                          className="autocomplete-option"
                          onClick={() => { setSelectedPsicologo(p); setPsicologoQuery(p.nombre); setShowPsicologoList(false); }}
                        >
                          <div className="autocomplete-title">{p.nombre}</div>
                          <div className="text-small autocomplete-subtitle">{p.especialidad || ''}</div>
                        </div>
                      ))}
                      {psicologos.filter(p => (`${p.nombre}`.toLowerCase().includes(psicologoQuery.toLowerCase()) || (p.especialidad || '').toLowerCase().includes(psicologoQuery.toLowerCase()))).length === 0 && (
                        <div className="text-small autocomplete-empty">No se encontraron terapeutas</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Notas de Asignación</label>
                  <textarea
                    className="textarea-field"
                    placeholder="Observaciones especiales para esta asignación..."
                    rows="3"
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={handleAsignarPaciente} disabled={assigning}>
                <FiCheckCircle /> {assigning ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
              <button className="btn-danger" onClick={() => setShowModal(false)} disabled={assigning}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinadorAsignaciones;