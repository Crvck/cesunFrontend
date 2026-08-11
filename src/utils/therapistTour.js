import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const therapistTourSteps = {
    dashboard: [
        {
            element: '.page-header',
            popover: {
                title: 'Panel del terapeuta',
                description: 'Este es tu punto de entrada para revisar el estado general y actualizar la información del panel.'
            }
        },
        {
            element: '.stats-grid',
            popover: {
                title: 'Indicadores clave',
                description: 'Aquí ves pacientes activos, citas del día y citas completadas en un vistazo.'
            }
        },
        {
            element: '.dashboard-content-grid',
            popover: {
                title: 'Bloques principales',
                description: 'Esta sección concentra tus citas de hoy y los pacientes asignados.'
            }
        },
        {
            element: '.dashboard-content-grid .dashboard-section:nth-child(1)',
            popover: {
                title: 'Citas de hoy',
                description: 'Revisa las citas programadas y entra al calendario cuando necesites más detalle.'
            }
        },
        {
            element: '.dashboard-content-grid .dashboard-section:nth-child(2)',
            popover: {
                title: 'Mis pacientes',
                description: 'Desde este bloque puedes abrir la lista completa de pacientes asignados.'
            }
        }
    ],
    citas: [
        {
            element: '.page-header',
            popover: {
                title: 'Mis citas',
                description: 'Aquí administras tu agenda semanal y consultas el estado de cada cita.'
            }
        },
        {
            element: '.calendar-controls',
            popover: {
                title: 'Navegación de agenda',
                description: 'Usa estas opciones para cambiar de semana o volver a hoy rápidamente.'
            }
        },
        {
            element: '.filters-container',
            popover: {
                title: 'Filtros',
                description: 'Filtra las citas por becario o por estado para revisar solo lo que necesitas.'
            }
        },
        {
            element: '.calendar-week-view',
            popover: {
                title: 'Calendario semanal',
                description: 'Este bloque muestra la disponibilidad y las citas distribuidas por día y hora.'
            }
        },
        {
            element: '.day-citas-list',
            popover: {
                title: 'Listado de citas',
                description: 'Aquí aparece el detalle de las citas visibles en la semana seleccionada.'
            }
        }
    ],
    pacientes: [
        {
            element: '.page-header',
            popover: {
                title: 'Mis pacientes',
                description: 'Desde esta vista gestionas los pacientes que tienes asignados.'
            }
        },
        {
            element: '.filters-container',
            popover: {
                title: 'Búsqueda y filtros',
                description: 'Localiza pacientes por nombre o filtra por estado de tratamiento.'
            }
        },
        {
            element: '.table-container',
            popover: {
                title: 'Listado principal',
                description: 'Aquí revisas los datos clínicos básicos y abres los detalles del paciente.'
            }
        },
        {
            element: '.grid-3.mt-20',
            popover: {
                title: 'Resumen y acciones',
                description: 'Consulta el total de pacientes, sesiones realizadas y exporta el listado.'
            }
        }
    ],
    sesiones: [
        {
            element: '.page-header',
            popover: {
                title: 'Registro de sesiones',
                description: 'Aquí capturas y consultas las sesiones terapéuticas registradas.'
            }
        },
        {
            element: '.config-content',
            popover: {
                title: 'Sesiones registradas',
                description: 'En este bloque ves el historial de sesiones guardadas.'
            }
        },
        {
            element: '.sesiones-list, .no-citas',
            popover: {
                title: 'Listado o estado vacío',
                description: 'Según tus registros verás las sesiones disponibles o un mensaje de estado vacío.'
            }
        },
        {
            element: '.btn-primary',
            popover: {
                title: 'Nueva sesión',
                description: 'Abre este formulario para registrar una nueva sesión cuando la necesites.'
            }
        }
    ],
    expedientes: [
        {
            element: '.page-header',
            popover: {
                title: 'Expedientes clínicos',
                description: 'Consulta aquí el historial clínico completo de tus pacientes.'
            }
        },
        {
            element: '.search-box',
            popover: {
                title: 'Búsqueda rápida',
                description: 'Usa este buscador para localizar un expediente por nombre o diagnóstico.'
            }
        },
        {
            element: '.grid-2.gap-20',
            popover: {
                title: 'Tarjetas de expedientes',
                description: 'Cada tarjeta concentra los accesos al detalle y a la exportación del expediente.'
            }
        }
    ],
    supervision: [
        {
            element: '.page-header',
            popover: {
                title: 'Supervisión de becarios',
                description: 'Desde aquí revisas el seguimiento y la retroalimentación de tus becarios.'
            }
        },
        {
            element: '.config-content',
            popover: {
                title: 'Listado de becarios',
                description: 'Aquí aparece cada becario con su estado de supervisión y observaciones pendientes.'
            }
        },
        {
            element: '.grid-2.gap-20.mt-20',
            popover: {
                title: 'Detalle y seguimiento',
                description: 'Consulta los bloques de información y entra a los controles de seguimiento.'
            }
        }
    ],
    configuracion: [
        {
            element: '.page-header',
            popover: {
                title: 'Cambiar contraseña',
                description: 'Esta vista te permite actualizar tu contraseña y reforzar la seguridad de tu cuenta.'
            }
        },
        {
            element: '.card',
            popover: {
                title: 'Formulario de seguridad',
                description: 'Captura tu contraseña actual y la nueva clave para guardar el cambio.'
            }
        }
    ]
};

export const createTherapistTour = (pageKey) => driver({
    showProgress: true,
    steps: therapistTourSteps[pageKey] || therapistTourSteps.dashboard
});