import { showConfirm } from '../components/Common/ConfirmModal'

// Función para confirmaciones de peligro (rojo - para eliminar)
export const confirmDanger = (message) => {
  return showConfirm(message, 'danger')
}

// Función para confirmaciones de advertencia (amarillo - estándar)
export const confirmWarning = (message) => {
  return showConfirm(message, 'warning')
}

// Función para confirmaciones de información (azul - neutral)
export const confirmInfo = (message) => {
  return showConfirm(message, 'info')
}

// Alias para la función principal
export const confirm = showConfirm

// Exporta como objeto global
export default {
  danger: confirmDanger,
  warning: confirmWarning,
  info: confirmInfo,
  show: confirm
}