import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const coordinatorTourSteps = {
    usuarios: [
        {
            element: '.page-header',
            popover: {
                title: 'Gestión de usuarios',
                description: 'Desde aquí puedes crear, editar, activar o revisar la información del personal.'
            }
        },
        {
            element: '.filters-container',
            popover: {
                title: 'Filtros y búsqueda',
                description: 'Usa estos controles para localizar usuarios por rol, nombre o estado.'
            }
        },
        {
            element: '.table-container',
            popover: {
                title: 'Listado principal',
                description: 'Esta tabla muestra el detalle de cada usuario y sus acciones rápidas.'
            }
        },
        {
            element: '.grid-3.mt-20',
            popover: {
                title: 'Resumen y acciones',
                description: 'Aquí puedes ver métricas generales y exportar listados o enviar recordatorios.'
            }
        }
    ],
    pacientes: [
        {
            element: '.page-header',
            popover: {
                title: 'Gestión de pacientes',
                description: 'Aquí administras pacientes, su expediente y sus datos de contacto.'
            }
        },
        {
            element: '.filters-container',
            popover: {
                title: 'Búsqueda y filtros',
                description: 'Filtra pacientes por estado o usa el buscador para encontrar registros rápido.'
            }
        },
        {
            element: '.table-container',
            popover: {
                title: 'Listado de pacientes',
                description: 'Desde esta tabla puedes ver, editar y abrir el expediente del paciente.'
            }
        },
        {
            element: '.grid-3.mt-20',
            popover: {
                title: 'Resumen general',
                description: 'Consulta métricas rápidas y acciones de exportación o generación de reportes.'
            }
        }
    ],
    agenda: [
        {
            element: '.page-header',
            popover: {
                title: 'Agenda global',
                description: 'Aquí administras las citas y puedes abrir el flujo de asignación.'
            }
        },
        {
            element: '.grid-2.mb-20',
            popover: {
                title: 'Indicadores de agenda',
                description: 'Revisa el resumen general, la carga por terapeuta y el estado de la agenda.'
            }
        },
        {
            element: '.filters-container',
            popover: {
                title: 'Filtros de agenda',
                description: 'Ajusta la vista por fechas, terapeuta, estado o filtros avanzados.'
            }
        },
        {
            element: '.dashboard-content-grid',
            popover: {
                title: 'Bloques de trabajo',
                description: 'En esta vista se organizan la agenda, la disponibilidad y la información complementaria.'
            }
        }
    ],
    asignaciones: [
        {
            element: '.page-header',
            popover: {
                title: 'Asignaciones',
                description: 'Aquí distribuyes pacientes entre terapeutas y coterapeutas.'
            }
        },
        {
            element: '.grid-3.mb-30',
            popover: {
                title: 'Resumen de asignaciones',
                description: 'Consulta cuántos terapeutas activos, pacientes sin asignar y asignaciones activas hay.'
            }
        },
        {
            element: '.dashboard-section.mb-20',
            popover: {
                title: 'Terapeutas disponibles',
                description: 'Busca el profesional correcto y ejecuta nuevas asignaciones desde aquí.'
            }
        },
        {
            element: '.table-container',
            popover: {
                title: 'Detalle de pacientes',
                description: 'Revisa los pacientes sin asignar o las asignaciones activas según la sección.'
            }
        }
    ],
    altas: [
        {
            element: '.page-header',
            popover: {
                title: 'Seguimiento de altas',
                description: 'Desde esta pantalla revisas altas terapéuticas y propuestas pendientes.'
            }
        },
        {
            element: '.grid-4.mb-30',
            popover: {
                title: 'Indicadores de altas',
                description: 'Aquí ves el volumen de altas, propuestas y promedios del mes.'
            }
        },
        {
            element: '.dashboard-section.mb-30',
            popover: {
                title: 'Propuestas pendientes',
                description: 'Revisa las solicitudes que esperan aprobación o seguimiento del coordinador.'
            }
        },
        {
            element: '.table-container',
            popover: {
                title: 'Listado de altas',
                description: 'Consulta el detalle histórico y las acciones disponibles para cada caso.'
            }
        }
    ],
    configuracion: [
        {
            element: '.page-header',
            popover: {
                title: 'Configuración del sistema',
                description: 'Aquí administras los parámetros generales y exportación de la configuración.'
            }
        },
        {
            element: '.config-tabs',
            popover: {
                title: 'Secciones de configuración',
                description: 'Cada pestaña agrupa ajustes distintos del sistema.'
            }
        },
        {
            element: '.config-content',
            popover: {
                title: 'Editor de parámetros',
                description: 'En este espacio editas y guardas valores para cada módulo.'
            }
        },
        {
            element: '.section-header',
            popover: {
                title: 'Acciones de guardado',
                description: 'Desde aquí puedes restaurar valores o guardar cambios de forma puntual.'
            }
        }
    ],
    reportes: [
        {
            element: '.page-header',
            popover: {
                title: 'Reportes y estadísticas',
                description: 'Genera, actualiza y consulta reportes del sistema desde esta pantalla.'
            }
        },
        {
            element: '.card.mb-30',
            popover: {
                title: 'Nuevo reporte',
                description: 'Selecciona el tipo de reporte y los filtros antes de generar el documento.'
            }
        },
        {
            element: '.table-container',
            popover: {
                title: 'Historial de reportes',
                description: 'Aquí ves los reportes ya generados y puedes abrir sus detalles.'
            }
        },
        {
            element: '.section-header',
            popover: {
                title: 'Acciones de reporte',
                description: 'Usa los botones de generar, vista previa o motivos para revisar la información.'
            }
        }
    ]
};

export const createCoordinatorTour = (pageKey) => driver({
    showProgress: true,
    steps: coordinatorTourSteps[pageKey] || coordinatorTourSteps.usuarios
});
