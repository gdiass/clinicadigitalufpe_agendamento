import type { ShellUser } from '../shell-auth/shell-auth.types';

/** Perfis de negócio da Agenda. Independente do role do Shell (USER/ADMIN). */
export type Perfil = 'RECEPCAO' | 'PROFISSIONAL';

/** Resultado do PerfilProvider: qual o perfil e, se profissional, seu UUID no Cadastro. */
export interface PerfilResult {
  perfil: Perfil;
  /**
   * UUID do profissional no microsserviço Cadastro (DS-63).
   * Presente somente quando perfil === 'PROFISSIONAL'.
   */
  profissionalId?: string;
}

/** Contexto extra disponível apenas em algumas implementações (ex.: cabeçalho de dev). */
export interface PerfilContext {
  /** Valor bruto do cabeçalho HTTP X-Dev-Perfil, quando presente. */
  devPerfil?: string;
}

/**
 * Interface que toda implementação de PerfilProvider deve seguir.
 * @see MockPerfilProvider
 * @see ShellPerfilProvider
 */
export interface PerfilProvider {
  obterPerfil(user: ShellUser, ctx?: PerfilContext): PerfilResult | Promise<PerfilResult>;
}

/** Token de injeção do PerfilProvider no contêiner NestJS. */
export const PERFIL_PROVIDER = Symbol('PERFIL_PROVIDER');
