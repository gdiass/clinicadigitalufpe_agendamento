import { ForbiddenException, Injectable } from '@nestjs/common';
import type { ShellUser } from '../shell-auth/shell-auth.types';
import type { PerfilContext, PerfilProvider, PerfilResult } from './perfil.types';

/**
 * UUID fixo da Dra. Ana Lima no microsserviço Cadastro (DS-63).
 * Deve ser o mesmo UUID definido em apps/api/prisma/seed.mjs (PROF_ANA_ID).
 * Ref: seed.mjs linha 33 — `const PROF_ANA_ID = '00000000-0000-4000-a000-000000000010';`
 */
export const MOCK_PROF_ANA_UUID = '00000000-0000-4000-a000-000000000010';

/** Valores aceitos no cabeçalho X-Dev-Perfil (case-insensitive). */
const PERFIS_ACEITOS = ['RECEPCAO', 'PROFISSIONAL'] as const;

/**
 * Implementação mock do PerfilProvider.
 * Lê o cabeçalho X-Dev-Perfil para simular troca de perfil em ambiente de desenvolvimento.
 *
 * Regras:
 * - Em NODE_ENV=production, lança ForbiddenException proibindo uso de mock em produção.
 * - Cabeçalho ausente ou com valor inválido → padrão RECEPCAO.
 * - PROFISSIONAL → inclui profissionalId com o UUID da Dra. Ana Lima.
 * - Comparação case-insensitive do valor do cabeçalho.
 */
@Injectable()
export class MockPerfilProvider implements PerfilProvider {
  constructor(private readonly nodeEnv: string) {}

  obterPerfil(_user: ShellUser, ctx?: PerfilContext): PerfilResult {
    // Em produção, o mock não é permitido e lança ForbiddenException.
    if (this.nodeEnv === 'production') {
      throw new ForbiddenException('MockPerfilProvider não é permitido em ambiente de produção.');
    }

    const valorBruto = ctx?.devPerfil?.trim().toUpperCase();

    // Aceita apenas valores conhecidos; qualquer outro valor → padrão RECEPCAO.
    const perfilSolicitado = PERFIS_ACEITOS.find((p) => p === valorBruto);

    if (perfilSolicitado === 'PROFISSIONAL') {
      return {
        perfil: 'PROFISSIONAL',
        profissionalId: MOCK_PROF_ANA_UUID,
      };
    }

    return { perfil: 'RECEPCAO' };
  }
}
