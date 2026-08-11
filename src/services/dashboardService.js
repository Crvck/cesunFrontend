// frontend/src/services/dashboardService.js
import ApiService from './api';

class DashboardService {
  static async obtenerDashboardCoordinador() {
    try {
      console.log('Obteniendo dashboard coordinador...');
      const response = await ApiService.getDashboardCoordinador();
      console.log('Respuesta recibida:', response);
      // Ajuste: A veces axios devuelve la data en response.data, a veces directo.
      return response.data || response;
    } catch (error) {
      console.error('Error obteniendo dashboard coordinador:', error);
      throw error;
    }
  }

  static async obtenerMetricasGlobales(periodo = 'mes') {
    try {
      const response = await ApiService.getMetricasGlobales(periodo);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo métricas globales:', error);
      throw error;
    }
  }

  static async obtenerEstadisticas() {
    try {
      const response = await ApiService.getEstadisticas();
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // --- MÉTODOS PARA GESTIONAR SOLICITUDES ---
  // Método para aprobar solicitud
  static async aprobarSolicitud(id, rol) {
    try {
      console.log('DashboardService.aprobarSolicitud called with:', { id, rol });
      const response = await ApiService.post('/dashboard/aprobar-solicitud', {
        solicitudId: id,
        rolAsignado: rol
      });
      console.log('DashboardService response:', response);
      return response.data;
    } catch (error) {
      console.error('Error en DashboardService.aprobarSolicitud:', error);
      throw error;
    }
  }

  // Método para denegar solicitud
  static async denegarSolicitud(id) {
    try {
      console.log('DashboardService.denegarSolicitud called with:', { id });
      const response = await ApiService.post('/dashboard/denegar-solicitud', {
        solicitudId: id
      });
      console.log('DashboardService denegar response:', response);
      return response.data;
    } catch (error) {
      console.error('Error en DashboardService.denegarSolicitud:', error);
      throw error;
    }
  }
  // ---------------------------------

  // Método para transformar los datos del backend al formato que usa el frontend
  static transformarDatosCoordinador(datosBackend) {
    if (!datosBackend) {
      throw new Error('No se recibieron datos del backend');
    }

    const payload = datosBackend.data || datosBackend;
    console.log('transformarDatosCoordinador recibió:', payload);

    // 1. EXTRAEMOS LOS DATOS (Incluyendo 'solicitudes')
    const {
      estadisticas = {},
      top_terapeutas = [],
      completadas_por_kapi = [],
      completadas_por_origen = {},
      coterapeutas_con_carga = [],
      actividad_reciente = [],
      alertas = [],
      evolucion_mensual = [],
      citas_por_dia = [],
      solicitudes_pendientes = [],
      solicitudes = []
    } = payload;

    const estadisticasTransformadas = {
      coterapeutasActivos: estadisticas.coterapeutas_activos || estadisticas.coterapeutasActivos || 0,
      terapeutasActivos: estadisticas.terapeutas_activos || estadisticas.terapeutasActivos || 0,
      pacientesActivos: estadisticas.pacientes_activos || estadisticas.pacientesActivos || 0,
      citasHoy: estadisticas.citas_hoy || estadisticas.citasHoy || 0,
      citasCompletadasHoy: estadisticas.citas_completadas_hoy || estadisticas.citasCompletadasHoy || 0,
      altasMesActual: estadisticas.altas_mes || estadisticas.altasMesActual || 0,
      pxAtendidosForaneos: estadisticas.px_atendidos_foraneos || estadisticas.pxAtendidosForaneos || 0,
      pxAtendidosComunidadCesun: estadisticas.px_atendidos_comunidad_cesun || estadisticas.pxAtendidosComunidadCesun || 0,
      pxAtendidosCanalizaciones: estadisticas.px_atendidos_canalizaciones || estadisticas.pxAtendidosCanalizaciones || 0,
      pxAtendidosCrisis: estadisticas.px_atendidos_crisis || estadisticas.pxAtendidosCrisis || 0
    };

    // Transformar actividad reciente
    const actividadRecienteTr = Array.isArray(actividad_reciente)
      ? actividad_reciente.map(act => ({
        id: act.id,
        tipo: act.tipo_evento,
        descripcion: `${act.tipo_evento} de ${act.paciente_nombre}`,
        fecha: act.fecha_evento,
        usuario: act.nombre_usuario || ''
      }))
      : [];

    // Transformar distribución de citas por terapeuta o completadas por kapi
    const terapeutasData = completadas_por_kapi.length > 0 ? completadas_por_kapi : top_terapeutas;
    const distribucionTerapeutas = terapeutasData.map(terapeuta => ({
      nombre: terapeuta.nombre_completo || terapeuta.nombre || 'Terapeuta',
      citas: terapeuta.citas_completadas || terapeuta.total_completadas || terapeuta.citas || 0,
      color: this.asignarColor(terapeuta.id || terapeuta.psicologo_id || 0)
    }));

    // Transformar coterapeutas con carga
    const coterapeutasData = coterapeutas_con_carga;
    const coterapeutasCargaTr = coterapeutasData.map(coterapeuta => ({
      id: coterapeuta.id,
      nombre: coterapeuta.nombre_completo || 'Coterapeuta',
      pacientes_asignados: coterapeuta.pacientes_asignados || 0,
      citas_mes: coterapeuta.citas_este_mes || 0,
      pacientes: coterapeuta.pacientes ? coterapeuta.pacientes.split(', ') : []
    }));

    // Transformar alertas
    const alertasTransformadas = alertas.map((alerta, index) => ({
      id: index + 1,
      tipo: alerta.tipo || 'alerta',
      descripcion: alerta.descripcion || 'Alerta del sistema',
      cantidad: alerta.cantidad || 1
    }));

    // 2. RETORNAMOS EL OBJETO COMPLETO (Incluyendo solicitudes)
    const solicitudesTransformadas = (solicitudes_pendientes.length > 0 ? solicitudes_pendientes : solicitudes).map(sol => ({
      id: sol.id,
      nombre: sol.nombre_completo || sol.nombre || '',
      email: sol.email || '',
      telefono: sol.telefono || '',
      rol: sol.rol_solicitado || sol.rol || '',
      fecha: sol.fecha_solicitud || sol.fecha || '',
      estado: sol.estado || 'PENDIENTE',
      matricula: sol.matricula || '',
      institucion: sol.institucion_procedencia || sol.institucion || '',
      motivo: sol.motivo || sol.comentario || sol.motivo_solicitud || '',
      disponibilidad: sol.disponibilidad_horaria || sol.disponibilidad || null,
      horasALiberar: sol.horas_a_liberar || sol.horasALiberar || ''
    }));
    const solicitudesFinales = solicitudesTransformadas;
    console.log('Solicitudes finales:', solicitudesFinales);

    const cancelacionesMes = datosBackend.cancelaciones_mes || datosBackend.cancelacionesMes || null;

    return {
      estadisticas: estadisticasTransformadas,
      actividadReciente: actividadRecienteTr,
      distribucionTerapeutas,
      completadas_por_kapi,
      completadasPorKapi: completadas_por_kapi,
      completadasPorOrigen: completadas_por_origen,
      coterapeutasCarga: coterapeutasCargaTr,
      alertas: alertasTransformadas,
      evolucionMensual: evolucion_mensual,
      citasPorDia: citas_por_dia,
      solicitudes: solicitudesFinales, // <--- Correcto
      cancelacionesMes
    };
  }

  static asignarColor(id) {
    const colores = [
      'var(--grnb)',  // Verde azulado
      'var(--blu)',   // Azul
      'var(--yy)',    // Amarillo
      'var(--grnd)',  // Verde oscuro
      'var(--grnl)',  // Verde claro
      'var(--rr)',    // Rojo
      'var(--rl)'     // Rojo claro
    ];
    return colores[id % colores.length];
  }

}

export default DashboardService;