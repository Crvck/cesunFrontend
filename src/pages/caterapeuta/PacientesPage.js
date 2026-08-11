import React, { useState, useEffect } from 'react';
import { FiSearch, FiUser, FiFileText } from 'react-icons/fi';
import notifications from '../../utils/notifications';
import { createCoterapeutaTour } from '../../utils/coterapeutaTour';

const BecarioPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showDetalles, setShowDetalles] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');
  const tour = createCoterapeutaTour('pacientes');

  // Estados para expediente y sesiones
  const [expediente, setExpediente] = useState(null);
  const [sesionesPaciente, setSesionesPaciente] = useState([]);


  useEffect(() => {
    fetchPacientes();

    // Escuchar creación de citas para refrescar si es necesario
    const onCitaCreada = (e) => {
      try {
        console.log('Evento citaCreada recibido (becario):', e.detail);
        fetchPacientes();
      } catch (e) { console.warn(e); }
    };

    const onCitaActualizada = (e) => {
      try {
        console.log('Evento citaActualizada recibido (becario):', e.detail);
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
    } catch (err) {
      console.error('Error al obtener expediente completo:', err);
      notifications.error('Error al obtener expediente');
      setExpediente(null);
      setSesionesPaciente([]);
    }
  };

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL;

      if (!token) {
        console.error('No hay token de autenticación');
        notifications.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        return;
      }

      console.log('Token encontrado, haciendo petición...');

      const res = await fetch(`${apiUrl}/api/asignaciones/mis-pacientes`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        console.error('Error fetching mis pacientes:', res.status);
        const errorText = await res.text();
        console.error('Error response:', errorText);
        notifications.error(`Error al cargar pacientes: ${res.status}`);
        return;
      }

      const json = await res.json();
      const data = Array.isArray(json) ? json : (json.data || []);

      const mapped = data.map(p => ({
        id: p.id,
        nombre: p.nombre_completo || `${p.nombre || ''} ${p.apellido || ''}`.trim(),
        apellido: p.apellido,
        edad: p.edad || null,
        telefono: p.telefono,
        email: p.email,
        motivo_consulta: p.motivo_consulta || '',
        diagnostico: p.diagnostico_definitivo || p.diagnostico_presuntivo || '',
        ultima_sesion: p.ultima_sesion || null,
        proxima_cita: p.proxima_cita || null,
        sesiones_completadas: p.sesiones_completadas || 0,
        estado: p.estado,
        psicologo: p.psicologo_nombre ? `${p.psicologo_nombre} ${p.psicologo_apellido || ''}`.trim() : null,
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
      paciente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <p>Pacientes asignados a tu supervisión</p>
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
              <th>Diagnóstico</th>
              <th>Sesiones</th>
              <th>Última Sesión</th>
              <th>Psicólogo</th>
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
                        {paciente.nombre.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-bold">{paciente.nombre}</div>
                        <div className="text-small">{paciente.edad} años</div>
                      </div>
                    </div>
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
                    {paciente.psicologo || 'Sin asignar'}
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
            <p>Con psicólogo: {pacientes.filter(p => p.psicologo).length}</p>
          </div>
        </div>

        <div className="card">
          <h4>Sesiones Totales</h4>
          <div className="mt-10">
            <p className="stat-value">{pacientes.reduce((sum, p) => sum + p.sesiones_completadas, 0)}</p>
            <p>sesiones completadas</p>
          </div>
        </div>

        <div className="card">
          <h4>Próximas Citas</h4>
          <div className="mt-10">
            <p className="stat-value">{pacientes.filter(p => p.proxima_cita).length}</p>
            <p>pacientes con cita programada</p>
          </div>
        </div>
      </div>

      {/* Modal de Detalles */}
      {showDetalles && selectedPaciente && (
        <div className="modal-overlay">
          <div className="modal-container modal-large">
            <div className="modal-header">
              <h3>Detalles del Paciente</h3>
              <button className="modal-close" onClick={() => setShowDetalles(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="grid-2 gap-20">
                <div>
                  <h4>Información Personal</h4>
                  <div className="detail-row">
                    <strong>Nombre:</strong> {selectedPaciente.nombre}
                  </div>
                  <div className="detail-row">
                    <strong>Edad:</strong> {selectedPaciente.edad} años
                  </div>
                  <div className="detail-row">
                    <strong>Psicólogo asignado:</strong> {selectedPaciente.psicologo || 'Sin asignar'}
                  </div>
                  <div className="detail-row">
                    <strong>Estado:</strong> <span className={`badge badge-${getEstadoLabel(selectedPaciente.estado).color}`}>{getEstadoLabel(selectedPaciente.estado).text}</span>
                  </div>
                </div>

                <div>
                  <h4>Información Clínica</h4>
                  <div className="detail-row">
                    <strong>Motivo de consulta:</strong> {selectedPaciente.motivo_consulta}
                  </div>
                  <div className="detail-row">
                    <strong>Diagnóstico:</strong> {selectedPaciente.diagnostico || 'Pendiente'}
                  </div>
                  <div className="detail-row">
                    <strong>Sesiones completadas:</strong> {selectedPaciente.sesiones_completadas}
                  </div>
                  <div className="detail-row">
                    <strong>Última sesión:</strong> {selectedPaciente.ultima_sesion ? new Date(selectedPaciente.ultima_sesion).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="detail-row">
                    <strong>Próxima cita:</strong> {selectedPaciente.proxima_cita ? new Date(selectedPaciente.proxima_cita).toLocaleDateString() : 'Sin programar'}
                  </div>
                </div>
              </div>

              {/* Expediente */}
              {expediente && (
                <div className="mt-20">
                  <h4>Expediente Clínico</h4>
                  <div className="grid-2 gap-20 mt-10">
                    <div>
                      <h5>Antecedentes</h5>
                      <div className="detail-row">
                        <strong>Antecedentes personales:</strong> {expediente.antecedentes_personales || 'No especificados'}
                      </div>
                      <div className="detail-row">
                        <strong>Antecedentes familiares:</strong> {expediente.antecedentes_familiares || 'No especificados'}
                      </div>
                    </div>
                    <div>
                      <h5>Evaluación</h5>
                      <div className="detail-row">
                        <strong>Evaluación inicial:</strong> {expediente.evaluacion_inicial || 'Pendiente'}
                      </div>
                      <div className="detail-row">
                        <strong>Objetivos terapéuticos:</strong> {expediente.objetivos_terapeuticos || 'No definidos'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Historial de Sesiones */}
              <div className="mt-20">
                <h4>Historial de Sesiones</h4>
                <div className="table-container mt-10">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Estado</th>
                        <th>Tipo</th>
                        <th>Desarrollo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sesionesPaciente && sesionesPaciente.length > 0 ? (
                        sesionesPaciente.slice(0, 10).map((sesion) => (
                          <tr key={sesion.id}>
                            <td>{new Date(sesion.fecha).toLocaleDateString()}</td>
                            <td>{sesion.hora_inicio} - {sesion.hora_fin}</td>
                            <td>
                              <span className={`badge ${sesion.estado === 'completada' ? 'badge-success' : sesion.estado === 'cancelada' ? 'badge-danger' : 'badge-warning'}`}>
                                {sesion.estado}
                              </span>
                            </td>
                            <td>{sesion.tipo_sesion || 'Regular'}</td>
                            <td>
                              <div className="text-truncate" style={{ maxWidth: '200px' }} title={sesion.desarrollo}>
                                {sesion.desarrollo || 'Sin descripción'}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center">No hay sesiones registradas</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
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

export default BecarioPacientes;