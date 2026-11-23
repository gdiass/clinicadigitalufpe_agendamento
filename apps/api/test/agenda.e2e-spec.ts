import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Modalidade, type Prisma, StatusAgendamento, TipoAtendimento } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarAppE2E } from './app-e2e';

const CLINICA_ID = '00000000-0000-4000-a000-000000000001';
const FISIOTERAPIA_ID = '00000000-0000-4000-a000-000000000002';
const AVALIACAO_FUNCIONAL_ID = '00000000-0000-4000-a000-000000000003';
const PAC_CARLOS_ID = '00000000-0000-4000-a000-000000000020';
const PAC_LUANA_ID = '00000000-0000-4000-a000-000000000021';
const PAC_MARIA_ID = '00000000-0000-4000-a000-000000000022';
const DIA = '2032-10-06';
const DIA_SEGUINTE = '2032-10-07';
const DIA_SEM_DISPONIBILIDADE = '2032-10-11';
const ROTA = '/api/v1/agenda';

type Horario = {
  inicio: string;
  fim: string;
  profissional: { id: string };
  servico: { id: string };
  slotId: string | null;
  agendamento: { id: string; status: StatusAgendamento; paciente: { id: string } } | null;
};

function emRecife(dia: string, hora: string): Date {
  return new Date(`${dia}T${hora}:00-03:00`);
}

