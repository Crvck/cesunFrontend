import React, { useState, useEffect } from 'react'
import './ConfirmModal.css'

let showConfirmFunc = null

const ConfirmModal = () => {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState('warning') // 'warning', 'danger', 'info'
  const [callback, setCallback] = useState(null)

  const show = (msg, confirmCallback, msgType = 'warning') => {
    setMessage(msg)
    setType(msgType)
    setCallback(() => confirmCallback)
    setVisible(true)
  }

  const handleConfirm = () => {
    if (callback) callback(true)
    hide()
  }

  const handleCancel = () => {
    if (callback) callback(false)
    hide()
  }

  const hide = () => {
    setVisible(false)
    setMessage('')
    setCallback(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('confirm-overlay')) {
      handleCancel()
    }
  }

  // Exponer la función show al objeto global
  useEffect(() => {
    showConfirmFunc = show
    
    return () => {
      showConfirmFunc = null
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

  const getButtonTexts = () => {
    switch (type) {
      case 'danger': return { confirm: 'Sí', cancel: 'Cancelar' }
      case 'info': return { confirm: 'Sí', cancel: 'No' }
      default: return { confirm: 'Sí', cancel: 'Cancelar' }
    }
  }

  const buttonTexts = getButtonTexts()

  return (
    <div 
      className="confirm-overlay" 
      onClick={handleOverlayClick}
    >
      <div className={`modal-confirm modal-confirm-${type}`}>
        <div className="confirm-message">
          {message}
        </div>
        <div className="confirm-buttons-container">
          <button 
            className={`modal-button confirm-button-cancel confirm-button-${type}-cancel`}
            onClick={handleCancel}
          >
            {buttonTexts.cancel}
          </button>
          <button 
            className={`modal-button confirm-button-confirm confirm-button-${type}`}
            onClick={handleConfirm}
            autoFocus
          >
            {buttonTexts.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

// Función global para mostrar confirmaciones
export const showConfirm = (message, type = 'warning') => {
  return new Promise((resolve) => {
    if (showConfirmFunc) {
      showConfirmFunc(message, resolve, type)
    } else {
      console.error('ConfirmModal no está montado')
      // Fallback al confirm nativo si no está disponible
      const result = window.confirm(message)
      resolve(result)
    }
  })
}

export default ConfirmModal