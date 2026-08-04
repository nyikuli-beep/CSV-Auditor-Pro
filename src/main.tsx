import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { PersonalizationProvider } from './context/PersonalizationContext';
import { registerServiceWorker } from './registerServiceWorker';
import App from './App.tsx';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PersonalizationProvider>
          <App />
        </PersonalizationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
