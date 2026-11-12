import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/auth-context';
import { perfilControllerMe } from '../lib/api-client';
import type { PerfilDto, PerfilDtoPerfil } from '../lib/api-client/models';

export type Perfil = PerfilDtoPerfil;

export interface UsePerfilResult {
  perfil: Perfil | undefined;
  profissionalId: string | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

export const PERFIL_QUERY_KEY = ['perfil', 'me'] as const;

export function usePerfil(): UsePerfilResult {
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: PERFIL_QUERY_KEY,
    queryFn: async (): Promise<PerfilDto> => {
      const response = await perfilControllerMe();
      if (response.status === 200) {
        return response.data;
      }
      throw response.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minuto
  });

  return {
    perfil: query.data?.perfil,
    profissionalId: query.data?.profissionalId,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
