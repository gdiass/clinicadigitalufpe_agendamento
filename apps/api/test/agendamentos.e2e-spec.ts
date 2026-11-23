import { randomUUID } from 'node:crypto';
import { ConflictException, type INestApplication } from '@nestjs/common';
import { Modalidade, Prisma, StatusAgendamento, TipoAtendimento } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { paraAgendamentoDto } from '../src/agendamentos/agendamento-detalhe';
import { AgendamentoEstadoService } from '../src/agendamentos/agendamento-estado.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarAppE2E, USUARIO_E2E } from './app-e2e';

const CLINICA_ID = '00000000-0000-4000-a000-000000000001';
const SERVICO_ID = '00000000-0000-4000-a000-000000000002';
const PAC_CARLOS_ID = '00000000-0000-4000-a000-000000000020';
const PAC_LUANA_ID = '00000000-0000-4000-a000-000000000021';
const PAC_MARIA_ID = '00000000-0000-4000-a000-000000000022';
const ROTA = '/api/v1/agendamentos';

const CAMPOS_DO_DETALHE = [
  'agendamentoOrigemId',
  'canceladoEm',
  'canceladoPorId',
  'chegadaEm',
  'clinica',
  'createdAt',
  'fim',
  'fimAtendimentoEm',
  'historico',
  'id',
  'inicio',
  'inicioAtendimentoEm',
  'modalidade',
  'motivo',
  'motivoCancelamento',
  'origemDemanda',
  'paciente',
  'profissional',
  'servico',
  'slot',
  'status',
  'tipoAtendimento',
  'updatedAt',
];

/** Horário do dia 2031-11-03 em Recife (UTC-3), como Date. */
function emRecife(hora: string): Date {
  return new Date(`2031-11-03T${hora}:00.000-03:00`);
}

/**
 * Histórico de agendamento que o teste vai transicionar. O transicionar grava `em = agora`,
 * então o histórico anterior precisa estar no passado para a ordem cronológica fazer sentido.
 */
function historicoConfirmadoNoPassado(responsavelId: string) {
  return [
    { statusAnterior: null, statusNovo: StatusAgendamento.AGENDADO, em: new Date('2026-01-05T12:00:00.000Z'), responsavelId },
    {
      statusAnterior: StatusAgendamento.AGENDADO,
      statusNovo: StatusAgendamento.CONFIRMADO,
      em: new Date('2026-01-06T12:00:00.000Z'),
      responsavelId,
    },
  ];
}

