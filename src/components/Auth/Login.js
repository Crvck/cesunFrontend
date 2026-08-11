import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!credentials.email || !credentials.password) {
      setError('Por favor ingrese email y contraseña');
      setLoading(false);
      return;
    }

    const result = await login(credentials.email, credentials.password);
    
    console.log('Resultado del login:', result);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-page">
      <video 
        autoPlay 
        loop 
        muted 
        className="background-video"
        onContextMenu={(e) => e.preventDefault()}
      >
        <source src="/images/banner.mp4" type="video/mp4" />
        Tu navegador no soporta videos HTML5.
      </video>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="logo-container">
              <img 
                src="/images/logoCESUN2.png" 
                alt="PsicoGestión" 
                className="login-logo"
              />
            </div>
            <p className="login-subtitle">Consultorio Psicológico</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                className="input-field"
                placeholder="Correo electrónico"
                value={credentials.email}
                onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>

            <div className="form-group">
              <div className="password-input-container">
                <input
                  type="password"
                  className="input-field"
                  placeholder="Contraseña"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  onKeyDown={handleKeyDown}
                  id="password-field"
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => {
                    const input = document.getElementById('password-field');
                    const icon = document.querySelector('.password-toggle svg');
                    
                    if (input.type === 'password') {
                      input.type = 'text';
                      icon.innerHTML = '<path d="M12 6.5c2.76 0 5 2.24 5 5 0 .51-.1 1-.24 1.46l3.06 3.06c1.39-1.23 2.49-2.77 3.18-4.53C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l2.17 2.17c.47-.14.96-.24 1.47-.24zM2.71 3.16c-.39.39-.39 1.02 0 1.41l1.97 1.97C3.06 7.83 1.77 9.53 1 11.5 2.73 15.89 7 19 12 19c1.52 0 2.97-.3 4.31-.82l2.72 2.72c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L4.13 3.16c-.39-.39-1.02-.39-1.42 0zM12 16.5c-2.76 0-5-2.24-5-5 0-.77.18-1.5.49-2.14l1.57 1.57c-.03.18-.06.37-.06.57 0 1.66 1.34 3 3 3 .2 0 .38-.03.57-.07L14.14 16c-.64.32-1.37.5-2.14.5zm2.97-5.33c-.15-1.4-1.25-2.49-2.64-2.64l2.64 2.64z"/>';
                    } else {
                      input.type = 'password';
                      icon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn-primary-login w-100" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>

            <div className="login-footer">
               <p style={{color: 'white', marginTop: '15px'}}>¿No tienes cuenta? 
                <span 
                  onClick={() => navigate('/preregistro')} 
                  style={{color: '#007bff', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold'}}
                >
                  Pre-regístrate aquí
                </span>
               </p>
            </div>
          </form>

          <div className="app-info">
            <p>Versión 1.0.0</p>
            <p>Sistema de Gestión de Consultorio Psicológico</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;