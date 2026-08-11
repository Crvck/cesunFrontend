import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiMenu, FiChevronLeft, FiHome, FiUsers, FiCalendar,
  FiLogOut, FiLock
} from 'react-icons/fi';

const PsicopedagogicoLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/psicopedagogico/dashboard', icon: <FiHome />, label: 'Inicio' },
    { path: '/psicopedagogico/citas', icon: <FiCalendar />, label: 'Mis Citas' },
    { path: '/psicopedagogico/pacientes', icon: <FiUsers />, label: 'Mis Pacientes' },
    { path: '/psicopedagogico/configuracion', icon: <FiLock />, label: 'Configuración' }
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
          <h2 className="app-name">- Psicopedagógico</h2>
        </div>

        <div className="flex-row align-center gap-20">
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-rol">Psicopedagógico</span>
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
          <span>Rol: Psicopedagógico</span>
          <span>Última actualización: {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default PsicopedagogicoLayout;
