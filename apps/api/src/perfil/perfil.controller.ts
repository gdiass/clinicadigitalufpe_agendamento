import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { ApiHeaders, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import { CurrentUser } from '../shell-auth/shell-auth.decorators';
import type { ShellUser } from '../shell-auth/shell-auth.types';
import { PerfilDto } from './perfil.dto';
import { PERFIL_PROVIDER, type PerfilProvider } from './perfil.types';

@ApiTags('perfil')
@Controller('perfil')
export class PerfilController {
  constructor(@Inject(PERFIL_PROVIDER) private readonly provider: PerfilProvider) {}

  @Get('me')
  @ApiOperation({
    summary: 'Obter perfil de negócio do usuário autenticado',
    description:
      'Retorna o perfil de acesso do usuário na Agenda (RECEPCAO ou PROFISSIONAL) ' +
      'e, quando aplicável, o UUID do profissional no Cadastro (DS-63). ' +
      'Em modo desenvolvimento (PERFIL_PROVIDER=mock), o perfil pode ser simulado ' +
      'via cabeçalho X-Dev-Perfil.',
  })
  @ApiHeaders([
    {
      name: 'X-Dev-Perfil',
      description:
        'Apenas em desenvolvimento (PERFIL_PROVIDER=mock): ' +
        'valor RECEPCAO ou PROFISSIONAL para simular perfil.',
      required: false,
    },
  ])
  @ApiOkResponse({ type: PerfilDto, description: 'Perfil do usuário na Agenda.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.', type: ProblemDetailsDto })
  @ApiResponse({
    status: 403,
    description:
      'Papel do Shell não mapeado a um perfil de Agenda. ' +
      'Configure RECEPCAO ou PROFISSIONAL no Shell (DS-65). [VALIDAR]',
    type: ProblemDetailsDto,
  })
  @ApiResponse({ status: 503, description: 'Shell indisponível.', type: ProblemDetailsDto })
  async me(
    @CurrentUser() user: ShellUser,
    @Headers('x-dev-perfil') devPerfil?: string,
  ): Promise<PerfilDto> {
    const result = await this.provider.obterPerfil(user, { devPerfil });
    const dto = new PerfilDto();
    dto.perfil = result.perfil;
    if (result.profissionalId !== undefined) {
      dto.profissionalId = result.profissionalId;
    }
    return dto;
  }
}
