import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const coterapeutaTourSteps = {
    dashboard: [
        {
            element: '.page-header',
            popover: {
                title: 'Panel del coterapeuta',
                description: 'Este es tu punto de entrada para revisar el resumen general y actualizar la información del panel.'
            }
        },
        {
            element: '.stats-grid',
            popover: {
                title: 'Indicadores clave',
                description: 'Aquí ves citas de hoy, pacientes asignados y próximas citas en un vistazo.'
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
                description: 'Filtra las citas por estado para revisar solo lo que necesitas.'
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
                description: 'Aquí revisas los datos básicos de cada paciente y abres su detalle.'
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
    configuracion: [
        {
            element: '.page-header',
            popover: {
                title: 'Configuración',
                description: 'Esta pantalla te permite cambiar tu contraseña de acceso.'
            }
        },
        {
            element: '.card',
            popover: {
                title: 'Formulario de seguridad',
                description: 'Captura tu contraseña actual y la nueva clave para guardar el cambio.'
            }
        },
        {
            element: '.form-grid',
            popover: {
                title: 'Campos de contraseña',
                description: 'Usa estos campos para completar la actualización de forma segura.'
            }
        },
        {
            element: '.form-actions',
            popover: {
                title: 'Guardar cambios',
                description: 'Aquí confirmas la actualización cuando los datos estén completos.'
            }
        }
    ]
};

export const createCoterapeutaTour = (pageKey) => driver({
    showProgress: true,
    steps: coterapeutaTourSteps[pageKey] || coterapeutaTourSteps.dashboard
});