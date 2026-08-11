import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiUser, FiCalendar, FiPhone, FiMail, FiFileText, FiFilter } from 'react-icons/fi';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { createTherapistTour } from '../../utils/therapistTour';

const PsicologoPacientes = () => {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showDetalles, setShowDetalles] = useState(false);
  const [filterEstado, setFilterEstado] = useState('');

  // Estados para expediente y sesiones reales (solo lectura)
  const [expediente, setExpediente] = useState(null);
  const [sesionesPaciente, setSesionesPaciente] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [selectedSesion, setSelectedSesion] = useState(null);
  const [showSesionModal, setShowSesionModal] = useState(false);
  const tour = createTherapistTour('pacientes');

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
        notifications.error((json && (json.message || json.error)) || 'Error al obtener expediente');
        setExpediente(null);
        setSesionesPaciente([]);
        setEstadisticas(null);
        return;
      }

      const data = json?.data || {};
      console.log('📊 Datos del expediente completo:', data);
      console.log('📋 Sesiones recibidas:', data.sesiones);
      if (data.sesiones && data.sesiones.length > 0) {
        console.log('🔍 Primera sesión de muestra:', data.sesiones[0]);
      }
      setExpediente(data.expediente || {});
      setSesionesPaciente(data.sesiones || []);
      setEstadisticas(data.estadisticas || {});
    } catch (err) {
      console.error('Error al obtener expediente completo:', err);
      notifications.error('Error al obtener expediente');
      setExpediente(null);
      setSesionesPaciente([]);
      setEstadisticas(null);
    }
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

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
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Coterapeuta', bold: true })] })] }),
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
              <th>Coterapeuta</th>
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
            <p>Con coterapeuta: {pacientes.filter(p => p.becario).length}</p>
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
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Sesiones Completadas</div>
                  <div className="stat-value" style={{ fontSize: '36px', lineHeight: '1', color: '#27ae60' }}>
                    {estadisticas?.sesiones_completadas || 0}
                  </div>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Sesiones Canceladas</div>
                  <div className="stat-value" style={{ fontSize: '36px', lineHeight: '1', color: '#e74c3c' }}>
                    {estadisticas?.sesiones_canceladas || 0}
                  </div>
                </div>
                <div className="card" style={{ padding: '22px', background: 'var(--blub)', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div className="text-small" style={{ color: 'var(--gray)', marginBottom: '8px' }}>Total de Sesiones</div>
                  <div className="stat-value" style={{ fontSize: '36px', lineHeight: '1', color: '#3498db' }}>
                    {estadisticas?.total_sesiones || 0}
                  </div>
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
                    <strong>Fecha de ingreso:</strong> {expediente?.fecha_ingreso ? new Date(expediente.fecha_ingreso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No registrada'}
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
                    <strong>Terapeuta:</strong> {expediente?.terapeuta_nombre || expediente?.psicologo_nombre || 'No asignado'}
                  </div>
                  <div className="detail-row">
                    <strong>Coterapeuta:</strong> {expediente?.coterapeuta_nombre || selectedPaciente.becario || 'No asignado'}
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
                        <th>Terapeuta</th>
                        <th>Expediente</th>
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
                            <td>{(s.terapeuta_nombre || s.psicologo_nombre || (s.Terapeuta && `${s.Terapeuta.nombre} ${s.Terapeuta.apellido}`) || (s.Psicologo && `${s.Psicologo.nombre} ${s.Psicologo.apellido}`) || 'N/A')}</td>
                            <td>
                              <button
                                className="btn-text"
                                onClick={() => {
                                  setSelectedSesion(s);
                                  setShowSesionModal(true);
                                }}
                                title="Ver detalles de la sesión"
                                style={{ fontSize: '18px' }}
                              >
                                <FiFileText />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--gray)' }}>
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
              <button className="btn-secondary" onClick={() => setShowDetalles(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Sesión */}
      {showSesionModal && selectedSesion && (
        <div className="modal-overlay">
          <div className="modal-container modal-large">
            <div className="modal-header">
              <h3>Detalles de la Sesión</h3>
              <button className="modal-close" onClick={() => setShowSesionModal(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="grid-2 gap-20 mb-20">
                <div className="card" style={{ padding: '20px', background: 'var(--blub)' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Información de la Sesión</h4>
                  <div className="detail-row">
                    <strong>Fecha:</strong> {selectedSesion.fecha ? new Date(selectedSesion.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                  </div>
                  <div className="detail-row">
                    <strong>Horario:</strong> {selectedSesion.hora_inicio && selectedSesion.hora_fin ? `${selectedSesion.hora_inicio.slice(0, 5)} - ${selectedSesion.hora_fin.slice(0, 5)}` : (selectedSesion.hora_inicio ? selectedSesion.hora_inicio.slice(0, 5) : 'N/A')}
                  </div>
                  <div className="detail-row">
                    <strong>Tipo:</strong> <span className="badge badge-info">{selectedSesion.tipo_sesion || selectedSesion.tipo_consulta || 'terapia'}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Terapeuta:</strong> {selectedSesion.terapeuta_nombre || selectedSesion.psicologo_nombre || 'N/A'}
                  </div>
                  {(selectedSesion.coterapeuta_nombre || selectedSesion.becario_nombre) && (
                    <div className="detail-row">
                      <strong>Coterapeuta:</strong> {selectedSesion.coterapeuta_nombre || selectedSesion.becario_nombre}
                    </div>
                  )}
                </div>

                <div className="card" style={{ padding: '20px', background: 'var(--blub)' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Información del Paciente</h4>
                  <div className="detail-row">
                    <strong>Paciente:</strong> {selectedPaciente.nombre_completo}
                  </div>
                  <div className="detail-row">
                    <strong>Edad:</strong> {selectedPaciente.edad} años
                  </div>
                  <div className="detail-row">
                    <strong>Diagnóstico:</strong> {selectedPaciente.diagnostico || 'Sin diagnóstico'}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '20px', background: 'var(--blub)' }}>
                <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Desarrollo de la Sesión</h4>
                <div className="detail-row">
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selectedSesion.desarrollo || 'Sin registro de desarrollo'}
                  </div>
                </div>
              </div>

              {selectedSesion.conclusion && (
                <div className="card" style={{ padding: '20px', background: 'var(--blub)', marginTop: '15px' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Conclusión</h4>
                  <div className="detail-row">
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {selectedSesion.conclusion}
                    </div>
                  </div>
                </div>
              )}

              {selectedSesion.tareas_asignadas && (
                <div className="card" style={{ padding: '20px', background: 'var(--blub)', marginTop: '15px' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Tareas Asignadas</h4>
                  <div className="detail-row">
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {selectedSesion.tareas_asignadas}
                    </div>
                  </div>
                </div>
              )}

              {selectedSesion.siguiente_cita && (
                <div className="card" style={{ padding: '20px', background: 'var(--blub)', marginTop: '15px' }}>
                  <h4 style={{ marginBottom: '15px', color: 'var(--blu)' }}>Próxima Cita</h4>
                  <div className="detail-row">
                    <strong>Fecha programada:</strong> {new Date(selectedSesion.siguiente_cita).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSesionModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default PsicologoPacientes;