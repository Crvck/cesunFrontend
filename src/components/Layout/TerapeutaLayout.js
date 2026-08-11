import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiMenu, FiChevronLeft, FiHome, FiUsers, FiCalendar, FiFileText,
  FiBarChart2, FiUserCheck, FiLogOut, FiClock, FiSun, FiMoon, FiSettings
} from 'react-icons/fi';

const TerapeutaLayout = () => {
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
    { path: '/terapeuta/dashboard', icon: <FiHome />, label: 'Panel Principal', permiso: 'ver_panel_terapeuta' },
    { path: '/terapeuta/pacientes', icon: <FiUsers />, label: 'Mis Pacientes', permiso: 'ver_mis_pacientes' },
    { path: '/terapeuta/citas', icon: <FiCalendar />, label: 'Mis Citas', permiso: 'gestionar_mis_citas' },
    { path: '/terapeuta/sesiones', icon: <FiBarChart2 />, label: 'Registro Sesiones', permiso: 'registrar_sesiones' },
    { path: '/terapeuta/configuracion', icon: <FiSettings />, label: 'Configuración' },
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
          <h2 className="app-name">- Terapeuta</h2>
        </div>
        
        <div className="flex-row align-center gap-20">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-rol">Terapeuta</span>
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
          <span>Rol: Terapeuta • Especialidad: {user?.especialidad || 'No especificada'}</span>
          <span>Última actualización: {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default TerapeutaLayout;
