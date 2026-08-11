// frontend/src/pages/coordinador/DashboardPage.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  FiUsers, FiCalendar, FiTrendingUp, FiBarChart2,
  FiUserCheck, FiClock, FiAlertCircle, FiRefreshCw,
  FiActivity, FiUser, FiCheck, FiX, FiUserPlus,
  FiEye, FiPhone, FiMapPin, FiBook, FiBriefcase, FiMail
} from 'react-icons/fi';
import './coordinador.css';
import { useNavigate } from 'react-router-dom';
import notifications from '../../utils/notifications';
import DashboardService from '../../services/dashboardService';

import { driver } from "driver.js";
import "driver.js/dist/driver.css";


const driverObj = driver({
  showProgress: true,
  steps: [
    {
      element: '.page-header',
      popover: {
        title: 'Encabezado del panel',
        description: 'Aquí puedes actualizar la vista o iniciar el tour de demostración.'
      }
    },
    {
      element: '.stats-grid',
      popover: {
        title: 'Indicadores principales',
        description: 'Esta sección resume la actividad y los indicadores más importantes del sistema.'
      }
    },
    {
      element: '.dashboard-content-grid',
      popover: {
        title: 'Bloques operativos',
        description: 'Aquí se muestran solicitudes, actividad reciente, citas por terapeuta y carga de coterapeutas.'
      }
    },
    {
      element: '.modal-overlay-custom',
      popover: {
        title: 'Acciones rápidas',
        description: 'Desde el detalle de solicitudes puedes aprobar o rechazar registros sin salir del panel.'
      }
    }
  ]
});





