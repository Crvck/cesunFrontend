import { showNotification } from '../components/Common/NotificationModal'

// Función para notificaciones de éxito (verde)
export const notifySuccess = (message) => {
  showNotification(message, 'success')
}

// Función para notificaciones de error (rojo)
export const notifyError = (message) => {
  showNotification(message, 'error')
}

// Función para notificaciones de advertencia (amarillo)
export const notifyWarning = (message) => {
  showNotification(message, 'warning')
}

// Función para notificaciones de información (azul)
export const notifyInfo = (message) => {
  showNotification(message, 'info')
}

// Alias para la función principal
export const notify = showNotification

// Exporta como objeto global
export default {
  success: notifySuccess,
  error: notifyError,
  warning: notifyWarning,
  info: notifyInfo,
  show: notify
}