import { ForbiddenException, Injectable } from '@nestjs/common';
import type { ShellUser } from '../shell-auth/shell-auth.types';
import type { PerfilContext, PerfilProvider, PerfilResult } from './perfil.types';

/**
 * Implementação real do PerfilProvider, para uso quando o Shell é a fonte de verdade.
 *
 * Mapeamento de roles Shell → perfil da Agenda:
 * - 'RECEPCAO'    → RECEPCAO
 * - 'PROFISSIONAL' → PROFISSIONAL
 * - 'USER' / 'ADMIN' → 403 ForbiddenException
 *   [VALIDAR] Definir qual perfil USER e ADMIN devem receber quando o Shell não emitir
 *   roles específicos da Agenda. Por ora, lança 403 para forçar revisão.
 *
 * Vínculo usuário Shell ↔ profissional:
 * [VALIDAR] O Shell não fornece profissionalId. Esse vínculo depende do microsserviço
 * Cadastro (DS-63). Enquanto não existir integração, profissionalId fica como undefined.
 */
@Injectable()
export class ShellPerfilProvider implements PerfilProvider {
  obterPerfil(user: ShellUser, _ctx?: PerfilContext): PerfilResult {
    if (user.role === 'RECEPCAO') {
      return { perfil: 'RECEPCAO' };
    }

    if (user.role === 'PROFISSIONAL') {
      // [VALIDAR] profissionalId deve vir do Cadastro (DS-63); por ora undefined.
      return { perfil: 'PROFISSIONAL', profissionalId: undefined };
    }

    // [VALIDAR] USER e ADMIN não têm perfil de Agenda definido.
    // Quando o Shell passar a emitir RECEPCAO/PROFISSIONAL (DS-65),
    // este bloco deve ser revisado ou removido.
    throw new ForbiddenException(
      `O papel "${user.role}" não está mapeado a um perfil da Agenda. ` +
        'Configure o papel RECEPCAO ou PROFISSIONAL no Shell (DS-65).',
    );
  }
}
