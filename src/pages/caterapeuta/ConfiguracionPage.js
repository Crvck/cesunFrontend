import React, { useState } from 'react';
import {
  FiLock, FiEye, FiEyeOff, FiAlertCircle
} from 'react-icons/fi';
import notifications from '../../utils/notifications';
import confirmations from '../../utils/confirmations';
import { createCoterapeutaTour } from '../../utils/coterapeutaTour';
import '../coordinador/coordinador.css';

const CoterapeutaConfiguracion = () => {
  const [saving, setSaving] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const tour = createCoterapeutaTour('configuracion');

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      notifications.warning('Completa todos los campos de contraseña');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notifications.error('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      notifications.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const confirmed = await confirmations.warning('¿Estás seguro de cambiar tu contraseña? Deberás iniciar sesión nuevamente.');

    if (!confirmed) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      };

      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await fetch(`${apiUrl}/api/users/change-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        notifications.success('Contraseña actualizada. Vuelve a iniciar sesión');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

        setTimeout(() => {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }, 2000);
      } else {
        const error = await response.json();
        notifications.error(error.message || 'No se pudo cambiar la contraseña');
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      notifications.error('Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="configuracion-page">
      <div className="page-header">
        <div>
          <h1>Configuración</h1>
          <p>Cambia tu contraseña de acceso</p>
        </div>
        <button className="btn-secondary" onClick={() => tour.drive()}>
          Tour
        </button>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="section-header" style={{ marginBottom: '30px' }}>
          <h3><FiLock /> Seguridad de Contraseña</h3>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="form-group">
            <label><FiLock /> Contraseña Actual</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                className="input-field"
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray)'
                }}
              >
                {showPasswords.current ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label><FiLock /> Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.new ? 'text' : 'password'}
                className="input-field"
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray)'
                }}
              >
                {showPasswords.new ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label><FiLock /> Confirmar Nueva Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                className="input-field"
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Repite la nueva contraseña"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gray)'
                }}
              >
                {showPasswords.confirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
        </div>

        <div className="alert" style={{ marginTop: '20px', background: 'var(--yyl)', padding: '15px', borderRadius: '8px' }}>
          <FiAlertCircle style={{ color: 'var(--yy)' }} />
          <span style={{ marginLeft: '10px' }}>
            Después de cambiar tu contraseña, deberás iniciar sesión nuevamente.
          </span>
        </div>

        <div className="form-actions" style={{ marginTop: '20px' }}>
          <button
            className="btn-primary"
            onClick={handleChangePassword}
            disabled={saving}
          >
            <FiLock /> {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoterapeutaConfiguracion;
