import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const psychopedagogicoTourSteps = {
    dashboard: [
        {
            element: '.page-header',
            popover: {
                title: 'Panel del psicopedagógico',
                description: 'Este es tu punto de entrada para revisar el estado general del panel y actualizar la información.'
            }
        },
        {
            element: '.stats-grid',
            popover: {
                title: 'Indicadores clave',
                description: 'Aquí ves pacientes activos, citas de hoy, citas de la semana y becarios asignados.'
            }
        },
        {
            element: '.citas-list',
            popover: {
                title: 'Citas de hoy',
                description: 'Este bloque resume tus citas más recientes y te ayuda a revisar la agenda actual.'
            }
        },
        {
            element: '.pacientes-list',
            popover: {
                title: 'Becarios asignados',
                description: 'Aquí revisas los becarios asignados y su carga de seguimiento.'
            }
        }
    ],
    pacientes: [
        {
            element: '.page-header',
            popover: {
                title: 'Mis pacientes',
                description: 'Desde esta vista administras los pacientes en tratamiento y su seguimiento.'
            }
        },
        {
            element: '.filters-container',
            popover: {
                title: 'Búsqueda y filtros',
                description: 'Usa estos controles para localizar pacientes por nombre o estado de tratamiento.'
            }
        },
        {
            element: '.table-container',
            popover: {
                title: 'Listado principal',
                description: 'En esta tabla revisas el estado, becario asignado, sesiones y acciones rápidas.'
            }
        },
        {
            element: '.grid-3.mt-20',
            popover: {
                title: 'Resumen y acciones',
                description: 'Consulta métricas rápidas y usa las acciones de exportación o reporte.'
            }
        }
    ]
};

export const createPsychopedagogicoTour = (pageKey) => driver({
    showProgress: true,
    steps: psychopedagogicoTourSteps[pageKey] || psychopedagogicoTourSteps.dashboard
});