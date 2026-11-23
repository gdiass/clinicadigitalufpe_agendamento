import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusAgendamento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type AgendamentoDetalhado, INCLUDE_DETALHE } from './agendamento-detalhe';

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

export const CAMPOS_DA_TRANSICAO = [
  'chegadaEm',
  'inicioAtendimentoEm',
  'fimAtendimentoEm',
  'canceladoEm',
  'motivoCancelamento',
  'canceladoPorId',
] as const;

/**
 * Campos que uma ação grava no agendamento junto com a troca de estado, na mesma transação.
 * Uma ação que precise de outro campo o acrescenta em CAMPOS_DA_TRANSICAO.
 */
export type CamposDaTransicao = Pick<Prisma.AgendamentoUncheckedUpdateManyInput, (typeof CAMPOS_DA_TRANSICAO)[number]>;

/**
 * Copia só os campos permitidos. O tipo já restringe em compilação; aqui a restrição vale também
 * para objetos montados com spread ou cast, que poderiam levar slotId, pacienteId etc. ao update.
 */
export function somenteCamposPermitidos(campos: CamposDaTransicao): CamposDaTransicao {
  const permitidos: Record<string, unknown> = {};
  for (const campo of CAMPOS_DA_TRANSICAO) {
    if (Object.prototype.hasOwnProperty.call(campos, campo)) {
      permitidos[campo] = campos[campo];
    }
  }
  return permitidos as CamposDaTransicao;
}

@Injectable()
export class AgendamentoEstadoService {
  constructor(private readonly prisma: PrismaService) {}

  async transicionar(
    agendamentoId: string,
    novoStatus: StatusAgendamento,
    responsavelId: string,
    observacao?: string,
    campos: CamposDaTransicao = {},
  ): Promise<AgendamentoDetalhado> {
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
          ...somenteCamposPermitidos(campos),
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
        include: INCLUDE_DETALHE,
      });

      return agendamentoAtualizado;
    });
  }
}
