import { Module } from '@nestjs/common';
import { ACOES_CONTROLLERS, ACOES_PROVIDERS } from './acoes';
import { AgendamentoEstadoService } from './agendamento-estado.service';
import { AgendamentosController } from './agendamentos.controller';
import { AgendamentosService } from './agendamentos.service';

@Module({
  controllers: [AgendamentosController, ...ACOES_CONTROLLERS],
  providers: [AgendamentosService, AgendamentoEstadoService, ...ACOES_PROVIDERS],
  exports: [AgendamentosService, AgendamentoEstadoService],
})
export class AgendamentosModule {}
