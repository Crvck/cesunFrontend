import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiMenu, FiChevronLeft, FiHome, FiUsers, FiCalendar, FiBarChart2,
  FiUserPlus, FiFileText, FiSettings, FiLogOut, FiClock,FiSun, FiMoon,
  FiTrendingUp, FiUserCheck
} from 'react-icons/fi';

const CoordinadorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tema oscuro por defecto
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/coordinador/dashboard', icon: <FiHome />, label: 'Panel Coordinación', permiso: 'ver_panel_coordinacion' },
    { path: '/coordinador/usuarios', icon: <FiUserPlus />, label: 'Gestión Usuarios', permiso: 'gestionar_usuarios' },
    { path: '/coordinador/pacientes', icon: <FiUsers />, label: 'Gestión Pacientes', permiso: 'gestionar_pacientes' },
    { path: '/coordinador/asignaciones', icon: <FiUserCheck />, label: 'Asignaciones', permiso: 'gestionar_asignaciones' },
    { path: '/coordinador/agenda', icon: <FiCalendar />, label: 'Agenda Global', permiso: 'ver_agenda_global' },
    { path: '/coordinador/reportes', icon: <FiBarChart2 />, label: 'Reportes', permiso: 'generar_reportes' },
    { path: '/coordinador/altas', icon: <FiTrendingUp />, label: 'Seguimiento Altas', permiso: 'gestionar_altas' },
    { path: '/coordinador/configuracion', icon: <FiSettings />, label: 'Configuración', permiso: 'ver_panel_coordinacion' },
  ];

  return (
    <div className="main-container">
      <header className="top-header">
        <div className="flex-row align-center">
          <button 
            className="control-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FiChevronLeft size={24} /> : <FiMenu size={24} />}
          </button>
              <img 
                src="/images/logoCESUN2wide.png" 
                alt="PsicoGestión" 
                className="dashboard-logo"
              />
          <h2 className="app-name">- Coordinación</h2>
        </div>

        <div className="flex-row align-center gap-20">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-rol">Coordinador</span>
            {user?.especialidad && (
              <span className="user-especialidad">• {user.especialidad}</span>
            )}
          </div>
          
          <button 
            className="btn-header"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <FiLogOut />
            <span>Salir</span>
          </button>
        </div>
      </header>

      <div className="content-wrapper">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
          
          
        </aside>

        <main className="main-content">
          <div className="content-area">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="status-bar">
        <div className="status-info">
          <span>Sesión: {user?.email}</span>
          <span>Rol: Coordinador • Sistema completo</span>
          <span>Última actualización: {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default CoordinadorLayout;