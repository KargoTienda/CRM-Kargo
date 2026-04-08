import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registrarServiceWorker } from './utils/pushNotifications';

// Registrar Service Worker para push notifications y PWA
registrarServiceWorker();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);