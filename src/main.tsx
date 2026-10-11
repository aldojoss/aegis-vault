import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { initializePlatform } from './platform/android';

initializePlatform().then(() => ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)).catch(() => {
  const root = document.getElementById('root')!;
  root.textContent = 'No se pudo conectar con el almacenamiento del teléfono. Cierra y vuelve a abrir Aegis Vault. No se ha creado ni reemplazado ninguna bóveda.';
  root.style.padding = '32px';
});
