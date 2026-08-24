import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { BillingProvider } from './context/BillingContext';
import { TimeProvider } from './context/TimeContext';
import { TeamTenancyProvider } from './context/TeamTenancyContext';
import { registerServiceWorker } from './registerServiceWorker';
import App from './App.tsx';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BillingProvider>
          <TeamTenancyProvider>
            <TimeProvider>
              <App />
            </TimeProvider>
          </TeamTenancyProvider>
        </BillingProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