describe('Agendamentos (e2e) — GET /agendamentos/:id', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const profissionalId = randomUUID();
  const slots: string[] = [];
  const ids = {
    agendado: '',
    confirmado: '',
    cancelado: '',
    encaixe: '',
    remarcado: '',
    paraTransicionar: '',
    paraCancelar: '',
    paraRollback: '',
    paraConcorrencia: '',
  };

  async function criarAgendamento(
    dados: Partial<Prisma.AgendamentoUncheckedCreateInput>,
    historico: Array<Omit<Prisma.HistoricoStatusUncheckedCreateInput, 'agendamentoId'>>,
  ): Promise<string> {
    const { id } = await prisma.agendamento.create({
      data: {
        pacienteId: PAC_CARLOS_ID,
        profissionalId,
        servicoId: SERVICO_ID,
        clinicaId: CLINICA_ID,
        inicio: emRecife('08:00'),
        fim: emRecife('08:30'),
        tipoAtendimento: TipoAtendimento.CONSULTA,
        modalidade: Modalidade.PRESENCIAL,
        ...dados,
      },
    });
    for (const registro of historico) {
      await prisma.historicoStatus.create({ data: { ...registro, agendamentoId: id } });
    }
    return id;
  }

  function obter(id: string) {
    return request(app.getHttpServer()).get(`${ROTA}/${id}`);
  }

  beforeAll(async () => {
    app = await criarAppE2E();
    prisma = app.get(PrismaService);

    const disponibilidade = await prisma.disponibilidade.create({
      data: {
        profissionalId,
        clinicaId: CLINICA_ID,
        servicoId: SERVICO_ID,
        data: new Date('2031-11-03T00:00:00.000Z'),
        inicio: new Date('1970-01-01T08:00:00.000Z'),
        fim: new Date('1970-01-01T10:00:00.000Z'),
        modalidade: Modalidade.PRESENCIAL,
        duracaoSlotMin: 30,
        slots: {
          create: ['08:00', '08:30', '09:00', '09:30'].map((hora, i) => ({
            inicio: emRecife(hora),
            fim: emRecife(['08:30', '09:00', '09:30', '10:00'][i]),
          })),
        },
      },
      include: { slots: { orderBy: { inicio: 'asc' } } },
    });
    slots.push(...disponibilidade.slots.map((slot) => slot.id));

    ids.agendado = await criarAgendamento({ slotId: slots[0], motivo: 'Avaliação inicial' }, [
      { statusAnterior: null, statusNovo: StatusAgendamento.AGENDADO, em: emRecife('07:00'), responsavelId: USUARIO_E2E.id },
    ]);

    ids.confirmado = await criarAgendamento(
      {
        slotId: slots[1],
        pacienteId: PAC_LUANA_ID,
        inicio: emRecife('08:30'),
        fim: emRecife('09:00'),
        status: StatusAgendamento.CONFIRMADO,
      },
      [
        {
          statusAnterior: StatusAgendamento.AGENDADO,
          statusNovo: StatusAgendamento.CONFIRMADO,
          em: emRecife('07:15'),
          responsavelId: USUARIO_E2E.id,
          observacao: 'Confirmado por telefone',
        },
        { statusAnterior: null, statusNovo: StatusAgendamento.AGENDADO, em: emRecife('07:05'), responsavelId: USUARIO_E2E.id },
      ],
    );

    ids.cancelado = await criarAgendamento(
      {
        slotId: slots[2],
        pacienteId: PAC_MARIA_ID,
        inicio: emRecife('09:00'),
        fim: emRecife('09:30'),
        status: StatusAgendamento.CANCELADO,
        canceladoEm: emRecife('07:30'),
        motivoCancelamento: 'Paciente solicitou cancelamento',
        canceladoPorId: USUARIO_E2E.id,
      },
      [
        { statusAnterior: null, statusNovo: StatusAgendamento.AGENDADO, em: emRecife('07:10'), responsavelId: USUARIO_E2E.id },
        {
          statusAnterior: StatusAgendamento.AGENDADO,
          statusNovo: StatusAgendamento.CANCELADO,
          em: emRecife('07:30'),
          responsavelId: USUARIO_E2E.id,
          observacao: 'Paciente solicitou cancelamento',
        },
      ],
    );

    ids.encaixe = await criarAgendamento({ inicio: emRecife('10:00'), fim: emRecife('10:20') }, [
      { statusAnterior: null, statusNovo: StatusAgendamento.AGENDADO, em: emRecife('09:50'), responsavelId: USUARIO_E2E.id },
    ]);

    ids.paraTransicionar = await criarAgendamento(
      { slotId: slots[3], inicio: emRecife('09:30'), fim: emRecife('10:00'), status: StatusAgendamento.CONFIRMADO },
      historicoConfirmadoNoPassado(USUARIO_E2E.id),
    );

    ids.remarcado = await criarAgendamento({ agendamentoOrigemId: ids.cancelado }, []);

    const confirmadoSemSlot = { status: StatusAgendamento.CONFIRMADO };
    ids.paraCancelar = await criarAgendamento(confirmadoSemSlot, historicoConfirmadoNoPassado(USUARIO_E2E.id));
    ids.paraRollback = await criarAgendamento(confirmadoSemSlot, historicoConfirmadoNoPassado(USUARIO_E2E.id));
    ids.paraConcorrencia = await criarAgendamento(confirmadoSemSlot, historicoConfirmadoNoPassado(USUARIO_E2E.id));
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.agendamento.deleteMany({ where: { profissionalId } });
      await prisma.disponibilidade.deleteMany({ where: { profissionalId } });
    }
    await app?.close();
  });

  it('devolve o agendamento AGENDADO com slot, participantes e histórico', async () => {
    const resposta = await obter(ids.agendado);

    expect(resposta.status).toBe(200);
    expect(Object.keys(resposta.body).sort()).toEqual(CAMPOS_DO_DETALHE);
    expect(resposta.body).toMatchObject({
      id: ids.agendado,
      status: 'AGENDADO',
      inicio: '2031-11-03T11:00:00.000Z',
      fim: '2031-11-03T11:30:00.000Z',
      modalidade: 'PRESENCIAL',
      tipoAtendimento: 'CONSULTA',
      motivo: 'Avaliação inicial',
      paciente: { id: PAC_CARLOS_ID },
      profissional: { id: profissionalId },
      clinica: { id: CLINICA_ID },
      servico: { id: SERVICO_ID },
      slot: { id: slots[0], inicio: '2031-11-03T11:00:00.000Z', fim: '2031-11-03T11:30:00.000Z' },
      chegadaEm: null,
      canceladoEm: null,
    });
    expect(resposta.body.historico).toEqual([
      {
        id: expect.any(String),
        statusAnterior: null,
        statusNovo: 'AGENDADO',
        em: '2031-11-03T10:00:00.000Z',
        responsavelId: USUARIO_E2E.id,
        observacao: null,
      },
    ]);
  });

  it('devolve o histórico em ordem cronológica, mesmo gravado fora de ordem', async () => {
    const resposta = await obter(ids.confirmado);

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('CONFIRMADO');
    expect(resposta.body.historico.map((h: { statusNovo: string }) => h.statusNovo)).toEqual(['AGENDADO', 'CONFIRMADO']);
    expect(resposta.body.historico[1]).toMatchObject({ statusAnterior: 'AGENDADO', observacao: 'Confirmado por telefone' });
  });

  it('devolve os dados do cancelamento do agendamento CANCELADO', async () => {
    const resposta = await obter(ids.cancelado);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      status: 'CANCELADO',
      paciente: { id: PAC_MARIA_ID },
      canceladoEm: '2031-11-03T10:30:00.000Z',
      motivoCancelamento: 'Paciente solicitou cancelamento',
      canceladoPorId: USUARIO_E2E.id,
    });
    expect(resposta.body.historico).toHaveLength(2);
  });

  it('devolve slot null quando o agendamento não ocupa slot', async () => {
    const resposta = await obter(ids.encaixe);

    expect(resposta.status).toBe(200);
    expect(resposta.body.slot).toBeNull();
  });

  it('mostra a troca de estado e os campos gravados pelo transicionar', async () => {
    const chegadaEm = emRecife('09:25');
    const resultado = await app
      .get(AgendamentoEstadoService)
      .transicionar(ids.paraTransicionar, StatusAgendamento.CHEGOU, USUARIO_E2E.id, 'Chegou na recepção', { chegadaEm });

    const resposta = await obter(ids.paraTransicionar);

    expect(paraAgendamentoDto(resultado)).toEqual(resposta.body);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ status: 'CHEGOU', chegadaEm: '2031-11-03T12:25:00.000Z' });
    expect(resposta.body.historico).toHaveLength(3);
    expect(resposta.body.historico[2]).toMatchObject({
      statusAnterior: 'CONFIRMADO',
      statusNovo: 'CHEGOU',
      responsavelId: USUARIO_E2E.id,
      observacao: 'Chegou na recepção',
    });
  });

  it('grava os campos do cancelamento junto com a troca para CANCELADO', async () => {
    await app
      .get(AgendamentoEstadoService)
      .transicionar(ids.paraCancelar, StatusAgendamento.CANCELADO, USUARIO_E2E.id, 'Paciente desistiu', {
        canceladoEm: emRecife('07:45'),
        motivoCancelamento: 'Paciente desistiu',
        canceladoPorId: USUARIO_E2E.id,
      });

    const resposta = await obter(ids.paraCancelar);

    expect(resposta.body).toMatchObject({
      status: 'CANCELADO',
      canceladoEm: '2031-11-03T10:45:00.000Z',
      motivoCancelamento: 'Paciente desistiu',
      canceladoPorId: USUARIO_E2E.id,
    });
    expect(resposta.body.historico.at(-1)).toMatchObject({ statusAnterior: 'CONFIRMADO', statusNovo: 'CANCELADO' });
  });

  it('desfaz estado e campos quando o registro do histórico falha (mesma transação)', async () => {
    await expect(
      app
        .get(AgendamentoEstadoService)
        .transicionar(ids.paraRollback, StatusAgendamento.CHEGOU, 'nao-e-uuid', undefined, { chegadaEm: emRecife('07:50') }),
    ).rejects.toThrow();

    const resposta = await obter(ids.paraRollback);

    expect(resposta.body).toMatchObject({ status: 'CONFIRMADO', chegadaEm: null });
    expect(resposta.body.historico).toHaveLength(2);
  });

  it('com várias transições simultâneas, só uma grava e as outras recebem 409', async () => {
    const estado = app.get(AgendamentoEstadoService);
    const chegadas = Array.from({ length: 10 }, (_, i) => new Date(emRecife('07:30').getTime() + i * 60_000));

    const resultados = await Promise.allSettled(
      chegadas.map((chegadaEm) =>
        estado.transicionar(ids.paraConcorrencia, StatusAgendamento.CHEGOU, USUARIO_E2E.id, undefined, { chegadaEm }),
      ),
    );

    const vencedores = resultados.flatMap((r, i) => (r.status === 'fulfilled' ? [i] : []));
    const perdedores = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(vencedores).toHaveLength(1);
    expect(perdedores).toHaveLength(chegadas.length - 1);
    for (const perdedor of perdedores) {
      expect(perdedor.reason).toBeInstanceOf(ConflictException);
    }

    const resposta = await obter(ids.paraConcorrencia);
    expect(resposta.body).toMatchObject({ status: 'CHEGOU', chegadaEm: chegadas[vencedores[0]].toISOString() });
    expect(resposta.body.historico.filter((h: { statusNovo: string }) => h.statusNovo === 'CHEGOU')).toHaveLength(1);
  });

  it('devolve histórico vazio e o agendamento de origem de uma remarcação', async () => {
    const resposta = await obter(ids.remarcado);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ historico: [], agendamentoOrigemId: ids.cancelado, slot: null });
  });

  it('responde 404 em ProblemDetails quando o agendamento não existe', async () => {
    const resposta = await obter(randomUUID());

    expect(resposta.status).toBe(404);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    expect(resposta.body).toMatchObject({ status: 404, detail: 'Agendamento não encontrado.' });
  });

  it('responde 400 em ProblemDetails quando o id não é UUID', async () => {
    const resposta = await obter('nao-e-uuid');

    expect(resposta.status).toBe(400);
    expect(resposta.headers['content-type']).toContain('application/problem+json');
    expect(resposta.body.status).toBe(400);
  });
});
