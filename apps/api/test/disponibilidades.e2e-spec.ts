import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Modalidade, StatusAgendamento, TipoAtendimento } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarAppE2E } from './app-e2e';

const CLINICA_ID = '00000000-0000-4000-a000-000000000001';
const SERVICO_FISIOTERAPIA_ID = '00000000-0000-4000-a000-000000000002';
const PACIENTE_ID = '00000000-0000-4000-a000-000000000020';
const DIA = '2031-10-06';
const ROTA = '/api/v1/disponibilidades';

describe('Disponibilidades (e2e) — US-01 Cadastrar disponibilidade do profissional', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const profissionaisCriados: string[] = [];

  function novoProfissional(): string {
    const id = randomUUID();
    profissionaisCriados.push(id);
    return id;
  }

  function corpo(profissionalId: string, inicio: string, fim: string, extra: Record<string, unknown> = {}) {
    return {
      profissionalId,
      clinicaId: CLINICA_ID,
      servicoId: SERVICO_FISIOTERAPIA_ID,
      data: DIA,
      inicio,
      fim,
      modalidade: 'PRESENCIAL',
      duracaoSlotMin: 30,
      ...extra,
    };
  }

  function cadastrar(body: object) {
    return request(app.getHttpServer()).post(ROTA).send(body);
  }

  function listar(query: Record<string, string | number>) {
    return request(app.getHttpServer()).get(ROTA).query(query);
  }

  function disponibilidadesNoBanco(profissionalId: string) {
    return prisma.disponibilidade.findMany({ where: { profissionalId }, include: { slots: { orderBy: { inicio: 'asc' } } } });
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

  describe('Cenário: cadastro de disponibilidade válida', () => {
    it('salva a disponibilidade e os horários de 08:00 às 12:00 ficam livres', async () => {
      const draAna = novoProfissional();

      const resposta = await cadastrar(corpo(draAna, '08:00', '12:00'));

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        profissionalId: draAna,
        servicoId: SERVICO_FISIOTERAPIA_ID,
        data: DIA,
        inicio: '08:00',
        fim: '12:00',
        modalidade: 'PRESENCIAL',
        totalSlots: 8,
        slotsOcupados: 0,
      });
      expect(resposta.body.slots[0]).toMatchObject({ inicio: '2031-10-06T11:00:00.000Z', fim: '2031-10-06T11:30:00.000Z', ocupado: false });
      expect(resposta.body.slots[7]).toMatchObject({ inicio: '2031-10-06T14:30:00.000Z', fim: '2031-10-06T15:00:00.000Z', ocupado: false });

      const [salva] = await disponibilidadesNoBanco(draAna);
      expect(salva.id).toBe(resposta.body.id);
      expect(salva.slots).toHaveLength(8);
    });

    it('a disponibilidade aparece na listagem com todos os slots livres', async () => {
      const draAna = novoProfissional();
      await cadastrar(corpo(draAna, '08:00', '12:00')).expect(201);

      const resposta = await listar({ profissionalId: draAna, dataInicio: DIA, dataFim: DIA }).expect(200);

      expect(resposta.body.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
      expect(resposta.body.data[0]).toMatchObject({ inicio: '08:00', fim: '12:00', totalSlots: 8, slotsOcupados: 0 });
    });

    it('janela da noite fica no dia local, mesmo com slots que passam da meia-noite UTC', async () => {
      const draAna = novoProfissional();

      const criada = await cadastrar(corpo(draAna, '21:00', '23:30')).expect(201);

      expect(criada.body.data).toBe(DIA);
      expect(criada.body.slots.map((slot: { inicio: string }) => slot.inicio)).toEqual([
        '2031-10-07T00:00:00.000Z',
        '2031-10-07T00:30:00.000Z',
        '2031-10-07T01:00:00.000Z',
        '2031-10-07T01:30:00.000Z',
        '2031-10-07T02:00:00.000Z',
      ]);
      expect((await listar({ profissionalId: draAna, dataInicio: DIA, dataFim: DIA })).body.meta.total).toBe(1);
      expect((await listar({ profissionalId: draAna, dataInicio: '2031-10-07' })).body.meta.total).toBe(0);
    });
  });

  describe('Cenário: falha — disponibilidade sobreposta', () => {
    it('não salva e exibe o período que já existe', async () => {
      const draAna = novoProfissional();
      await cadastrar(corpo(draAna, '08:00', '12:00')).expect(201);

      const resposta = await cadastrar(corpo(draAna, '11:00', '14:00'));

      expect(resposta.status).toBe(409);
      expect(resposta.headers['content-type']).toContain('application/problem+json');
      expect(resposta.body).toMatchObject({ status: 409, code: 'CONFLICT', detail: 'Já existe disponibilidade neste período (08:00–12:00)' });
      expect(await disponibilidadesNoBanco(draAna)).toHaveLength(1);
    });

    it.each([
      ['idêntica', '08:00', '12:00'],
      ['contida', '09:00', '10:00'],
      ['que contém', '07:00', '13:00'],
      ['que começa antes', '07:00', '08:30'],
    ])('janela %s (%s–%s) também é sobreposição', async (_caso, inicio, fim) => {
      const draAna = novoProfissional();
      await cadastrar(corpo(draAna, '08:00', '12:00')).expect(201);

      const resposta = await cadastrar(corpo(draAna, inicio, fim));

      expect(resposta.status).toBe(409);
      expect(resposta.body.detail).toBe('Já existe disponibilidade neste período (08:00–12:00)');
    });

    it.each([
      ['depois', '12:00', '14:00'],
      ['antes', '06:00', '08:00'],
    ])('janela encostada %s (%s–%s) não é sobreposição', async (_caso, inicio, fim) => {
      const draAna = novoProfissional();
      await cadastrar(corpo(draAna, '08:00', '12:00')).expect(201);

      await cadastrar(corpo(draAna, inicio, fim)).expect(201);

      expect(await disponibilidadesNoBanco(draAna)).toHaveLength(2);
    });

    it('outro profissional pode ter disponibilidade no mesmo horário', async () => {
      await cadastrar(corpo(novoProfissional(), '08:00', '12:00')).expect(201);
      await cadastrar(corpo(novoProfissional(), '08:00', '12:00')).expect(201);
    });

    it('o mesmo horário em outro dia não é sobreposição', async () => {
      const draAna = novoProfissional();
      await cadastrar(corpo(draAna, '08:00', '12:00')).expect(201);

      await cadastrar(corpo(draAna, '08:00', '12:00', { data: '2031-10-07' })).expect(201);
    });

    it('requisições simultâneas sobrepostas: uma é salva, as outras recebem 409 e nenhuma dá erro 500', async () => {
      const janelasQueSeCruzam = [
        ['08:00', '12:00'],
        ['10:00', '14:00'],
        ['09:00', '11:30'],
        ['10:30', '11:00'],
      ];

      for (let rodada = 0; rodada < 10; rodada++) {
        const draAna = novoProfissional();

        const respostas = await Promise.all(janelasQueSeCruzam.map(([inicio, fim]) => cadastrar(corpo(draAna, inicio, fim))));

        const status = respostas.map((r) => r.status);
        expect(status.filter((s) => s >= 500)).toEqual([]);
        expect(status.sort()).toEqual([201, 409, 409, 409]);
        for (const resposta of respostas.filter((r) => r.status === 409)) {
          expect(resposta.body.detail).toMatch(/^Já existe disponibilidade neste período \(\d{2}:\d{2}–\d{2}:\d{2}\)$/);
        }
        expect(await disponibilidadesNoBanco(draAna)).toHaveLength(1);
      }
    });
  });

  describe('Cenário: falha — horário de fim anterior ao início', () => {
    it('não salva e exibe a mensagem da US-01', async () => {
      const draAna = novoProfissional();

      const resposta = await cadastrar(corpo(draAna, '14:00', '10:00'));

      expect(resposta.status).toBe(400);
      expect(resposta.body).toMatchObject({
        detail: 'A hora de fim deve ser posterior à hora de início',
        errors: { fim: ['A hora de fim deve ser posterior à hora de início'] },
      });
      expect(await disponibilidadesNoBanco(draAna)).toHaveLength(0);
    });
  });

  describe('regras garantidas pelo próprio banco (migration 20261111)', () => {
    function inserirDireto(profissionalId: string, inicio: string, fim: string) {
      return prisma.disponibilidade.create({
        data: {
          profissionalId,
          clinicaId: CLINICA_ID,
          servicoId: SERVICO_FISIOTERAPIA_ID,
          data: new Date(`${DIA}T00:00:00.000Z`),
          inicio: new Date(`1970-01-01T${inicio}:00.000Z`),
          fim: new Date(`1970-01-01T${fim}:00.000Z`),
          modalidade: Modalidade.PRESENCIAL,
          duracaoSlotMin: 30,
        },
      });
    }

    it('EXCLUDE recusa sobreposição mesmo para quem escreve fora da API', async () => {
      const draAna = novoProfissional();
      await inserirDireto(draAna, '08:00', '12:00');

      await expect(inserirDireto(draAna, '11:00', '14:00')).rejects.toThrow(/disponibilidades_sem_sobreposicao/);
      await expect(inserirDireto(draAna, '12:00', '14:00')).resolves.toBeDefined();
    });

    it('CHECK recusa fim igual ou anterior ao início', async () => {
      const draAna = novoProfissional();

      await expect(inserirDireto(draAna, '10:00', '10:00')).rejects.toThrow(/disponibilidades_fim_apos_inicio/);
      await expect(inserirDireto(draAna, '14:00', '10:00')).rejects.toThrow(/disponibilidades_fim_apos_inicio/);
    });
  });

  describe('validação da entrada', () => {
    it('recusa campos inválidos ou desconhecidos apontando cada campo', async () => {
      const resposta = await cadastrar({
        ...corpo('nao-e-uuid', '8h', '24:00'),
        modalidade: 'HIBRIDO',
        duracaoSlotMin: 0,
        campoExtra: true,
      });

      expect(resposta.status).toBe(400);
      expect(resposta.body.code).toBe('VALIDATION_ERROR');
      expect(resposta.body.errors).toMatchObject({
        profissionalId: ['deve ser um UUID.'],
        inicio: ['deve estar no formato HH:mm (00:00 a 23:59).'],
        fim: ['deve estar no formato HH:mm (00:00 a 23:59).'],
        modalidade: ['deve ser PRESENCIAL ou REMOTO.'],
        duracaoSlotMin: ['deve ser no mínimo 1.'],
        property: ['campoExtra should not exist'],
      });
    });

    it('recusa duração fracionária', async () => {
      const resposta = await cadastrar(corpo(novoProfissional(), '08:00', '12:00', { duracaoSlotMin: 30.5 }));

      expect(resposta.status).toBe(400);
      expect(resposta.body.errors).toEqual({ duracaoSlotMin: ['deve ser um número inteiro.'] });
    });

    it.each([
      ['08:00', '09:10', 30],
      ['08:00', '09:00', 90],
    ])('recusa janela %s–%s que não se divide em slots de %i min', async (inicio, fim, duracaoSlotMin) => {
      const resposta = await cadastrar(corpo(novoProfissional(), inicio, fim, { duracaoSlotMin }));

      expect(resposta.status).toBe(400);
      expect(resposta.body.errors).toEqual({
        duracaoSlotMin: [`A janela de ${inicio} a ${fim} não se divide em slots de ${duracaoSlotMin} minutos.`],
      });
    });

    it('recusa data inexistente', async () => {
      const resposta = await cadastrar(corpo(novoProfissional(), '08:00', '12:00', { data: '2031-04-31' }));

      expect(resposta.status).toBe(400);
      expect(resposta.body.errors).toHaveProperty('data');
    });

    it('recusa período de listagem com fim antes do início', async () => {
      const resposta = await listar({ dataInicio: '2031-10-10', dataFim: '2031-10-01' });

      expect(resposta.status).toBe(400);
      expect(resposta.body.errors).toHaveProperty('dataFim');
    });
  });

  describe('listagem', () => {
    async function cadastrarTresDias(): Promise<string> {
      const draAna = novoProfissional();
      for (const data of ['2031-10-07', '2031-10-05', '2031-10-06']) {
        await cadastrar(corpo(draAna, '08:00', '09:00', { data })).expect(201);
      }
      return draAna;
    }

    it('pagina de verdade e ordena por data', async () => {
      const draAna = await cadastrarTresDias();

      const pagina1 = await listar({ profissionalId: draAna, pageSize: 2, page: 1 }).expect(200);
      const pagina2 = await listar({ profissionalId: draAna, pageSize: 2, page: 2 }).expect(200);

      expect(pagina1.body.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
      expect(pagina1.body.data.map((d: { data: string }) => d.data)).toEqual(['2031-10-05', '2031-10-06']);
      expect(pagina2.body.data.map((d: { data: string }) => d.data)).toEqual(['2031-10-07']);
    });

    it.each([
      [{ dataInicio: '2031-10-06' }, ['2031-10-06', '2031-10-07']],
      [{ dataFim: '2031-10-06' }, ['2031-10-05', '2031-10-06']],
      [{ dataInicio: '2031-10-06', dataFim: '2031-10-06' }, ['2031-10-06']],
    ])('filtro de período %o é inclusivo nos limites', async (filtro, diasEsperados) => {
      const draAna = await cadastrarTresDias();

      const resposta = await listar({ profissionalId: draAna, ...filtro }).expect(200);

      expect(resposta.body.data.map((d: { data: string }) => d.data)).toEqual(diasEsperados);
    });

    it('sem resultado devolve lista vazia com 1 página', async () => {
      const resposta = await listar({ profissionalId: novoProfissional() }).expect(200);

      expect(resposta.body).toEqual({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } });
    });

    it('slot com agendamento ativo fica ocupado; cancelado ou remarcado devolve o slot (RN01/RN04)', async () => {
      const draAna = novoProfissional();
      const criada = await cadastrar(corpo(draAna, '08:00', '10:30')).expect(201);
      const statusPorSlot = [
        StatusAgendamento.AGENDADO,
        StatusAgendamento.CANCELADO,
        StatusAgendamento.REMARCADO,
        StatusAgendamento.CONFIRMADO,
      ];
      await prisma.agendamento.createMany({
        data: statusPorSlot.map((status, i) => ({
          slotId: criada.body.slots[i].id,
          pacienteId: PACIENTE_ID,
          profissionalId: draAna,
          servicoId: SERVICO_FISIOTERAPIA_ID,
          clinicaId: CLINICA_ID,
          inicio: new Date(criada.body.slots[i].inicio),
          fim: new Date(criada.body.slots[i].fim),
          tipoAtendimento: TipoAtendimento.CONSULTA,
          modalidade: Modalidade.PRESENCIAL,
          status,
        })),
      });

      const resposta = await listar({ profissionalId: draAna }).expect(200);

      const [disponibilidade] = resposta.body.data;
      expect(disponibilidade.totalSlots).toBe(5);
      expect(disponibilidade.slotsOcupados).toBe(2);
      expect(disponibilidade.slots.map((slot: { ocupado: boolean }) => slot.ocupado)).toEqual([true, false, false, true, false]);
    });
  });
});
