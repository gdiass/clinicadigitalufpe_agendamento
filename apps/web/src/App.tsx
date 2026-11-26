import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { AuthProvider } from './context/auth-context';
import { ThemeProvider } from './context/theme-context';
import { AuthLayout } from './components/layout/auth-layout';
import { ProtectedRoute } from './components/layout/protected-route';
import { AgendaPage } from './pages/agenda-page';
import { NovoAgendamentoPage } from './pages/novo-agendamento-page';
import { ConfirmacoesPage } from './pages/confirmacoes-page';
import { PacientesPage } from './pages/pacientes-page';
import { EmailsPage } from './pages/emails-page';
import { MfeRouteSyncer } from './MfeRouteSyncer';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const status = (error as { status?: number })?.status;
      
      if (window.location.port === '5174') {
        console.warn('A identidade deve ser fornecida pelo Shell em modo Standalone.');
        return;
      }

      if (status === 401) {
        const shellBaseUrl = import.meta.env.VITE_SHELL_BASE_URL ?? 'http://localhost:3000';
        window.location.href = `${shellBaseUrl}/api/v1/auth/login?returnTo=${encodeURIComponent(
          window.location.href,
        )}`;
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <MfeRouteSyncer /> 
            <Routes>
              <Route
                element={
                  <ProtectedRoute skipAuth={window.location.port === '5174'}>
                    <AuthLayout/>
                  </ProtectedRoute>
                }
              >
                {/* [VALIDAR] Rota acessada por ambos os perfis: Recepção vê agenda multiprofissional; Profissional vê sua própria agenda */}
                <Route
                  path="/schedules/home"
                  element={
                    window.location.port === '5174' ? (
                      <AgendaPage />
                    ) : (
                      <ProtectedRoute requiredPerfil={['RECEPCAO', 'PROFISSIONAL']}>
                        <AgendaPage />
                      </ProtectedRoute>
                    )
                  }
                />
                <Route path="/schedules" element={<Navigate to="/schedules/home" replace />} />
                <Route
                  path="/schedules/new"
                  element={
                    window.location.port === '5174' ? (
                      <NovoAgendamentoPage />
                    ) : (
                      <ProtectedRoute requiredPerfil="RECEPCAO">
                        <NovoAgendamentoPage />
                      </ProtectedRoute>
                    )
                  }
                />
                <Route
                  path="/schedules/confirmations"
                  element={
                    window.location.port === '5174' ? (
                      <ConfirmacoesPage />
                    ) : (
                      <ProtectedRoute requiredPerfil="RECEPCAO">
                        <ConfirmacoesPage />
                      </ProtectedRoute>
                    )
                  }
                />
                <Route
                  path="/schedules/patients"
                  element={
                    window.location.port === '5174' ? (
                      <PacientesPage />
                    ) : (
                      <ProtectedRoute requiredPerfil="RECEPCAO">
                        <PacientesPage />
                      </ProtectedRoute>
                    )
                  }
                />
                <Route
                  path="/schedules/emails"
                  element={
                    window.location.port === '5174' ? (
                      <EmailsPage />
                    ) : (
                      <ProtectedRoute requiredPerfil="RECEPCAO">
                        <EmailsPage />
                      </ProtectedRoute>
                    )
                  }
                />
                {/* [VALIDAR] A rota /schedules/meu-atendimento (atendimento clínico pelo profissional) ainda não existe no router e deve ser criada em task futura. */}
              </Route>

              <Route 
                path="*" 
                element={
                  window.location.port === '5174' ? (
                    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
                      <h2>MFE Tasks (Porta 5174)</h2>
                      <p>Abra esta aplicação pelo Shell para fornecer a identidade autenticada.</p>
                      <button onClick={() => window.location.href = '/'}>Ir para Raiz</button>
                    </div>
                  ) : (
                    <Navigate to="/schedules" replace />
                  )
                } 
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
