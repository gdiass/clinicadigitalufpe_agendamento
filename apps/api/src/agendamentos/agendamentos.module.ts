import { Module } from '@nestjs/common';
import { AgendamentoEstadoService } from './agendamento-estado.service';

@Module({
  providers: [AgendamentoEstadoService],
  exports: [AgendamentoEstadoService],
})
export class AgendamentosModule {}
