import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Perfil } from '../../hooks/use-perfil';

const DEV_PERFIL_KEY = 'dev_perfil';

function getStoredDevPerfil(): Perfil {
  if (typeof window === 'undefined') return 'RECEPCAO';
  try {
    const stored = window.localStorage.getItem(DEV_PERFIL_KEY);
    if (stored === 'PROFISSIONAL' || stored === 'RECEPCAO') {
      return stored;
    }
  } catch {
    // Falha silenciosa no acesso ao localStorage
  }
  return 'RECEPCAO';
}

function DevProfileSelectorInner() {
  const queryClient = useQueryClient();
  const [perfilAtual, setPerfilAtual] = useState<Perfil>(getStoredDevPerfil);

  useEffect(() => {
    // Garante valor inicial no localStorage se não houver
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(DEV_PERFIL_KEY);
        if (!stored) {
          window.localStorage.setItem(DEV_PERFIL_KEY, 'RECEPCAO');
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const trocarPerfil = async (novoPerfil: Perfil) => {
    if (novoPerfil === perfilAtual) return;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DEV_PERFIL_KEY, novoPerfil);
      }
    } catch {
      // ignore
    }
    setPerfilAtual(novoPerfil);
    await queryClient.invalidateQueries();
  };

  return (
    <aside
      aria-label="Seletor de Perfil em Desenvolvimento"
      className="bg-surface-subtle border-b border-line px-4 py-2 text-xs flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-warning-text bg-warning-subtle px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
          Dev Mode
        </span>
        <span className="text-muted">Simular perfil (cabeçalho X-Dev-Perfil):</span>
      </div>
      <div className="inline-flex rounded-lg border border-line p-0.5 bg-canvas">
        <button
          type="button"
          onClick={() => trocarPerfil('RECEPCAO')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            perfilAtual === 'RECEPCAO'
              ? 'bg-primary text-primary-contrast shadow-xs'
              : 'text-body hover:text-heading hover:bg-surface-hover'
          }`}
          data-testid="dev-select-recepcao"
        >
          Recepção
        </button>
        <button
          type="button"
          onClick={() => trocarPerfil('PROFISSIONAL')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            perfilAtual === 'PROFISSIONAL'
              ? 'bg-primary text-primary-contrast shadow-xs'
              : 'text-body hover:text-heading hover:bg-surface-hover'
          }`}
          data-testid="dev-select-profissional"
        >
          Profissional (Dra. Ana)
        </button>
      </div>
    </aside>
  );
}

export function DevProfileSelector() {
  if (!import.meta.env.DEV || typeof document === 'undefined') {
    return null;
  }

  return <DevProfileSelectorInner />;
}
