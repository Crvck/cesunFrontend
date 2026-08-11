// src/components/Auth/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="global-loader">
        <div className="global-loader-content">
          <div className="global-loader-spinner"></div>
          <div className="global-loader-text">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Verificar si el usuario tiene un rol permitido
  if (!allowedRoles.includes(user.rol)) {
    // Redirigir al dashboard correspondiente según el rol
    switch (user.rol) {
      case 'coterapeuta':
        return <Navigate to="/coterapeuta/dashboard" replace />;
      case 'terapeuta':
        return <Navigate to="/terapeuta/dashboard" replace />;
      case 'psicopedagogico':
        return <Navigate to="/psicopedagogico/dashboard" replace />;
      case 'coordinador':
        return <Navigate to="/coordinador/dashboard" replace />;
      default:
        return <Navigate to="/login" />;
    }
  }

  return children;
};

export default ProtectedRoute;