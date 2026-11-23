import { BadRequestException } from '@nestjs/common';
import { Modalidade, StatusAgendamento, TipoAtendimento } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import {
  type AgendamentoDaAgenda,
  AgendaService,
  type DisponibilidadeDaAgenda,
  montarHorarios,
} from './agenda.service';

const CLINICA = '00000000-0000-4000-a000-000000000001';
const FISIOTERAPIA = '00000000-0000-4000-a000-000000000002';
const AVALIACAO_FUNCIONAL = '00000000-0000-4000-a000-000000000003';
const DRA_ANA = '00000000-0000-4000-a000-000000000010';
const DR_RUI = '00000000-0000-4000-a000-000000000011';
const CARLOS = '00000000-0000-4000-a000-000000000020';
const MARIA = '00000000-0000-4000-a000-000000000022';

function slot(id: string, inicio: string, fim: string, ativos = 0) {
  return {
    id,
    disponibilidadeId: 'disp',
    inicio: new Date(inicio),
    fim: new Date(fim),
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    _count: { agendamentos: ativos },
  };
}

function disponibilidade(
  profissionalId: string,
  servicoId: string,
  slots: DisponibilidadeDaAgenda['slots'],
  modalidade: Modalidade = Modalidade.PRESENCIAL,
): DisponibilidadeDaAgenda {
  return {
    id: `disp-${profissionalId}-${servicoId}`,
    profissionalId,
    clinicaId: CLINICA,
    servicoId,
    data: new Date('2026-10-06T00:00:00.000Z'),
    inicio: new Date('1970-01-01T08:00:00.000Z'),
    fim: new Date('1970-01-01T12:00:00.000Z'),
    modalidade,
    duracaoSlotMin: 30,
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    slots,
  };
}

function agendamento(extra: Partial<AgendamentoDaAgenda> & Pick<AgendamentoDaAgenda, 'id'>): AgendamentoDaAgenda {
  return {
    slotId: null,
    status: StatusAgendamento.AGENDADO,
    pacienteId: CARLOS,
    profissionalId: DRA_ANA,
    servicoId: FISIOTERAPIA,
    clinicaId: CLINICA,
    inicio: new Date('2026-10-06T11:00:00.000Z'),
    fim: new Date('2026-10-06T11:30:00.000Z'),
    modalidade: Modalidade.PRESENCIAL,
    tipoAtendimento: TipoAtendimento.CONSULTA,
    ...extra,
  };
}

