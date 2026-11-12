import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { usePerfil, type Perfil } from '../../hooks/use-perfil';
import { LoadingState } from '../ui/state-feedback';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'USER';
  requiredPerfil?: Perfil | Perfil[];
  skipAuth?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPerfil,
  skipAuth,
}: ProtectedRouteProps) {
  // Chamada incondicional de todos os hooks para manter ordem estável de renderização
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { perfil, isLoading: isPerfilLoading, isError: isPerfilError } = usePerfil();
  const location = useLocation();

  if (skipAuth) {
    return <>{children}</>;
  }

  if (isAuthLoading || (requiredPerfil && isPerfilLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState message="Verificando sessão segura..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-6 bg-danger-subtle/40 border border-danger-line rounded-xl">
          <h2 className="text-lg font-bold text-danger-text">Acesso Restrito</h2>
          <p className="text-sm text-danger-text mt-2">
            Esta funcionalidade requer privilégios de <strong>{requiredRole}</strong>. Seu papel atual é <strong>{user?.role}</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (requiredPerfil) {
    if (isPerfilError || !perfil) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 bg-danger-subtle/40 border border-danger-line rounded-xl">
            <h2 className="text-lg font-bold text-danger-text">Erro ao Carregar Perfil</h2>
            <p className="text-sm text-danger-text mt-2">
              Não foi possível identificar seu perfil na Agenda. Verifique sua conexão ou tente novamente mais tarde.
            </p>
          </div>
        </div>
      );
    }

    const perfisPermitidos = Array.isArray(requiredPerfil) ? requiredPerfil : [requiredPerfil];
    if (!perfisPermitidos.includes(perfil)) {
      const formatarNome = (p: Perfil) => (p === 'RECEPCAO' ? 'Recepção' : 'Profissional');
      const perfilEsperadoTexto = perfisPermitidos.map(formatarNome).join(' ou ');
      const perfilAtualTexto = formatarNome(perfil);

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md p-6 bg-danger-subtle/40 border border-danger-line rounded-xl">
            <h2 className="text-lg font-bold text-danger-text">Acesso Restrito</h2>
            <p className="text-sm text-danger-text mt-2">
              Esta funcionalidade é exclusiva do perfil <strong>{perfilEsperadoTexto}</strong>. Seu perfil atual é <strong>{perfilAtualTexto}</strong>.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
