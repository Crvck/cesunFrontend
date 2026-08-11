import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiCalendar, FiTrendingUp, FiBarChart2,
  FiUserCheck, FiClock, FiRefreshCw
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { createPsychopedagogicoTour } from '../../utils/psychopedagogicoTour';

const TerapeutaDashboard = () => {
  const [estadisticas, setEstadisticas] = useState({
    pacientesActivos: 0,
    citasHoy: 0,
    citasSemana: 0,
    becariosAsignados: 0
  });
  const [citasHoy, setCitasHoy] = useState([]);
  const [becarios, setBecarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const tour = createPsychopedagogicoTour('dashboard');
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

      const apiUrl = process.env.REACT_APP_API_URL;

      // Pacientes activos
      const pacRes = await fetch(`${apiUrl}/api/pacientes/activos`, { headers });
      const pacJson = await safeJson(pacRes);
      const pacientesActivos = normalizeArray(pacJson).length;

      // Becarios asignados al psicólogo
      const becRes = await fetch(`${apiUrl}/api/asignaciones/mis-becarios`, { headers });
      const becJson = await safeJson(becRes);
      const becLista = normalizeArray(becJson).map(b => ({
        id: b.id,
        nombre: `${b.nombre || ''} ${b.apellido || ''}`.trim(),
        pacientes: b.pacientes_asignados ?? 0,
        observaciones: b.observaciones_count ?? 0
      }));
      const becariosAsignados = becLista.length;
      setBecarios(becLista);

      // Citas hoy
      const citasHoyRes = await fetch(`${apiUrl}/api/citas/citas-por-fecha?fecha=${todayStr}`, { headers });
      const citasHoyJson = await safeJson(citasHoyRes);
      const citasHoyArr = normalizeArray(citasHoyJson).map(c => ({
        id: c.id,
        paciente: c.paciente_nombre || `${c.paciente?.nombre || ''} ${c.paciente?.apellido || ''}`.trim(),
        hora: c.hora || c.hora_inicio || '',
        tipo: c.tipo_consulta || 'presencial'
      }));
      setCitasHoy(citasHoyArr);

      // Citas semana (hoy + próximos 6 días)
      let citasSemana = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const res = await fetch(`${apiUrl}/api/citas/citas-por-fecha?fecha=${toISODate(d)}`, { headers });
        const j = await safeJson(res);
        citasSemana += normalizeArray(j).length;
      }

      setEstadisticas({ pacientesActivos, citasHoy: citasHoyArr.length, citasSemana, becariosAsignados });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      notifications.error('Error cargando panel');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Pacientes Activos',
      value: estadisticas.pacientesActivos,
      icon: <FiUsers />,
      color: 'var(--grnb)',
      change: 'En tratamiento'
    },
    {
      title: 'Citas Hoy',
      value: estadisticas.citasHoy,
      icon: <FiCalendar />,
      color: 'var(--blu)',
      change: 'Programadas'
    },
    {
      title: 'Citas Esta Semana',
      value: estadisticas.citasSemana,
      icon: <FiClock />,
      color: 'var(--yy)',
      change: 'Próximos 7 días'
    }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Cargando panel del psicólogo...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Panel del Psicólogo</h1>
          <p>Supervisión y gestión de pacientes</p>
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

      <div className="citas-list">
        {citasHoy.map((cita) => (
          <div key={cita.id} className="cita-item">
            <div className="cita-info">
              <div className="cita-paciente">{cita.paciente}</div>
              <div className="cita-hora">{cita.hora} • {cita.tipo === 'presencial' ? 'Presencial' : 'Virtual'}</div>
            </div>
            <button className="btn-text">Ver</button>
          </div>
        ))}
      </div>

      <div className="pacientes-list">
        {becarios.map((becario) => (
          <div key={becario.id} className="paciente-item">
            <div className="paciente-info">
              <div className="paciente-nombre">{becario.nombre}</div>
              <div className="paciente-fecha">
                {becario.pacientes} pacientes • {becario.observaciones} observaciones
              </div>
            </div>
            <div className="paciente-progreso">
              <span className="progreso-text">
                {becario.observaciones} registradas
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerapeutaDashboard;