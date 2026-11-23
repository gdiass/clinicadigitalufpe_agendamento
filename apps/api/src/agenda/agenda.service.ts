import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StatusAgendamento } from '@prisma/client';
import { STATUS_QUE_LIBERAM_SLOT } from '../agendamentos/ocupacao-slot';
import { ehDataValida, instanteEmRecife, paraColunaDate } from '../disponibilidades/horario';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaDoDiaDto, AgendaDoDiaQueryDto, HorarioDaAgendaDto } from './agenda.dto';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const INCLUDE_SLOTS_DA_AGENDA = {
  slots: {
    include: {
      _count: {
        select: { agendamentos: { where: { status: { notIn: STATUS_QUE_LIBERAM_SLOT } } } },
      },
    },
  },
} satisfies Prisma.DisponibilidadeInclude;

const SELECT_AGENDAMENTO_DA_AGENDA = {
  id: true,
  slotId: true,
  status: true,
  pacienteId: true,
  profissionalId: true,
  servicoId: true,
  clinicaId: true,
  inicio: true,
  fim: true,
  modalidade: true,
  tipoAtendimento: true,
} satisfies Prisma.AgendamentoSelect;

/** Disponibilidade do dia com os slots e quantos agendamentos ativos cada um tem. */
export type DisponibilidadeDaAgenda = Prisma.DisponibilidadeGetPayload<{ include: typeof INCLUDE_SLOTS_DA_AGENDA }>;

/** Campos do agendamento que a agenda do dia mostra. */
export type AgendamentoDaAgenda = Prisma.AgendamentoGetPayload<{ select: typeof SELECT_AGENDAMENTO_DA_AGENDA }>;

/** Diz se o agendamento já não segura o slot (CANCELADO ou REMARCADO). */
function liberouOSlot(status: StatusAgendamento): boolean {
  return STATUS_QUE_LIBERAM_SLOT.includes(status);
}

/**
 * Posição da linha entre as que têm o mesmo horário e profissional: o agendamento
 * ativo vem primeiro, depois o horário livre e por último os que liberaram o slot,
 * para o cancelado das 08:00 ficar logo abaixo do 08:00 livre.
 */
function grupoDaLinha(horario: HorarioDaAgendaDto): number {
  if (!horario.agendamento) return 1;
  return liberouOSlot(horario.agendamento.status) ? 2 : 0;
}

/** Chave de desempate estável entre linhas do mesmo grupo. */
function chaveDaLinha(horario: HorarioDaAgendaDto): string {
  return `${horario.servico.id}|${horario.agendamento?.id ?? horario.slotId ?? ''}`;
}

/** Ordem da agenda: início, profissional, grupo da linha e desempate estável. */
export function compararHorarios(a: HorarioDaAgendaDto, b: HorarioDaAgendaDto): number {
  return (
    a.inicio.localeCompare(b.inicio) ||
    a.profissional.id.localeCompare(b.profissional.id) ||
    grupoDaLinha(a) - grupoDaLinha(b) ||
    chaveDaLinha(a).localeCompare(chaveDaLinha(b))
  );
}

/**
 * Monta as linhas da agenda do dia. Cada slot sem agendamento ativo vira um horário
 * livre (RN01). Cada agendamento do dia vira uma linha com o seu estado, inclusive os
 * que não têm slot (encaixe) e os cancelados ou remarcados, cujo slot aparece livre.
 */
export function montarHorarios(
  disponibilidades: DisponibilidadeDaAgenda[],
  agendamentos: AgendamentoDaAgenda[],
): HorarioDaAgendaDto[] {
  const livres: HorarioDaAgendaDto[] = disponibilidades.flatMap((disponibilidade) =>
    disponibilidade.slots
      .filter((slot) => slot._count.agendamentos === 0)
      .map((slot) => ({
        inicio: slot.inicio.toISOString(),
        fim: slot.fim.toISOString(),
        profissional: { id: disponibilidade.profissionalId },
        servico: { id: disponibilidade.servicoId },
        clinica: { id: disponibilidade.clinicaId },
        modalidade: disponibilidade.modalidade,
        slotId: slot.id,
        agendamento: null,
      })),
  );

  const ocupados: HorarioDaAgendaDto[] = agendamentos.map((agendamento) => ({
    inicio: agendamento.inicio.toISOString(),
    fim: agendamento.fim.toISOString(),
    profissional: { id: agendamento.profissionalId },
    servico: { id: agendamento.servicoId },
    clinica: { id: agendamento.clinicaId },
    modalidade: agendamento.modalidade,
    slotId: agendamento.slotId,
    agendamento: {
      id: agendamento.id,
      status: agendamento.status,
      paciente: { id: agendamento.pacienteId },
      tipoAtendimento: agendamento.tipoAtendimento,
    },
  }));

  return [...livres, ...ocupados].sort(compararHorarios);
}

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async obterAgendaDoDia(query: AgendaDoDiaQueryDto): Promise<AgendaDoDiaDto> {
    if (!ehDataValida(query.data)) {
      const mensagem = 'data não existe no calendário.';
      throw new BadRequestException({ message: mensagem, errors: { data: [mensagem] } });
    }

    const inicioDoDia = instanteEmRecife(query.data, 0);
    const fimDoDia = new Date(inicioDoDia.getTime() + MS_POR_DIA);
    const filtros = {
      ...(query.profissionalId ? { profissionalId: query.profissionalId } : {}),
      ...(query.servicoId ? { servicoId: query.servicoId } : {}),
    };

    const [disponibilidades, agendamentos] = await Promise.all([
      this.prisma.disponibilidade.findMany({
        where: { ...filtros, data: paraColunaDate(query.data) },
        include: INCLUDE_SLOTS_DA_AGENDA,
      }),
      this.prisma.agendamento.findMany({
        where: { ...filtros, inicio: { gte: inicioDoDia, lt: fimDoDia } },
        select: SELECT_AGENDAMENTO_DA_AGENDA,
      }),
    ]);

    return {
      data: query.data,
      temDisponibilidade: disponibilidades.length > 0,
      horarios: montarHorarios(disponibilidades, agendamentos),
    };
  }
}
