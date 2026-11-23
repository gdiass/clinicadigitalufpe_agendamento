import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import { ClinicaDto, ProfissionalDto, ServicoDto } from './cadastro.dto';
import { CADASTRO_PROVIDER_TOKEN } from './cadastro.provider';
import type { CadastroProvider } from './cadastro.provider';

@ApiTags('cadastro')
@Controller('cadastro')
export class CadastroController {
  constructor(
    @Inject(CADASTRO_PROVIDER_TOKEN)
    private readonly cadastro: CadastroProvider,
  ) {}

  @Get('profissionais')
  @ApiOperation({
    summary: 'Listar profissionais',
    description: 'Lista os profissionais do Cadastro, usada nos filtros das telas da Agenda.',
  })
  @ApiResponse({ status: 200, description: 'Lista de profissionais', type: ProfissionalDto, isArray: true })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ProblemDetailsDto })
  @ApiResponse({ status: 501, description: 'Integração com o Cadastro ainda não implementada (CADASTRO_PROVIDER=http)', type: ProblemDetailsDto })
  async listarProfissionais(): Promise<ProfissionalDto[]> {
    return this.cadastro.listarProfissionais();
  }

  @Get('servicos')
  @ApiOperation({
    summary: 'Listar serviços',
    description: 'Lista os serviços do Cadastro, usada nos filtros das telas da Agenda.',
  })
  @ApiResponse({ status: 200, description: 'Lista de serviços', type: ServicoDto, isArray: true })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ProblemDetailsDto })
  @ApiResponse({ status: 501, description: 'Integração com o Cadastro ainda não implementada (CADASTRO_PROVIDER=http)', type: ProblemDetailsDto })
  async listarServicos(): Promise<ServicoDto[]> {
    return this.cadastro.listarServicos();
  }

  @Get('clinicas')
  @ApiOperation({
    summary: 'Listar clínicas',
    description: 'Lista as clínicas do Cadastro, usada nos filtros das telas da Agenda.',
  })
  @ApiResponse({ status: 200, description: 'Lista de clínicas', type: ClinicaDto, isArray: true })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ProblemDetailsDto })
  @ApiResponse({ status: 501, description: 'Integração com o Cadastro ainda não implementada (CADASTRO_PROVIDER=http)', type: ProblemDetailsDto })
  async listarClinicas(): Promise<ClinicaDto[]> {
    return this.cadastro.listarClinicas();
  }
}