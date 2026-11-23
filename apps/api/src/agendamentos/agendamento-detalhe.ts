import { Prisma } from '@prisma/client';
import { AgendamentoDto } from './agendamento.dto';

export const INCLUDE_DETALHE = {
  slot: true,
  historicoStatus: { orderBy: [{ em: 'asc' }, { createdAt: 'asc' }] },
} satisfies Prisma.AgendamentoInclude;

/** Agendamento lido do banco com o slot e o histórico que o DTO precisa. */
export type AgendamentoDetalhado = Prisma.AgendamentoGetPayload<{ include: typeof INCLUDE_DETALHE }>;

function isoOuNull(data: Date | null): string | null {
  return data ? data.toISOString() : null;
}

/**
 * Converte o agendamento lido com INCLUDE_DETALHE no formato devolvido pela API.
 * Toda ação sobre agendamento responde com este mesmo formato.
 */
export function paraAgendamentoDto(agendamento: AgendamentoDetalhado): AgendamentoDto {
  return {
    id: agendamento.id,
    status: agendamento.status,
    inicio: agendamento.inicio.toISOString(),
    fim: agendamento.fim.toISOString(),
    modalidade: agendamento.modalidade,
    tipoAtendimento: agendamento.tipoAtendimento,
    paciente: { id: agendamento.pacienteId },
    profissional: { id: agendamento.profissionalId },
    clinica: { id: agendamento.clinicaId },
    servico: { id: agendamento.servicoId },
    slot: agendamento.slot
      ? { id: agendamento.slot.id, inicio: agendamento.slot.inicio.toISOString(), fim: agendamento.slot.fim.toISOString() }
      : null,
    motivo: agendamento.motivo,
    origemDemanda: agendamento.origemDemanda,
    chegadaEm: isoOuNull(agendamento.chegadaEm),
    inicioAtendimentoEm: isoOuNull(agendamento.inicioAtendimentoEm),
    fimAtendimentoEm: isoOuNull(agendamento.fimAtendimentoEm),
    canceladoEm: isoOuNull(agendamento.canceladoEm),
    motivoCancelamento: agendamento.motivoCancelamento,
    canceladoPorId: agendamento.canceladoPorId,
    agendamentoOrigemId: agendamento.agendamentoOrigemId,
    historico: agendamento.historicoStatus.map((registro) => ({
      id: registro.id,
      statusAnterior: registro.statusAnterior,
      statusNovo: registro.statusNovo,
      em: registro.em.toISOString(),
      responsavelId: registro.responsavelId,
      observacao: registro.observacao,
    })),
    createdAt: agendamento.createdAt.toISOString(),
    updatedAt: agendamento.updatedAt.toISOString(),
  };
}
