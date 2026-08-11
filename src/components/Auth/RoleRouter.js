import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CoterapeutaLayout from '../Layout/CoterapeutaLayout';
import TerapeutaLayout from '../Layout/TerapeutaLayout';
import CoordinadorLayout from '../Layout/CoordinadorLayout';
import PsicopedagogicoLayout from '../Layout/PsicopedagogicoLayout';

const RoleRouter = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="global-loader">
        <div className="global-loader-content">
          <div className="global-loader-spinner"></div>
          <div className="global-loader-text">Verificando rol...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Verificar si la ruta actual corresponde al rol del usuario
  const path = location.pathname;
  
  if (user.rol === 'coterapeuta' && !path.startsWith('/coterapeuta')) {
    return <Navigate to="/coterapeuta/dashboard" replace />;
  }

  if (user.rol === 'psicopedagogico' && !path.startsWith('/psicopedagogico')) {
    return <Navigate to="/psicopedagogico/dashboard" replace />;
  }
  
  if (user.rol === 'terapeuta' && !path.startsWith('/terapeuta')) {
    return <Navigate to="/terapeuta/dashboard" replace />;
  }
  
  if (user.rol === 'coordinador' && !path.startsWith('/coordinador')) {
    return <Navigate to="/coordinador/dashboard" replace />;
  }

  // Determinar layout basado en el rol del usuario
  switch (user.rol) {
    case 'coterapeuta':
      return <CoterapeutaLayout>{children}</CoterapeutaLayout>;
    case 'psicopedagogico':
      return <PsicopedagogicoLayout>{children}</PsicopedagogicoLayout>;
    case 'terapeuta':
      return <TerapeutaLayout>{children}</TerapeutaLayout>;
    case 'coordinador':
      return <CoordinadorLayout>{children}</CoordinadorLayout>;
    default:
      return <Navigate to="/login" />;
  }
};

export default RoleRouter;