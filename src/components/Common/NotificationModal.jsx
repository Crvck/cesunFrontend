import React, { useState, useEffect } from 'react'
import './NotificationModal.css'

let showNotificationFunc = null

const NotificationModal = () => {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState('info') // 'info', 'success', 'error', 'warning'

  const show = (msg, msgType = 'info') => {
    setMessage(msg)
    setType(msgType)
    setVisible(true)
  }

  const hide = () => {
    setVisible(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      hide()
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('notification-overlay')) {
      hide()
    }
  }

  // Exponer la función show al objeto global
  useEffect(() => {
    showNotificationFunc = show
    
    return () => {
      showNotificationFunc = null
    }
  }, [])

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div 
      className="notification-overlay" 
      onClick={handleOverlayClick}
    >
      <div className={`modal-notification modal-notification-${type}`}>
        <div className="notification-message">
          {message}
        </div>
        <button 
          className={`modal-button notification-close-button notification-button-${type}`}
          onClick={hide}
          autoFocus
        >
          Aceptar
        </button>
      </div>
    </div>
  )
}

// Función global para mostrar notificaciones
export const showNotification = (message, type = 'info') => {
  if (showNotificationFunc) {
    showNotificationFunc(message, type)
  } else {
    console.error('NotificationModal no está montado')
    // Fallback al alert si no está disponible

  }
}

export default NotificationModal