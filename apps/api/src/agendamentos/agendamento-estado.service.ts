import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Agendamento, StatusAgendamento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// A transição AGENDADO → CHEGOU está marcada [VALIDAR] na seção 1.6 do dicionário,
// e há pendência se atendimento REMOTO pode ir direto a EM_ATENDIMENTO.
export const TRANSICOES_PERMITIDAS: Record<StatusAgendamento, StatusAgendamento[]> = {
  [StatusAgendamento.AGENDADO]: [
    StatusAgendamento.CONFIRMADO,
    StatusAgendamento.CHEGOU,
    StatusAgendamento.CANCELADO,
    StatusAgendamento.REMARCADO,
    StatusAgendamento.FALTOU,
  ],
  [StatusAgendamento.CONFIRMADO]: [
    StatusAgendamento.CHEGOU,
    StatusAgendamento.CANCELADO,
    StatusAgendamento.REMARCADO,
    StatusAgendamento.FALTOU,
  ],
  [StatusAgendamento.CHEGOU]: [StatusAgendamento.EM_ATENDIMENTO],
  [StatusAgendamento.EM_ATENDIMENTO]: [StatusAgendamento.REALIZADO],
  [StatusAgendamento.REALIZADO]: [],
  [StatusAgendamento.CANCELADO]: [],
  [StatusAgendamento.REMARCADO]: [],
  [StatusAgendamento.FALTOU]: [],
};

@Injectable()
export class AgendamentoEstadoService {
  constructor(private readonly prisma: PrismaService) {}

  async transicionar(
    agendamentoId: string,
    novoStatus: StatusAgendamento,
    responsavelId: string,
    observacao?: string,
  ): Promise<Agendamento> {
    if (!responsavelId || !responsavelId.trim()) {
      throw new BadRequestException('Responsável é obrigatório.');
    }

    return this.prisma.$transaction(async (tx) => {
      const agendamento = await tx.agendamento.findUnique({
        where: { id: agendamentoId },
      });

      if (!agendamento) {
        throw new NotFoundException('Agendamento não encontrado.');
      }

      const permitidos = TRANSICOES_PERMITIDAS[agendamento.status] || [];
      if (!permitidos.includes(novoStatus)) {
        throw new ConflictException(
          `Não é possível passar de ${agendamento.status} para ${novoStatus}.`,
        );
      }

      const updateResult = await tx.agendamento.updateMany({
        where: {
          id: agendamentoId,
          status: agendamento.status,
        },
        data: {
          status: novoStatus,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException('O agendamento foi alterado por outra operação.');
      }

      await tx.historicoStatus.create({
        data: {
          agendamentoId,
          statusAnterior: agendamento.status,
          statusNovo: novoStatus,
          em: new Date(),
          responsavelId: responsavelId.trim(),
          observacao: observacao?.trim() || null,
        },
      });

      const agendamentoAtualizado = await tx.agendamento.findUniqueOrThrow({
        where: { id: agendamentoId },
      });

      return agendamentoAtualizado;
    });
  }
}
