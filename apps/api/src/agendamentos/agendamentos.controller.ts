import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import { AgendamentoDto } from './agendamento.dto';
import { AgendamentosService } from './agendamentos.service';

@ApiTags('agendamentos')
@Controller('agendamentos')
export class AgendamentosController {
  constructor(private readonly agendamentosService: AgendamentosService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe do agendamento',
    description: 'Devolve o estado, os horários, o slot, os participantes e o histórico de status do agendamento.',
  })
  @ApiResponse({ status: 200, description: 'Agendamento encontrado', type: AgendamentoDto })
  @ApiResponse({ status: 400, description: 'Id inválido (não é UUID)', type: ProblemDetailsDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ProblemDetailsDto })
  @ApiResponse({ status: 404, description: 'Agendamento não encontrado', type: ProblemDetailsDto })
  async obter(@Param('id', ParseUUIDPipe) id: string): Promise<AgendamentoDto> {
    return this.agendamentosService.obterPorId(id);
  }
}
