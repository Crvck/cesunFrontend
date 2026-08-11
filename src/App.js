import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Componentes que se cargan inmediatamente (críticos)
import Login from './components/Auth/Login';
import RoleRouter from './components/Auth/RoleRouter';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ConfirmModal from './components/Common/ConfirmModal';
import NotificationModal from './components/Common/NotificationModal';

// Lazy loading para todas las páginas (se cargan solo cuando se necesitan)
const PreRegistro = lazy(() => import('./components/Auth/PreRegistro'));

// Coterapeutas
const CoterapeutaDashboard = lazy(() => import('./pages/caterapeuta/DashboardPage'));
const CoterapeutaCitas = lazy(() => import('./pages/caterapeuta/CitasPage'));
const CoterapeutaPacientes = lazy(() => import('./pages/caterapeuta/PacientesPage'));
const CoterapeutaConfiguracion = lazy(() => import('./pages/caterapeuta/ConfiguracionPage'));

// Terapeutas
const TerapeutaDashboard = lazy(() => import('./pages/terapeuta/DashboardPage'));
const TerapeutaPacientes = lazy(() => import('./pages/terapeuta/PacientesPage'));
const TerapeutaCitas = lazy(() => import('./pages/terapeuta/CitasPage'));
const TerapeutaSesiones = lazy(() => import('./pages/terapeuta/SesionesPage'));
const TerapeutaConfiguracion = lazy(() => import('./pages/terapeuta/ConfiguracionPage'));

// Psicopedagógico
const PsicopedagogicoDashboard = lazy(() => import('./pages/psicopedagogico/DashboardPage'));
const PsicopedagogicoCitas = lazy(() => import('./pages/psicopedagogico/CitasPage'));
const PsicopedagogicoPacientes = lazy(() => import('./pages/psicopedagogico/PacientesPage'));
const PsicopedagogicoConfiguracion = lazy(() => import('./pages/psicopedagogico/ConfiguracionPage'));

// Coordinadores
const CoordinadorDashboard = lazy(() => import('./pages/coordinador/DashboardPage'));
const CoordinadorUsuarios = lazy(() => import('./pages/coordinador/UsuariosPage'));
const CoordinadorPacientes = lazy(() => import('./pages/coordinador/PacientesPage'));
const CoordinadorAsignaciones = lazy(() => import('./pages/coordinador/AsignacionesPage'));
const CoordinadorAgenda = lazy(() => import('./pages/coordinador/AgendaPage'));
const CoordinadorReportes = lazy(() => import('./pages/coordinador/ReportesPage'));
const CoordinadorAltas = lazy(() => import('./pages/coordinador/AltasPage'));
const CoordinadorConfiguracion = lazy(() => import('./pages/coordinador/ConfiguracionPage'));

// Componente de carga mientras se cargan las páginas
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#1a1d24',
    color: '#fff'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid #2c3e50',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }}></div>
      <p>Cargando...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        {/* Agrega los modales aquí */}
        <ConfirmModal />
        <NotificationModal />

        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/preregistro" element={<PreRegistro />} /> {/* <--- Ruta agregada */}

            {/* Rutas Protegidas por Rol */}
            <Route path="/" element={<RoleRouter />}>
              <Route index element={<CoterapeutaDashboard />} />

              {/* Coterapeuta */}
              <Route path="coterapeuta/dashboard" element={<CoterapeutaDashboard />} />
              <Route path="coterapeuta/citas" element={<CoterapeutaCitas />} />
              <Route path="coterapeuta/pacientes" element={<CoterapeutaPacientes />} />
              <Route path="coterapeuta/configuracion" element={<CoterapeutaConfiguracion />} />

              {/* Terapeuta */}
              <Route path="terapeuta/dashboard" element={<TerapeutaDashboard />} />
              <Route path="terapeuta/pacientes" element={<TerapeutaPacientes />} />
              <Route path="terapeuta/citas" element={<TerapeutaCitas />} />
              <Route path="terapeuta/sesiones" element={<TerapeutaSesiones />} />
              <Route path="terapeuta/configuracion" element={<TerapeutaConfiguracion />} />

              {/* Coordinador */}
              <Route path="coordinador/dashboard" element={<CoordinadorDashboard />} />
              <Route path="coordinador/usuarios" element={<CoordinadorUsuarios />} />
              <Route path="coordinador/pacientes" element={<CoordinadorPacientes />} />
              <Route path="coordinador/asignaciones" element={<CoordinadorAsignaciones />} />
              <Route path="coordinador/agenda" element={<CoordinadorAgenda />} />
              <Route path="coordinador/reportes" element={<CoordinadorReportes />} />
              <Route path="coordinador/altas" element={<CoordinadorAltas />} />
              <Route path="coordinador/configuracion" element={<CoordinadorConfiguracion />} />

              {/* Psicopedagógico */}
              <Route path="psicopedagogico/dashboard" element={<PsicopedagogicoDashboard />} />
              <Route path="psicopedagogico/citas" element={<PsicopedagogicoCitas />} />
              <Route path="psicopedagogico/pacientes" element={<PsicopedagogicoPacientes />} />
              <Route path="psicopedagogico/configuracion" element={<PsicopedagogicoConfiguracion />} />
            </Route>

            {/* Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;