const CoordinadorDashboard = () => {
  const navigate = useNavigate();

  // Estados de datos
  const [estadisticas, setEstadisticas] = useState({
    coterapeutasActivos: 0,
    terapeutasActivos: 0,
    pacientesActivos: 0,
    citasHoy: 0,
    citasCompletadasHoy: 0,
    altasMesActual: 0
  });
  const [actividadReciente, setActividadReciente] = useState([]);
  const [distribucionTerapeutas, setDistribucionTerapeutas] = useState([]);
  const [coterapeutasCarga, setCoterapeutasCarga] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [cancelacionesMes, setCancelacionesMes] = useState({ promedio: 0, motivos: [] });
  const [showMotivosModal, setShowMotivosModal] = useState(false);

  // Estado para Solicitudes y Modal
  const [solicitudes, setSolicitudes] = useState([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rolAsignar, setRolAsignar] = useState('');
  const [solicitudesPage, setSolicitudesPage] = useState(1);
  const solicitudesPerPage = 6;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData().catch(error => {
      console.error('Error cargando datos del dashboard:', error);
    });
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Llamada al servicio
      const response = await DashboardService.obtenerDashboardCoordinador();
      console.log('Response completo del dashboard:', response);

      let datos = {};
      try {
        datos = DashboardService.transformarDatosCoordinador(response);
      } catch (e) {
        console.error('Error en transformarDatosCoordinador:', e);
        datos = response; // Fallback si falla la transformación
      }

      setEstadisticas(datos.estadisticas || response.data?.estadisticas || {});
      setActividadReciente(datos.actividadReciente || []);
      setCoterapeutasCarga(datos.coterapeutasCarga || []);
      setAlertas(datos.alertas || []);

      // === SOLUCIÓN 1: ARREGLO DE SOLICITUDES ===
      const listaSolicitudes =
        datos.solicitudes ||
        response.solicitudes_pendientes ||
        response.data?.solicitudes_pendientes ||
        [];
      console.log('Solicitudes cargadas:', listaSolicitudes);
      setSolicitudes(listaSolicitudes);
      setSolicitudesPage(1);

      // === SOLUCIÓN 2: ARREGLO DE CITAS POR TERAPEUTA ===
      // Busca en múltiples ubicaciones por si el nombre varía en el backend
      const listaTerapeutas =
        (Array.isArray(datos.distribucionTerapeutas) && datos.distribucionTerapeutas.length > 0 ? datos.distribucionTerapeutas : null) ||
        (Array.isArray(datos.completadas_por_kapi) && datos.completadas_por_kapi.length > 0 ? datos.completadas_por_kapi : null) ||
        (Array.isArray(datos.completadasPorKapi) && datos.completadasPorKapi.length > 0 ? datos.completadasPorKapi : null) ||
        (Array.isArray(response.completadas_por_kapi) && response.completadas_por_kapi.length > 0 ? response.completadas_por_kapi : null) ||
        (Array.isArray(response.data?.completadas_por_kapi) && response.data.completadas_por_kapi.length > 0 ? response.data.completadas_por_kapi : null) ||
        response.citas_por_terapeuta ||
        response.distribucion_terapeutas ||
        response.data?.citas_por_terapeuta ||
        [];

      console.log("Datos Terapeutas cargados:", listaTerapeutas);
      setDistribucionTerapeutas(Array.isArray(listaTerapeutas) ? listaTerapeutas : []);

      const cancelacionesRaw =
        datos.cancelacionesMes ||
        response.cancelaciones_mes ||
        response.data?.cancelaciones_mes ||
        response.data?.cancelacionesMes ||
        {};

      setCancelacionesMes({
        promedio: cancelacionesRaw.promedio || 0,
        canceladas: cancelacionesRaw.canceladas || 0,
        completadas: cancelacionesRaw.completadas || 0,
        total: cancelacionesRaw.total || 0,
        motivos: cancelacionesRaw.motivos || []
      });

    } catch (error) {
      console.error(error);
      setError(`Error al cargar datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJO DEL MODAL ---
  const handleAbrirModal = (solicitud) => {
    const solicitudNormalizada = {
      ...solicitud,
      motivo: solicitud.motivo || solicitud.comentario || solicitud.motivo_solicitud || solicitud.descripcion || '',
      disponibilidad: solicitud.disponibilidad || solicitud.disponibilidad_horaria || null,
      institucion: solicitud.institucion || solicitud.institucion_procedencia || (solicitud.matricula ? 'CESUN' : '')
    };
    setSelectedSolicitud(solicitudNormalizada);
    const rolSugerido = solicitudNormalizada.rol === 'Practicante' ? 'coterapeuta' : '';
    setRolAsignar(rolSugerido);
    setShowModal(true);
  };

  const handleCerrarModal = () => {
    setShowModal(false);
    setSelectedSolicitud(null);
    setRolAsignar('');
  };

  // --- LÓGICA DE APROBACIÓN (POST) ---
  const handleAprobarSolicitud = async () => {
    if (!rolAsignar || rolAsignar === "") {
      notifications.error("No se seleccionó un rol.");
      return;
    }

    if (!selectedSolicitud || !selectedSolicitud.id) {
      notifications.error("Error", "Solicitud no válida.");
      return;
    }

    try {
      await DashboardService.aprobarSolicitud(selectedSolicitud.id, rolAsignar);
      notifications.success('Solicitud Aprobada', `Usuario creado para ${selectedSolicitud.nombre}`);
      setSolicitudes(prev => prev.filter(s => s.id !== selectedSolicitud.id));
      handleCerrarModal();
    } catch (error) {
      console.error("=== ERROR en handleAprobarSolicitud ===");
      const msg = error?.response?.data?.message || error.message || "Error al procesar la solicitud";
      notifications.error("Error", msg);
    }
  };

  // --- LÓGICA DE RECHAZO (POST) ---
  const handleDenegarSolicitud = async () => {
    if (!selectedSolicitud || !selectedSolicitud.id) {
      notifications.error("Error", "Solicitud no válida.");
      return;
    }

    try {
      await DashboardService.denegarSolicitud(selectedSolicitud.id);
      notifications.success('Solicitud Rechazada', `Solicitud rechazada para ${selectedSolicitud.nombre}`);
      setSolicitudes(prev => prev.filter(s => s.id !== selectedSolicitud.id));
      handleCerrarModal();
    } catch (error) {
      console.error("=== ERROR en handleDenegarSolicitud ===");
      const msg = error?.response?.data?.message || error.message || "Error al rechazar la solicitud";
      notifications.error("Error", msg);
    }
  };

  const handleVerTodaActividad = () => navigate('/coordinador/agenda');
  const handleReasignar = () => navigate('/coordinador/asignaciones');

  // Terminology updated inside generic helper
  const statCards = [
    { title: 'Coterapeutas Activos', value: estadisticas.coterapeutasActivos ?? estadisticas.coterapeutas_activos ?? 0, icon: <FiUserCheck />, color: 'var(--grnb)', change: 'En formación' },
    { title: 'Terapeutas Activos', value: estadisticas.terapeutasActivos ?? estadisticas.terapeutas_activos ?? 0, icon: <FiUsers />, color: 'var(--blu)', change: 'En supervisión' },
    { title: 'Pacientes Activos', value: estadisticas.pacientesActivos, icon: <FiActivity />, color: 'var(--yy)', change: 'En tratamiento' },
    { title: 'Citas Hoy', value: estadisticas.citasHoy, icon: <FiCalendar />, color: 'var(--grnd)', change: `${estadisticas.citasCompletadasHoy} completadas` },
    { title: 'Altas Este Mes', value: estadisticas.altasMesActual, icon: <FiTrendingUp />, color: 'var(--grnl)', change: 'Pacientes finalizados' },
    { title: 'Atendidos Foráneos', value: estadisticas.pxAtendidosForaneos ?? 0, icon: <FiMapPin />, color: 'var(--blu)', change: 'Pacientes externos' },
    { title: ' Atendidos Comunidad Cesun', value: estadisticas.pxAtendidosComunidadCesun ?? 0, icon: <FiBook />, color: 'var(--grnb)', change: 'Pacientes de CESUN' },
    { title: ' Atendidos Canalizaciones', value: estadisticas.pxAtendidosCanalizaciones ?? 0, icon: <FiMail />, color: 'var(--yy)', change: 'Casos derivados' },
    { title: ' Atendidos Crisis', value: estadisticas.pxAtendidosCrisis ?? 0, icon: <FiAlertCircle />, color: 'var(--rr)', change: 'Intervenciones urgentes' },
    {
      title: 'Cancelaciones Este Mes',
      value: `${cancelacionesMes.promedio}%`,
      icon: <FiAlertCircle />,
      color: 'var(--rr)',
      change: `${cancelacionesMes.canceladas || 0} de ${cancelacionesMes.total || 0} citas`,
      clickable: cancelacionesMes.motivos?.length > 0,
      onClick: () => cancelacionesMes.motivos?.length > 0 && setShowMotivosModal(true)
    }
  ];

  const totalSolicitudes = solicitudes.length;
  const totalSolicitudesPages = Math.max(1, Math.ceil(totalSolicitudes / solicitudesPerPage));
  const solicitudesPaginadas = useMemo(() => {
    const start = (solicitudesPage - 1) * solicitudesPerPage;
    return solicitudes.slice(start, start + solicitudesPerPage);
  }, [solicitudes, solicitudesPage, solicitudesPerPage]);

  const parseDisponibilidad = (rawDisponibilidad) => {
    if (!rawDisponibilidad) return [];
    if (Array.isArray(rawDisponibilidad)) return rawDisponibilidad;
    try {
      const parsed = JSON.parse(rawDisponibilidad);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parseando disponibilidad:', error);
      return [];
    }
  };


  const renderDisponibilidad = (rawDisponibilidad) => {
    const disponibilidadLista = parseDisponibilidad(rawDisponibilidad);
    if (!disponibilidadLista.length) return 'Sin información';
    return disponibilidadLista
      .map((item) => {
        const dia = item.dia_semana || item.dia || 'Día';
        const inicio = item.hora_inicio || item.horaInicio || '00:00';
        const fin = item.hora_fin || item.horaFin || '00:00';
        return `${dia}: ${inicio} - ${fin}`;
      })
      .join(' • ');
  };

  const obtenerMotivoSolicitud = (solicitud) => {
    if (!solicitud) return 'No especificado';
    return solicitud.motivo || solicitud.comentario || solicitud.motivo_solicitud || solicitud.descripcion || 'No especificado';
  };



  useEffect(() => {
    setSolicitudesPage(prev => Math.min(prev, totalSolicitudesPages));
  }, [totalSolicitudesPages]);

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div><div className="loading-text">Cargando...</div></div>;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Panel de Coordinación</h1>
          <p>Vista general del sistema y gestión administrativa</p>
          {error && <div className="alert alert-warning mt-10"><FiAlertCircle /> {error}</div>}
        </div>
        <button className="btn-secondary" onClick={fetchDashboardData} disabled={loading}>
          <FiRefreshCw /> Actualizar
        </button>
        <button className="btn-secondary" id='demoTour' style={{ marginLeft: '10px' }} onClick={() => driverObj.drive()} disabled={loading}>
          Tour de demostracion
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="stat-card"
            style={{
              cursor: stat.clickable ? 'pointer' : 'default',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onClick={stat.onClick}
            onMouseEnter={(e) => {
              if (stat.clickable) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (stat.clickable) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }
            }}
          >
            <div className="stat-header">
              <div className="stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
              <h3>{stat.title}</h3>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-change">
              {stat.change}
              {stat.clickable && <span style={{ color: 'var(--blu)', marginLeft: '5px' }}> Ver motivos</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content-grid">

        {/* SECCIÓN SOLICITUDES */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Solicitudes de Registro</h3>
            <span className="badge badge-danger">{solicitudes.length} Pendientes</span>
          </div>

          <div className="solicitudes-list">
            {solicitudes.length > 0 ? (
              solicitudesPaginadas.map((solicitud) => (
                <div key={solicitud.id} className="timeline-item" style={{ alignItems: 'center' }}>
                  <div className="timeline-content" style={{ width: '100%' }}>
                    <div className="flex-row justify-between align-center">
                      <div className="solicitud-info">
                        <div className="flex-row gap-2 align-center">
                          <FiUserPlus className="text-muted" />
                          <strong>{solicitud.nombre}</strong>
                        </div>
                        <div className="text-small text-muted" style={{ marginLeft: '20px' }}>
                          {solicitud.rol} • {solicitud.fecha ? new Date(solicitud.fecha).toLocaleDateString() : 'Fecha N/A'}
                        </div>
                      </div>
                      <button
                        className="btn-text"
                        onClick={() => handleAbrirModal(solicitud)}
                        title="Ver detalles"
                        style={{ fontSize: '18px', padding: '8px', color: 'var(--blu)' }}
                      >
                        <FiEye />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data-message">
                <FiCheck size={40} style={{ color: 'var(--grnb)' }} />
                <p>No hay solicitudes pendientes</p>
              </div>
            )}
          </div>

          {totalSolicitudesPages > 1 && (
            <div className="solicitudes-pagination">
              <button
                className="btn-pagination"
                onClick={() => setSolicitudesPage(prev => Math.max(1, prev - 1))}
                disabled={solicitudesPage === 1}
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {solicitudesPage} de {totalSolicitudesPages}
              </span>
              <button
                className="btn-pagination"
                onClick={() => setSolicitudesPage(prev => Math.min(totalSolicitudesPages, prev + 1))}
                disabled={solicitudesPage === totalSolicitudesPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>

        {/* ACTIVIDAD RECIENTE */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Actividad Reciente</h3>
            <button className="btn-text" onClick={handleVerTodaActividad}>Ver todo</button>
          </div>
          <div className="timeline">
            {actividadReciente.length > 0 ? (
              actividadReciente.map((actividad) => (
                <div key={actividad.id} className="timeline-item">
                  <div className="timeline-content">
                    <div className="flex-row justify-between">
                      <strong>{actividad.descripcion}</strong>
                      <span className="text-small">{new Date(actividad.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-small mt-5">Por: {actividad.usuario}</div>
                  </div>
                </div>
              ))
            ) : <div className="no-data-message"><p>Sin actividad</p></div>}
          </div>
        </div>

        {/* === CITAS POR TERAPEUTA (CORREGIDO) === */}
        <div className="dashboard-section">
          <div className="section-header"><h3>Citas por Terapeuta</h3></div>
          <div className="distribution-list-simple">
            {distribucionTerapeutas.length > 0 ? (
              <div className="psychologist-list">
                {distribucionTerapeutas.map((terapeuta, index) => {
                  // Normalizar datos por si vienen con nombres diferentes
                  const citasCount = terapeuta.citas || terapeuta.total_completadas || terapeuta.cantidad || terapeuta.count || 0;
                  const colorBarra = terapeuta.color || 'var(--blu)';

                  return (
                    <div key={index} className="psychologist-item">
                      <div className="psychologist-info">
                        <div className="psychologist-name">{terapeuta.nombre}</div>
                        <div className="psychologist-citas-count">{citasCount} completadas</div>
                      </div>
                      <div className="psychologist-badge" style={{ backgroundColor: colorBarra }}>
                        {citasCount}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="no-data-message"><p>No hay citas pendientes</p></div>}
          </div>
        </div>

        {/* CARGA DE COTERAPEUTAS */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Carga de Coterapeutas</h3>
            <button className="btn-text" onClick={handleReasignar}>Reasignar</button>
          </div>
          <div className="becarios-list">
            {coterapeutasCarga.length > 0 ? (
              <div className="becarios-items">
                {coterapeutasCarga.map((coterapeuta) => (
                  <div key={coterapeuta.id} className="becario-item">
                    <div className="becario-header">
                      <div className="becario-name">{coterapeuta.nombre}</div>
                      <div className="becario-stats"><span className="stat-badge">{coterapeuta.pacientes_asignados} pacientes</span></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="no-data-message"><p>Sin coterapeutas</p></div>}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && selectedSolicitud && (
        <div className="modal-overlay-custom">
          <div className="modal-card-custom modal-container">

            <div className="modal-header-custom border-bottom" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--white)' }}>Aprobar Solicitud</h3>
              <button onClick={handleCerrarModal} className="btn-text" style={{ fontSize: '20px' }}><FiX /></button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--blu)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', color: 'white' }}>
                  {selectedSolicitud.nombre ? selectedSolicitud.nombre.charAt(0) : '?'}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--white)' }}>{selectedSolicitud.nombre}</h4>
                  <span className="badge badge-warning" style={{ marginTop: '5px' }}>{selectedSolicitud.rol || 'Sin rol'}</span>
                </div>
              </div>

              <div className="form-grid mb-30" style={{ gap: '15px' }}>
                <div className="stat-box">
                  <FiMail className="stat-icon" style={{ fontSize: '16px' }} />
                  <div className="stat-content">
                    <div className="stat-label">Correo</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedSolicitud.email}</div>
                  </div>
                </div>
                <div className="stat-box">
                  <FiPhone className="stat-icon" style={{ fontSize: '16px' }} />
                  <div className="stat-content">
                    <div className="stat-label">Teléfono</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedSolicitud.telefono || 'N/A'}</div>
                  </div>
                </div>
                <div className="stat-box">
                  <FiBook className="stat-icon" style={{ fontSize: '16px' }} />
                  <div className="stat-content">
                    <div className="stat-label">Matrícula</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedSolicitud.matricula || 'N/A'}</div>
                  </div>
                </div>
                <div className="stat-box">
                  <FiMapPin className="stat-icon" style={{ fontSize: '16px' }} />
                  <div className="stat-content">
                    <div className="stat-label">Institución</div>
                    <div style={{ fontWeight: 'bold' }}>{selectedSolicitud.institucion || (selectedSolicitud.matricula ? 'CESUN' : 'N/A')}</div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="stat-label"><FiBriefcase style={{ marginRight: '5px' }} /> Motivo de solicitud</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', fontSize: '13px', color: 'var(--white)' }}>
                  {obtenerMotivoSolicitud(selectedSolicitud)}
                </div>
              </div>

              <div className="form-group mt-15">
                <label className="stat-label"><FiClock style={{ marginRight: '5px' }} /> Disponibilidad</label>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', fontSize: '13px', color: 'var(--white)' }}>
                  {renderDisponibilidad(selectedSolicitud.disponibilidad || selectedSolicitud.disponibilidad_horaria)}
                </div>
              </div>

              <div className="mt-30 border-top" style={{ paddingTop: '20px' }}>
                <div className="form-group">
                  <label>Asignar Rol en el Sistema:</label>
                  <select
                    className="form-control"
                    value={rolAsignar}
                    onChange={(e) => setRolAsignar(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--blud)', border: '1px solid var(--blub)', color: 'white' }}
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="psicopedagogico">Psicopedagógico</option>
                    <option value="terapeuta">Terapeuta</option>
                    <option value="coterapeuta">Coterapeuta</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button className="btn-secondary" onClick={handleCerrarModal}>Cancelar</button>
                  <button className="btn-primary" onClick={handleAprobarSolicitud}>Confirmar</button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal de Motivos de Cancelación */}
      {showMotivosModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Motivos de Cancelación - Este Mes</h3>
              <button className="btn-text" onClick={() => setShowMotivosModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--blud)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-light)' }}>Tasa de Cancelación</div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--rr)' }}>{cancelacionesMes.promedio}%</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', color: 'var(--gray-light)' }}>Citas Canceladas</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{cancelacionesMes.canceladas} / {cancelacionesMes.total}</div>
                  </div>
                </div>
              </div>

              {cancelacionesMes.motivos?.length === 0 ? (
                <p className="text-center">No hay motivos de cancelación registrados este mes</p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Motivo</th>
                        <th>Cantidad</th>
                        <th>Porcentaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cancelacionesMes.motivos.map((item, idx) => {
                        const total = cancelacionesMes.motivos.reduce((sum, m) => sum + m.cantidad, 0);
                        const porcentaje = ((item.cantidad / total) * 100).toFixed(1);
                        return (
                          <tr key={idx}>
                            <td>{item.motivo}</td>
                            <td>{item.cantidad}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '100px',
                                  height: '8px',
                                  background: '#e0e0e0',
                                  borderRadius: '4px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    width: `${porcentaje}%`,
                                    height: '100%',
                                    background: 'var(--rr)',
                                    transition: 'width 0.3s ease'
                                  }}></div>
                                </div>
                                <span>{porcentaje}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowMotivosModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CoordinadorDashboard;