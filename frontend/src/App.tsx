import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { DatosProvider } from './contexts/DatosContext';
import { MensajesProvider } from './contexts/MensajesContext';
import { NotificacionesProvider } from './contexts/NotificacionesContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Catalogo from './components/catalogo/Catalogo';
import Finanzas from './components/finanzas/Finanzas';
import MercadoLibre from './components/mercadolibre/MercadoLibre';
import Flex from './components/flex/Flex';
import Mensajes from './components/mensajes/Mensajes';
import Configuracion from './components/configuracion/Configuracion';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ComingSoon: React.FC<{ title: string }> = ({ title }) => (
  <div className="text-center py-20">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#e6edf5' }}>
      <span className="text-2xl font-bold" style={{ color: '#004085' }}>K</span>
    </div>
    <h1 className="text-2xl font-bold mb-2" style={{ color: '#004085' }}>{title}</h1>
    <p className="text-gray-400">Este módulo está en construcción</p>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificacionesProvider>
        <DatosProvider>
        <MensajesProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<LoginForm />} />

              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="" element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="catalogo" element={<Catalogo />} />
                <Route path="finanzas" element={<Finanzas />} />
                <Route path="mercadolibre" element={<MercadoLibre />} />
                <Route path="flex" element={<Flex />} />
                <Route path="instagram" element={<ComingSoon title="Instagram" />} />
                <Route path="mensajes" element={<Mensajes />} />
                <Route path="configuracion" element={<Configuracion />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#3A3A3A', color: '#fff' },
                success: {
                  duration: 3000,
                  iconTheme: { primary: '#D35400', secondary: '#fff' },
                },
                error: {
                  duration: 5000,
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                },
              }}
            />
          </div>
        </Router>
        </MensajesProvider>
        </DatosProvider>
        </NotificacionesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
