import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import { AgendaDoDiaDto, AgendaDoDiaQueryDto } from './agenda.dto';
import { AgendaService } from './agenda.service';

@ApiTags('agenda')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  @ApiOperation({
    summary: 'Agenda do dia (US-12)',
    description:
      'Horários livres e agendamentos do dia, com o estado de cada um, em ordem de início. Filtra por profissional e serviço; sem filtro, mostra todos os profissionais (visão da recepção na T01).',
  })
  @ApiResponse({ status: 200, description: 'Agenda do dia', type: AgendaDoDiaDto })
  @ApiResponse({ status: 400, description: 'Data ausente, em formato inválido ou inexistente; filtro que não é UUID', type: ProblemDetailsDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ProblemDetailsDto })
  async obter(@Query() query: AgendaDoDiaQueryDto): Promise<AgendaDoDiaDto> {
    return this.agendaService.obterAgendaDoDia(query);
  }
}