function horaEmRecife(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

/** Resume uma linha da agenda como "HH:mm serviço estado" para comparar a ordem. */
function resumo(horario: Horario, nomes: Record<string, string>): string {
  return `${horaEmRecife(horario.inicio)} ${nomes[horario.servico.id]} ${horario.agendamento?.status ?? 'LIVRE'}`;
}

describe('Agenda do dia (e2e) — US-12 Visualizar agenda do dia do profissional', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const profissionaisCriados: string[] = [];

  function novoProfissional(): string {
    const id = randomUUID();
    profissionaisCriados.push(id);
    return id;
  }

  function consultar(query: Record<string, string>) {
    return request(app.getHttpServer()).get(ROTA).query(query);
  }

  async function cadastrarDisponibilidade(profissionalId: string, servicoId: string, inicio: string, fim: string, dia = DIA) {
    const resposta = await request(app.getHttpServer())
      .post('/api/v1/disponibilidades')
      .send({ profissionalId, clinicaId: CLINICA_ID, servicoId, data: dia, inicio, fim, modalidade: 'PRESENCIAL', duracaoSlotMin: 30 });
    expect(resposta.status).toBe(201);
    return resposta.body as { slots: Array<{ id: string; inicio: string; fim: string }> };
  }

  async function criarAgendamento(dados: Partial<Prisma.AgendamentoUncheckedCreateInput> & { profissionalId: string }) {
    const { id } = await prisma.agendamento.create({
      data: {
        pacienteId: PAC_CARLOS_ID,
        servicoId: FISIOTERAPIA_ID,
        clinicaId: CLINICA_ID,
        inicio: emRecife(DIA, '08:00'),
        fim: emRecife(DIA, '08:30'),
        tipoAtendimento: TipoAtendimento.CONSULTA,
        modalidade: Modalidade.PRESENCIAL,
        ...dados,
      },
    });
    return id;
  }

  beforeAll(async () => {
    app = await criarAppE2E();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.agendamento.deleteMany({ where: { profissionalId: { in: profissionaisCriados } } });
      await prisma.disponibilidade.deleteMany({ where: { profissionalId: { in: profissionaisCriados } } });
    }
    await app?.close();
  });

  describe('Cenário: profissional com duas agendas no dia', () => {
    const nomes = { [FISIOTERAPIA_ID]: 'Fisio', [AVALIACAO_FUNCIONAL_ID]: 'Avaliacao' };
    let draAna: string;
    let agendados: { carlos: string; luana: string; maria: string; encaixe: string };
    let slotFisio0900: string;

    beforeAll(async () => {
      draAna = novoProfissional();
      const fisio = await cadastrarDisponibilidade(draAna, FISIOTERAPIA_ID, '08:00', '12:00');
      await cadastrarDisponibilidade(draAna, AVALIACAO_FUNCIONAL_ID, '14:00', '16:00');
      const [s0800, s0830, s0900] = fisio.slots;
      slotFisio0900 = s0900.id;

      agendados = {
        carlos: await criarAgendamento({ profissionalId: draAna, slotId: s0800.id }),
        luana: await criarAgendamento({
          profissionalId: draAna,
          slotId: s0830.id,
          pacienteId: PAC_LUANA_ID,
          status: StatusAgendamento.CONFIRMADO,
          inicio: emRecife(DIA, '08:30'),
          fim: emRecife(DIA, '09:00'),
        }),
        maria: await criarAgendamento({
          profissionalId: draAna,
          slotId: s0900.id,
          pacienteId: PAC_MARIA_ID,
          status: StatusAgendamento.CANCELADO,
          inicio: emRecife(DIA, '09:00'),
          fim: emRecife(DIA, '09:30'),
        }),
        encaixe: await criarAgendamento({
          profissionalId: draAna,
          slotId: null,
          inicio: emRecife(DIA, '12:00'),
          fim: emRecife(DIA, '12:30'),
        }),
      };
    });

    it('vê todos os horários do dia ordenados, identificados por serviço e com o status de cada paciente', async () => {
      const resposta = await consultar({ data: DIA, profissionalId: draAna });

      expect(resposta.status).toBe(200);
      expect(resposta.body.data).toBe(DIA);
      expect(resposta.body.temDisponibilidade).toBe(true);
      expect((resposta.body.horarios as Horario[]).map((h) => resumo(h, nomes))).toEqual([
        '08:00 Fisio AGENDADO',
        '08:30 Fisio CONFIRMADO',
        '09:00 Fisio LIVRE',
        '09:00 Fisio CANCELADO',
        '09:30 Fisio LIVRE',
        '10:00 Fisio LIVRE',
        '10:30 Fisio LIVRE',
        '11:00 Fisio LIVRE',
        '11:30 Fisio LIVRE',
        '12:00 Fisio AGENDADO',
        '14:00 Avaliacao LIVRE',
        '14:30 Avaliacao LIVRE',
        '15:00 Avaliacao LIVRE',
        '15:30 Avaliacao LIVRE',
      ]);
    });

    it('cada agendamento traz id e paciente para abrir a T05; o slot do cancelado volta como livre', async () => {
      const resposta = await consultar({ data: DIA, profissionalId: draAna });
      const horarios = resposta.body.horarios as Horario[];

      expect(horarios[0]).toEqual({
        inicio: emRecife(DIA, '08:00').toISOString(),
        fim: emRecife(DIA, '08:30').toISOString(),
        profissional: { id: draAna },
        servico: { id: FISIOTERAPIA_ID },
        clinica: { id: CLINICA_ID },
        modalidade: 'PRESENCIAL',
        slotId: expect.any(String),
        agendamento: {
          id: agendados.carlos,
          status: 'AGENDADO',
          paciente: { id: PAC_CARLOS_ID },
          tipoAtendimento: 'CONSULTA',
        },
      });
      expect(horarios[2]).toMatchObject({ slotId: slotFisio0900, agendamento: null });
      expect(horarios[3]).toMatchObject({
        slotId: slotFisio0900,
        agendamento: { id: agendados.maria, status: 'CANCELADO', paciente: { id: PAC_MARIA_ID } },
      });
    });

    it('agendamento sem slot (encaixe) aparece com slotId null', async () => {
      const resposta = await consultar({ data: DIA, profissionalId: draAna });
      const encaixe = (resposta.body.horarios as Horario[]).find((h) => h.agendamento?.id === agendados.encaixe);

      expect(encaixe).toMatchObject({ slotId: null, agendamento: { status: 'AGENDADO' } });
    });

    it('filtro por serviço mostra só a agenda daquele serviço', async () => {
      const resposta = await consultar({ data: DIA, profissionalId: draAna, servicoId: AVALIACAO_FUNCIONAL_ID });

      expect(resposta.status).toBe(200);
      expect((resposta.body.horarios as Horario[]).map((h) => resumo(h, nomes))).toEqual([
        '14:00 Avaliacao LIVRE',
        '14:30 Avaliacao LIVRE',
        '15:00 Avaliacao LIVRE',
        '15:30 Avaliacao LIVRE',
      ]);
    });

    it('slot liberado por remarcação também volta como livre, e o agendamento aparece como REMARCADO', async () => {
      const profissionalId = novoProfissional();
      const { slots } = await cadastrarDisponibilidade(profissionalId, FISIOTERAPIA_ID, '08:00', '08:30');
      const remarcado = await criarAgendamento({ profissionalId, slotId: slots[0].id, status: StatusAgendamento.REMARCADO });

      const resposta = await consultar({ data: DIA, profissionalId });

      expect((resposta.body.horarios as Horario[]).map((h) => [h.slotId, h.agendamento?.id ?? 'LIVRE'])).toEqual([
        [slots[0].id, 'LIVRE'],
        [slots[0].id, remarcado],
      ]);
    });

    it.each([StatusAgendamento.CHEGOU, StatusAgendamento.EM_ATENDIMENTO, StatusAgendamento.REALIZADO, StatusAgendamento.FALTOU])(
      'agendamento %s continua segurando o slot: não aparece linha livre',
      async (status) => {
        const profissionalId = novoProfissional();
        const { slots } = await cadastrarDisponibilidade(profissionalId, FISIOTERAPIA_ID, '08:00', '08:30');
        const id = await criarAgendamento({ profissionalId, slotId: slots[0].id, status });

        const resposta = await consultar({ data: DIA, profissionalId });

        expect((resposta.body.horarios as Horario[]).map((h) => h.agendamento?.id ?? 'LIVRE')).toEqual([id]);
      },
    );
  });

  describe('Cenário: falha — dia sem disponibilidade', () => {
    it('temDisponibilidade false e nenhum horário, para a tela mostrar "Nenhuma disponibilidade cadastrada para este dia"', async () => {
      const draAna = novoProfissional();
      await cadastrarDisponibilidade(draAna, FISIOTERAPIA_ID, '08:00', '12:00');

      const resposta = await consultar({ data: DIA_SEM_DISPONIBILIDADE, profissionalId: draAna });

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ data: DIA_SEM_DISPONIBILIDADE, temDisponibilidade: false, horarios: [] });
    });

    it('a disponibilidade de outro profissional no mesmo dia não conta', async () => {
      const outro = novoProfissional();
      await cadastrarDisponibilidade(outro, FISIOTERAPIA_ID, '08:00', '09:00', DIA_SEM_DISPONIBILIDADE);

      const resposta = await consultar({ data: DIA_SEM_DISPONIBILIDADE, profissionalId: novoProfissional() });

      expect(resposta.body).toMatchObject({ temDisponibilidade: false, horarios: [] });
    });
  });

  describe('Filtros com dados de outros profissionais e serviços no mesmo dia', () => {
    const dia = '2032-11-10';

    it('profissionalId deixa de fora os slots e agendamentos de outro profissional', async () => {
      const ana = novoProfissional();
      const rui = novoProfissional();
      const slotsAna = (await cadastrarDisponibilidade(ana, FISIOTERAPIA_ID, '08:00', '09:00', dia)).slots;
      const slotsRui = (await cadastrarDisponibilidade(rui, FISIOTERAPIA_ID, '08:00', '09:00', dia)).slots;
      const daAna = await criarAgendamento({ profissionalId: ana, slotId: slotsAna[0].id, inicio: emRecife(dia, '08:00'), fim: emRecife(dia, '08:30') });
      await criarAgendamento({ profissionalId: rui, slotId: slotsRui[1].id, inicio: emRecife(dia, '08:30'), fim: emRecife(dia, '09:00') });

      const resposta = await consultar({ data: dia, profissionalId: ana });
      const horarios = resposta.body.horarios as Horario[];

      expect(horarios.every((h) => h.profissional.id === ana)).toBe(true);
      expect(horarios.map((h) => h.agendamento?.id ?? h.slotId)).toEqual([daAna, slotsAna[1].id]);
    });

    it('servicoId deixa de fora os agendamentos do outro serviço do mesmo profissional', async () => {
      const ana = novoProfissional();
      const fisio = (await cadastrarDisponibilidade(ana, FISIOTERAPIA_ID, '08:00', '08:30', dia)).slots;
      const avaliacao = (await cadastrarDisponibilidade(ana, AVALIACAO_FUNCIONAL_ID, '14:00', '14:30', dia)).slots;
      await criarAgendamento({ profissionalId: ana, slotId: fisio[0].id, inicio: emRecife(dia, '08:00'), fim: emRecife(dia, '08:30') });
      const daAvaliacao = await criarAgendamento({
        profissionalId: ana,
        servicoId: AVALIACAO_FUNCIONAL_ID,
        slotId: avaliacao[0].id,
        inicio: emRecife(dia, '14:00'),
        fim: emRecife(dia, '14:30'),
      });

      const resposta = await consultar({ data: dia, profissionalId: ana, servicoId: AVALIACAO_FUNCIONAL_ID });

      expect((resposta.body.horarios as Horario[]).map((h) => h.agendamento?.id ?? 'LIVRE')).toEqual([daAvaliacao]);
    });
  });

  describe('Dia só com encaixe, sem disponibilidade', () => {
    it('temDisponibilidade é false, mas o encaixe aparece: a tela mostra o aviso e a linha', async () => {
      const profissionalId = novoProfissional();
      const encaixe = await criarAgendamento({ profissionalId, slotId: null, inicio: emRecife('2032-11-12', '10:00'), fim: emRecife('2032-11-12', '10:30') });

      const resposta = await consultar({ data: '2032-11-12', profissionalId });

      expect(resposta.body.temDisponibilidade).toBe(false);
      expect((resposta.body.horarios as Horario[]).map((h) => h.agendamento?.id)).toEqual([encaixe]);
    });
  });

  describe('Visão da recepção (sem filtro de profissional)', () => {
    it('mostra os horários de todos os profissionais do dia, ordenados por horário', async () => {
      const [ana, rui] = [randomUUID(), randomUUID()].sort();
      profissionaisCriados.push(ana, rui);
      const dia = '2032-11-03';
      await cadastrarDisponibilidade(rui, FISIOTERAPIA_ID, '08:00', '09:00', dia);
      await cadastrarDisponibilidade(ana, FISIOTERAPIA_ID, '08:30', '09:30', dia);

      const resposta = await consultar({ data: dia });
      const nossos = (resposta.body.horarios as Horario[]).filter((h) => [ana, rui].includes(h.profissional.id));
      const quem = (id: string) => (id === ana ? 'ana' : 'rui');

      expect(resposta.status).toBe(200);
      expect(nossos.map((h) => `${horaEmRecife(h.inicio)} ${quem(h.profissional.id)}`)).toEqual([
        '08:00 rui',
        '08:30 ana',
        '08:30 rui',
        '09:00 ana',
      ]);
    });
  });

  describe('Limites do dia no fuso de Recife', () => {
    it('inclui agendamentos de 00:00 a 23:59 de Recife e deixa de fora os do dia seguinte', async () => {
      const profissionalId = novoProfissional();
      const meiaNoite = await criarAgendamento({ profissionalId, inicio: emRecife(DIA, '00:00'), fim: emRecife(DIA, '00:30') });
      const ultimo = await criarAgendamento({ profissionalId, inicio: emRecife(DIA, '23:30'), fim: emRecife(DIA_SEGUINTE, '00:00') });
      await criarAgendamento({ profissionalId, inicio: emRecife(DIA_SEGUINTE, '00:00'), fim: emRecife(DIA_SEGUINTE, '00:30') });
      await criarAgendamento({ profissionalId, inicio: emRecife('2032-10-05', '23:30'), fim: emRecife(DIA, '00:00') });

      const resposta = await consultar({ data: DIA, profissionalId });

      expect((resposta.body.horarios as Horario[]).map((h) => h.agendamento?.id)).toEqual([meiaNoite, ultimo]);
    });
  });

  describe('Validação dos filtros', () => {
    it.each([
      ['sem data', {}, 'data'],
      ['data em outro formato', { data: '06/10/2032' }, 'data'],
      ['data que não existe no calendário', { data: '2032-02-30' }, 'data'],
      ['29 de fevereiro fora de ano bissexto', { data: '2033-02-29' }, 'data'],
      ['profissionalId que não é UUID', { data: DIA, profissionalId: 'ana' }, 'profissionalId'],
      ['servicoId que não é UUID', { data: DIA, servicoId: '123' }, 'servicoId'],
    ])('%s → 400 em ProblemDetails com erro no campo', async (_caso, query, campo) => {
      const resposta = await consultar(query as Record<string, string>);

      expect(resposta.status).toBe(400);
      expect(resposta.headers['content-type']).toContain('application/problem+json');
      expect(Object.keys(resposta.body.errors)).toEqual([campo]);
    });

    it('aceita 29 de fevereiro em ano bissexto', async () => {
      const resposta = await consultar({ data: '2032-02-29', profissionalId: novoProfissional() });

      expect(resposta.status).toBe(200);
    });
  });
});
