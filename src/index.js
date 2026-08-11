import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';
import './App.css';

// Importa los estilos de los modales
import './components/Common/ConfirmModal.css';
import './components/Common/NotificationModal.css';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);