describe('montarHorarios', () => {
  it('slot sem agendamento ativo vira horário livre com os dados da disponibilidade', () => {
    const horarios = montarHorarios(
      [disponibilidade(DRA_ANA, FISIOTERAPIA, [slot('s1', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z')], Modalidade.REMOTO)],
      [],
    );

    expect(horarios).toEqual([
      {
        inicio: '2026-10-06T11:00:00.000Z',
        fim: '2026-10-06T11:30:00.000Z',
        profissional: { id: DRA_ANA },
        servico: { id: FISIOTERAPIA },
        clinica: { id: CLINICA },
        modalidade: Modalidade.REMOTO,
        slotId: 's1',
        agendamento: null,
      },
    ]);
  });

  it('slot ocupado não gera linha livre: só a linha do agendamento, com estado, paciente e tipo', () => {
    const horarios = montarHorarios(
      [disponibilidade(DRA_ANA, FISIOTERAPIA, [slot('s1', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z', 1)])],
      [
        agendamento({
          id: 'a1',
          slotId: 's1',
          status: StatusAgendamento.CONFIRMADO,
          tipoAtendimento: TipoAtendimento.AVALIACAO,
          modalidade: Modalidade.REMOTO,
        }),
      ],
    );

    expect(horarios).toEqual([
      {
        inicio: '2026-10-06T11:00:00.000Z',
        fim: '2026-10-06T11:30:00.000Z',
        profissional: { id: DRA_ANA },
        servico: { id: FISIOTERAPIA },
        clinica: { id: CLINICA },
        modalidade: Modalidade.REMOTO,
        slotId: 's1',
        agendamento: {
          id: 'a1',
          status: StatusAgendamento.CONFIRMADO,
          paciente: { id: CARLOS },
          tipoAtendimento: TipoAtendimento.AVALIACAO,
        },
      },
    ]);
  });

  it.each([StatusAgendamento.CANCELADO, StatusAgendamento.REMARCADO])(
    'agendamento %s aparece com o estado e o slot dele volta como livre, logo acima',
    (status) => {
      const horarios = montarHorarios(
        [disponibilidade(DR_RUI, FISIOTERAPIA, [slot('s1', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z', 0)])],
        [agendamento({ id: 'a1', slotId: 's1', status, profissionalId: DR_RUI, pacienteId: MARIA })],
      );

      expect(horarios.map((h) => [h.slotId, h.agendamento?.status ?? 'LIVRE'])).toEqual([
        ['s1', 'LIVRE'],
        ['s1', status],
      ]);
    },
  );

  it('no mesmo horário e profissional: ativo, depois livre, depois cancelado', () => {
    const horarios = montarHorarios(
      [
        disponibilidade(DRA_ANA, FISIOTERAPIA, [slot('s1', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z', 0)]),
        disponibilidade(DRA_ANA, AVALIACAO_FUNCIONAL, [slot('s2', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z', 1)]),
      ],
      [
        agendamento({ id: 'cancelado', slotId: 's1', status: StatusAgendamento.CANCELADO }),
        agendamento({ id: 'ativo', slotId: 's2', servicoId: AVALIACAO_FUNCIONAL }),
      ],
    );

    expect(horarios.map((h) => h.agendamento?.id ?? `livre:${h.slotId}`)).toEqual(['ativo', 'livre:s1', 'cancelado']);
  });

  it('FALTOU ocupado fica no grupo dos ativos, sem linha livre (a contagem do slot é testada no e2e)', () => {
    const horarios = montarHorarios(
      [disponibilidade(DRA_ANA, FISIOTERAPIA, [slot('s1', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z', 1)])],
      [agendamento({ id: 'a1', slotId: 's1', status: StatusAgendamento.FALTOU })],
    );

    expect(horarios).toHaveLength(1);
    expect(horarios[0].agendamento?.status).toBe(StatusAgendamento.FALTOU);
  });

  it('agendamento sem slot (encaixe) aparece com slotId null', () => {
    const horarios = montarHorarios([], [agendamento({ id: 'encaixe', slotId: null })]);

    expect(horarios).toHaveLength(1);
    expect(horarios[0]).toMatchObject({ slotId: null, agendamento: { id: 'encaixe' } });
  });

  it('profissional com duas agendas: tudo junto, ordenado por horário e identificado pelo serviço', () => {
    const horarios = montarHorarios(
      [
        disponibilidade(DRA_ANA, AVALIACAO_FUNCIONAL, [
          slot('tarde-1', '2026-10-06T17:00:00.000Z', '2026-10-06T17:30:00.000Z'),
        ]),
        disponibilidade(DRA_ANA, FISIOTERAPIA, [
          slot('manha-2', '2026-10-06T11:30:00.000Z', '2026-10-06T12:00:00.000Z'),
          slot('manha-1', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z', 1),
        ]),
      ],
      [agendamento({ id: 'a1', slotId: 'manha-1' })],
    );

    expect(horarios.map((h) => [h.inicio.slice(11, 16), h.servico.id, h.agendamento?.id ?? null])).toEqual([
      ['11:00', FISIOTERAPIA, 'a1'],
      ['11:30', FISIOTERAPIA, null],
      ['17:00', AVALIACAO_FUNCIONAL, null],
    ]);
  });

  it('no mesmo horário, ordena pelo profissional antes do desempate pelo slot', () => {
    const horarios = montarHorarios(
      [
        disponibilidade(DR_RUI, FISIOTERAPIA, [slot('a-slot-rui', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z')]),
        disponibilidade(DRA_ANA, FISIOTERAPIA, [slot('z-slot-ana', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z')]),
      ],
      [],
    );

    expect(horarios.map((h) => h.slotId)).toEqual(['z-slot-ana', 'a-slot-rui']);
  });

  it('mesmo profissional e horário, duas agendas livres: desempata pelo serviço', () => {
    const horarios = montarHorarios(
      [
        disponibilidade(DRA_ANA, AVALIACAO_FUNCIONAL, [slot('a-slot', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z')]),
        disponibilidade(DRA_ANA, FISIOTERAPIA, [slot('z-slot', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z')]),
      ],
      [],
    );

    expect(horarios.map((h) => h.servico.id)).toEqual([FISIOTERAPIA, AVALIACAO_FUNCIONAL]);
  });

  it('sem disponibilidade nem agendamento devolve lista vazia', () => {
    expect(montarHorarios([], [])).toEqual([]);
  });
});

describe('AgendaService.obterAgendaDoDia', () => {
  let prisma: {
    disponibilidade: { findMany: ReturnType<typeof vi.fn> };
    agendamento: { findMany: ReturnType<typeof vi.fn> };
  };
  let service: AgendaService;

  beforeEach(() => {
    prisma = {
      disponibilidade: { findMany: vi.fn().mockResolvedValue([]) },
      agendamento: { findMany: vi.fn().mockResolvedValue([]) },
    };
    service = new AgendaService(prisma as unknown as PrismaService);
  });

  it('consulta o dia inteiro de Recife: das 00:00 (03:00Z) até as 00:00 do dia seguinte, exclusive', async () => {
    await service.obterAgendaDoDia({ data: '2026-10-06' });

    expect(prisma.disponibilidade.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { data: new Date('2026-10-06T00:00:00.000Z') } }),
    );
    expect(prisma.agendamento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inicio: { gte: new Date('2026-10-06T03:00:00.000Z'), lt: new Date('2026-10-07T03:00:00.000Z') } },
      }),
    );
  });

  it('aplica os filtros de profissional e serviço nas duas consultas', async () => {
    await service.obterAgendaDoDia({ data: '2026-10-06', profissionalId: DRA_ANA, servicoId: FISIOTERAPIA });

    expect(prisma.disponibilidade.findMany.mock.calls[0][0].where).toMatchObject({
      profissionalId: DRA_ANA,
      servicoId: FISIOTERAPIA,
    });
    expect(prisma.agendamento.findMany.mock.calls[0][0].where).toMatchObject({
      profissionalId: DRA_ANA,
      servicoId: FISIOTERAPIA,
    });
  });

  it('temDisponibilidade é false quando o dia não tem disponibilidade para os filtros', async () => {
    const agenda = await service.obterAgendaDoDia({ data: '2026-10-11' });

    expect(agenda).toEqual({ data: '2026-10-11', temDisponibilidade: false, horarios: [] });
  });

  it('temDisponibilidade é true mesmo com todos os slots ocupados', async () => {
    prisma.disponibilidade.findMany.mockResolvedValue([
      disponibilidade(DRA_ANA, FISIOTERAPIA, [slot('s1', '2026-10-06T11:00:00.000Z', '2026-10-06T11:30:00.000Z', 1)]),
    ]);
    prisma.agendamento.findMany.mockResolvedValue([agendamento({ id: 'a1', slotId: 's1' })]);

    const agenda = await service.obterAgendaDoDia({ data: '2026-10-06' });

    expect(agenda.temDisponibilidade).toBe(true);
    expect(agenda.horarios).toHaveLength(1);
  });

  it('rejeita data que não existe no calendário com erro no campo data, sem consultar o banco', async () => {
    const erro = await service.obterAgendaDoDia({ data: '2026-02-30' }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(BadRequestException);
    expect((erro as BadRequestException).getResponse()).toMatchObject({
      errors: { data: ['data não existe no calendário.'] },
    });
    expect(prisma.disponibilidade.findMany).not.toHaveBeenCalled();
    expect(prisma.agendamento.findMany).not.toHaveBeenCalled();
  });
});
