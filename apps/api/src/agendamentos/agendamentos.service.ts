import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INCLUDE_DETALHE, paraAgendamentoDto } from './agendamento-detalhe';
import { AgendamentoDto } from './agendamento.dto';

@Injectable()
export class AgendamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async obterPorId(id: string): Promise<AgendamentoDto> {
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id },
      include: INCLUDE_DETALHE,
    });

    if (!agendamento) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    return paraAgendamentoDto(agendamento);
  }
}
