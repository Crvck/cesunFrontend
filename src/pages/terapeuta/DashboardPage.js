import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiCalendar, FiUserCheck, FiClock, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import notifications from '../../utils/notifications';
import { createTherapistTour } from '../../utils/therapistTour';

const terapeutaDashboard = () => {
  const [estadisticas, setEstadisticas] = useState({
    pacientesActivos: 0,
    citasHoy: 0,
    citasSemana: 0,
    citasCompletadas: 0
  });
  const [citasHoy, setCitasHoy] = useState([]);
  const [becarios, setBecarios] = useState([]);
  const [citasSemanaList, setCitasSemanaList] = useState([]);
  const [pacientesAsignados, setPacientesAsignados] = useState([]);
  const [loading, setLoading] = useState(true);
  const tour = createTherapistTour('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' };

      const today = new Date();
      const toISODate = (d) => new Date(d).toISOString().split('T')[0];
      const todayStr = toISODate(today);

      const safeJson = async (res) => {
        try { const j = await res.json(); return j; } catch { return {}; }
      };
      const normalizeArray = (j) => Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);

      // Decodificar userId
      let decodedUserId = null;
      try {
        const payload = token?.split('.')[1];
        const json = payload ? JSON.parse(atob(payload)) : null;
        decodedUserId = json?.id || json?.userId || null;
      } catch (_) {
        decodedUserId = null;
      }

      // Agenda semanal del terapeuta
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      const fechaInicio = format(start, 'yyyy-MM-dd');
      const fechaFin = format(end, 'yyyy-MM-dd');

      const agendaQuery = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        terapeuta_id: decodedUserId || ''
      });

      const apiUrl = process.env.REACT_APP_API_URL;
      if (!apiUrl) {
        notifications.error('La variable REACT_APP_API_URL no está definida.');
        return;
      }

      // Optimización: Ejecutar ambas llamadas API en paralelo
      const [agendaRes, asigRes] = await Promise.all([
        fetch(`${apiUrl}/api/agenda/global?${agendaQuery.toString()}`, { headers }),
        fetch(`${apiUrl}/api/pacientes/activos`, { headers }).catch(error => {
          console.error('Error cargando pacientes activos:', error);
          return { ok: false };
        })
      ]);

      const agendaJson = await safeJson(agendaRes);
      const citasRaw = Array.isArray(agendaJson) ? agendaJson : (agendaJson.data?.citas || agendaJson.data || []);
      const citasWeek = citasRaw.map((c) => ({
        id: c.id,
        fecha: typeof c.fecha === 'string' ? c.fecha.split('T')[0] : format(new Date(c.fecha), 'yyyy-MM-dd'),
        hora: typeof c.hora === 'string' ? c.hora.slice(0, 5) : c.hora,
        tipo: c.tipo_consulta || 'presencial',
        estado: c.estado,
        color: c.color || c.cita_color || null,
        paciente_nombre: c.Paciente ? `${c.Paciente.nombre} ${c.Paciente.apellido}` : (c.paciente_nombre || 'Paciente'),
        paciente_telefono: c.Paciente?.telefono || c.paciente_telefono || '',
        paciente_email: c.Paciente?.email || c.paciente_email || '',
        coterapeuta_nombre: c.Becario ? `${c.Becario.nombre} ${c.Becario.apellido}` : (c.becario_nombre || '')
      }));

      setCitasSemanaList(citasWeek);

      // Citas hoy
      const citasHoyArr = citasWeek.filter(c => c.fecha === todayStr).map(c => ({
        id: c.id,
        paciente_nombre: c.paciente_nombre,
        hora: c.hora || '',
        tipo: c.tipo,
        estado: c.estado,
        coterapeuta: c.coterapeuta_nombre || ''
      }));
      setCitasHoy(citasHoyArr);

      // Becarios asignados para citas (desde agenda semanal)
      const becariosFromCitas = [...new Set(citasWeek.map(c => c.coterapeuta_nombre).filter(Boolean))]
        .map((nombre, idx) => ({ id: `bec-${idx}`, nombre, pacientes: 0, observaciones: 0 }));
      setBecarios(becariosFromCitas);

      // Pacientes asignados usando el endpoint /api/pacientes/activos
      let pacientesAsignadosList = [];
      try {
        if (asigRes.ok) {
          const asigJson = await safeJson(asigRes);
          const asigArr = normalizeArray(asigJson);
          pacientesAsignadosList = asigArr.map(p => ({
            id: p.id,
            nombre: p.nombre_completo || `${p.nombre || ''} ${p.apellido || ''}`.trim()
          })).filter(p => p.id && p.nombre);
        }
      } catch (error) {
        console.error('Error procesando pacientes activos:', error);
        notifications.error('No se pudieron cargar los pacientes asignados.');
      }
      setPacientesAsignados(pacientesAsignadosList);

      const pacientesActivos = pacientesAsignadosList.length;
      const citasSemana = citasWeek.length;
      const citasCompletadas = citasWeek.filter(c => c.estado === 'completada').length;

      setEstadisticas({ pacientesActivos, citasHoy: citasHoyArr.length, citasSemana, citasCompletadas });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      notifications.error('Error cargando panel');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Citas Hoy',
      value: estadisticas.citasHoy,
      icon: <FiCalendar />,
      color: 'var(--grnb)',
      change: 'Programadas para hoy'
    },
    {
      title: 'Pacientes Activos',
      value: estadisticas.pacientesActivos,
      icon: <FiUsers />,
      color: 'var(--blu)',
      change: 'En tratamiento'
    },
    {
      title: 'Citas Esta Semana',
      value: estadisticas.citasSemana,
      icon: <FiClock />,
      color: 'var(--yy)',
      change: 'Próximos 7 días'
    },
    {
      title: 'Citas Completadas',
      value: estadisticas.citasCompletadas,
      icon: <FiAlertCircle />,
      color: 'var(--grnl)',
      change: 'Esta semana'
    }
  ];


  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando panel del terapeuta...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Panel del Terapeuta</h1>
          <p>Bienvenido a tu centro de gestión de citas y pacientes</p>
        </div>
        <div className="flex-row gap-10">
          <button className="btn-secondary" onClick={() => tour.drive()}>
            Tour
          </button>
          <button className="btn-secondary" onClick={fetchDashboardData}>
            <FiRefreshCw /> Actualizar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-header">
              <div className="stat-icon" style={{ color: stat.color }}>
                {stat.icon}
              </div>
              <h3>{stat.title}</h3>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-change">{stat.change}</div>
          </div>
        ))}
      </div>


      {/* Main Content Grid */}
      <div className="dashboard-content-grid">
        {/* Citas de Hoy */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Citas de Hoy</h3>
            <button className="btn-text" onClick={() => navigate('/terapeuta/citas')}>Ver Calendario</button>
          </div>

          <div className="citas-list">
            {citasHoy.length > 0 ? (
              citasHoy.slice(0, 5).map((cita) => (
                <div key={cita.id} className="cita-item">
                  <div className="cita-info">
                    <div className="cita-paciente">{cita.paciente_nombre}</div>
                    <div className="cita-hora">{cita.hora}</div>
                  </div>
                  <div className={`cita-estado badge ${cita.estado === 'confirmada' ? 'badge-success' :
                      cita.estado === 'programada' ? 'badge-warning' :
                        'badge-danger'
                    }`}>
                    {cita.estado}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-citas">
                <div className="no-citas-icon">📅</div>
                <div>No hay citas programadas para hoy</div>
              </div>
            )}
          </div>
        </div>

        {/* Pacientes asignados */}
        <div className="dashboard-section">
          <div className="section-header">
            <h3>Mis Pacientes</h3>
            <button className="btn-text" onClick={() => navigate('/terapeuta/pacientes')}>Ver todos</button>
          </div>

          <div className="pacientes-list">
            {pacientesAsignados.length > 0 ? (
              pacientesAsignados.slice(0, 6).map((paciente, idx) => (
                <div key={paciente.id + '-' + idx} className="paciente-item">
                  <div className="paciente-info">
                    <div className="paciente-nombre">{paciente.nombre}</div>
                    <div className="paciente-fecha">
                      En tratamiento activo
                    </div>
                  </div>
                  <button className="btn-text" onClick={() => navigate('/terapeuta/pacientes')}>Ver</button>
                </div>
              ))
            ) : (
              <div className="no-citas">
                <div className="no-citas-icon">👥</div>
                <div>No tienes pacientes asignados</div>
              </div>
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default terapeutaDashboard;