import { BadRequestException, ConflictException } from '@nestjs/common';
import { Modalidade, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateDisponibilidadeDto } from './disponibilidade.dto';
import { DisponibilidadesService, gerarSlots } from './disponibilidades.service';
import { paraColunaDate, paraColunaTime, paraMinutos } from './horario';

const PROF_ANA = '00000000-0000-4000-a000-000000000010';

function dtoValido(parcial: Partial<CreateDisponibilidadeDto> = {}): CreateDisponibilidadeDto {
  return {
    profissionalId: PROF_ANA,
    clinicaId: '00000000-0000-4000-a000-000000000001',
    servicoId: '00000000-0000-4000-a000-000000000002',
    data: '2026-10-06',
    inicio: '08:00',
    fim: '12:00',
    modalidade: Modalidade.PRESENCIAL,
    duracaoSlotMin: 30,
    ...parcial,
  };
}

function registroDoBanco(inicio: string, fim: string, ocupados: number[] = []) {
  const slots = gerarSlots('2026-10-06', paraMinutos(inicio), paraMinutos(fim), 30).map((slot, i) => ({
    id: `slot-${i}`,
    disponibilidadeId: 'disp-1',
    ...slot,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    _count: { agendamentos: ocupados.includes(i) ? 1 : 0 },
  }));
  return {
    id: 'disp-1',
    profissionalId: PROF_ANA,
    clinicaId: '00000000-0000-4000-a000-000000000001',
    servicoId: '00000000-0000-4000-a000-000000000002',
    data: paraColunaDate('2026-10-06'),
    inicio: paraColunaTime(inicio),
    fim: paraColunaTime(fim),
    modalidade: Modalidade.PRESENCIAL,
    duracaoSlotMin: 30,
    createdAt: new Date('2026-10-01T12:00:00Z'),
    updatedAt: new Date('2026-10-01T12:00:00Z'),
    slots,
  };
}

function erroDoPostgres(codigo: string, mensagem: string) {
  return new Prisma.PrismaClientUnknownRequestError(
    'Error occurred during query execution:\n' +
      `ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "${codigo}", message: "${mensagem}", severity: "ERROR" }), transient: false })`,
    { clientVersion: '5.22.0' },
  );
}

const VIOLACAO_DO_EXCLUDE = () =>
  erroDoPostgres('23P01', 'conflicting key value violates exclusion constraint \\"disponibilidades_sem_sobreposicao\\"');

describe('gerarSlots', () => {
  it('divide 08:00–12:00 em 8 slots de 30 minutos, contíguos, no horário de Recife', () => {
    const slots = gerarSlots('2026-10-06', paraMinutos('08:00'), paraMinutos('12:00'), 30);

    expect(slots).toHaveLength(8);
    expect(slots[0].inicio.toISOString()).toBe('2026-10-06T11:00:00.000Z');
    expect(slots[7].fim.toISOString()).toBe('2026-10-06T15:00:00.000Z');
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].inicio.getTime()).toBe(slots[i - 1].fim.getTime());
    }
  });

  it('gera um único slot quando a janela tem exatamente a duração', () => {
    const slots = gerarSlots('2026-10-06', paraMinutos('08:00'), paraMinutos('08:45'), 45);
    expect(slots).toHaveLength(1);
  });
});

describe('DisponibilidadesService', () => {
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    $executeRaw: ReturnType<typeof vi.fn>;
    disponibilidade: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: DisponibilidadesService;

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn((operacao) => operacao(prisma)),
      $executeRaw: vi.fn().mockResolvedValue(1),
      disponibilidade: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(registroDoBanco('08:00', '12:00')),
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new DisponibilidadesService(prisma as unknown as PrismaService);
  });

  describe('criar', () => {
    it('salva a disponibilidade com os slots e devolve tudo livre (cenário válido da US-01)', async () => {
      const resultado = await service.criar(dtoValido());

      const chamada = prisma.disponibilidade.create.mock.calls[0][0];
      expect(chamada.data).toMatchObject({
        profissionalId: PROF_ANA,
        data: paraColunaDate('2026-10-06'),
        inicio: paraColunaTime('08:00'),
        fim: paraColunaTime('12:00'),
        modalidade: Modalidade.PRESENCIAL,
        duracaoSlotMin: 30,
      });
      expect(chamada.data.slots.createMany.data).toHaveLength(8);
      expect(resultado).toMatchObject({
        data: '2026-10-06',
        inicio: '08:00',
        fim: '12:00',
        totalSlots: 8,
        slotsOcupados: 0,
      });
      expect(resultado.slots.every((slot) => !slot.ocupado)).toBe(true);
    });

    it('dentro da transação, trava a agenda do profissional antes de checar e de criar', async () => {
      await service.criar(dtoValido());

      const [sql, profissionalId] = prisma.$executeRaw.mock.calls[0];
      expect(sql.join('?')).toContain('pg_advisory_xact_lock');
      expect(profissionalId).toBe(PROF_ANA);
      const ordem = [prisma.$executeRaw, prisma.disponibilidade.findFirst, prisma.disponibilidade.create]
        .map((fn) => fn.mock.invocationCallOrder[0]);
      expect(ordem).toEqual([...ordem].sort((a, b) => a - b));
    });

    it('recusa disponibilidade sobreposta mostrando o período que já existe (cenário de falha da US-01)', async () => {
      prisma.disponibilidade.findFirst.mockResolvedValue(registroDoBanco('08:00', '12:00'));

      const tentativa = service.criar(dtoValido({ inicio: '11:00', fim: '14:00' }));

      await expect(tentativa).rejects.toThrow(ConflictException);
      await expect(tentativa).rejects.toThrow('Já existe disponibilidade neste período (08:00–12:00)');
      expect(prisma.disponibilidade.create).not.toHaveBeenCalled();
    });

    it.each([
      ['14:00', '10:00'],
      ['10:00', '10:00'],
    ])('recusa fim (%s → %s) que não é posterior ao início (cenário de falha da US-01)', async (inicio, fim) => {
      const tentativa = service.criar(dtoValido({ inicio, fim }));

      await expect(tentativa).rejects.toThrow(BadRequestException);
      await expect(tentativa).rejects.toThrow('A hora de fim deve ser posterior à hora de início');
      expect(prisma.disponibilidade.findFirst).not.toHaveBeenCalled();
      expect(prisma.disponibilidade.create).not.toHaveBeenCalled();
    });

    it('aponta o campo com erro para o formulário da T09', async () => {
      const erro = await service.criar(dtoValido({ inicio: '14:00', fim: '10:00' })).catch((e) => e);

      expect(erro.getResponse()).toEqual({
        message: 'A hora de fim deve ser posterior à hora de início',
        errors: { fim: ['A hora de fim deve ser posterior à hora de início'] },
      });
    });

    it('recusa janela que não se divide na duração do slot', async () => {
      const tentativa = service.criar(dtoValido({ inicio: '08:00', fim: '09:10', duracaoSlotMin: 30 }));

      await expect(tentativa).rejects.toThrow('A janela de 08:00 a 09:10 não se divide em slots de 30 minutos.');
      expect(prisma.disponibilidade.create).not.toHaveBeenCalled();
    });

    it('recusa data que não existe no calendário', async () => {
      await expect(service.criar(dtoValido({ data: '2026-02-30' }))).rejects.toThrow(BadRequestException);
      expect(prisma.disponibilidade.create).not.toHaveBeenCalled();
    });

    it('se o EXCLUDE do banco barrar (ex.: escrita fora da API), devolve 409 com o período existente', async () => {
      prisma.disponibilidade.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(registroDoBanco('09:00', '11:00'));
      prisma.disponibilidade.create.mockRejectedValue(VIOLACAO_DO_EXCLUDE());

      await expect(service.criar(dtoValido())).rejects.toThrow('Já existe disponibilidade neste período (09:00–11:00)');
    });

    it('quando o banco barra a sobreposição e o conflito some, ainda devolve 409', async () => {
      prisma.disponibilidade.create.mockRejectedValue(VIOLACAO_DO_EXCLUDE());

      await expect(service.criar(dtoValido())).rejects.toThrow(ConflictException);
    });

    it.each([
      ['deadlock', erroDoPostgres('40P01', 'deadlock detected')],
      ['CHECK de fim > início', erroDoPostgres('23514', 'new row violates check constraint \\"disponibilidades_fim_apos_inicio\\"')],
    ])('não mascara outro erro do banco (%s) como 409', async (_nome, outro) => {
      prisma.disponibilidade.create.mockRejectedValue(outro);

      await expect(service.criar(dtoValido())).rejects.toBe(outro);
    });
  });

  describe('listar', () => {
    it('usa página 1 com 20 itens por padrão e ordena por data e horário', async () => {
      await service.listar({});

      expect(prisma.disponibilidade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
          orderBy: [{ data: 'asc' }, { inicio: 'asc' }, { profissionalId: 'asc' }],
        }),
      );
    });

    it('filtra por profissional e período inclusivo', async () => {
      await service.listar({ profissionalId: PROF_ANA, dataInicio: '2026-10-01', dataFim: '2026-10-31', page: 2, pageSize: 5 });

      expect(prisma.disponibilidade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            profissionalId: PROF_ANA,
            data: { gte: paraColunaDate('2026-10-01'), lte: paraColunaDate('2026-10-31') },
          },
          skip: 5,
          take: 5,
        }),
      );
    });

    it('marca os slots ocupados e soma o total para a T09', async () => {
      prisma.disponibilidade.count.mockResolvedValue(41);
      prisma.disponibilidade.findMany.mockResolvedValue([registroDoBanco('08:00', '12:00', [0, 3])]);

      const resultado = await service.listar({});

      expect(resultado.meta).toEqual({ page: 1, pageSize: 20, total: 41, totalPages: 3 });
      expect(resultado.data[0].slotsOcupados).toBe(2);
      expect(resultado.data[0].slots.map((slot) => slot.ocupado)).toEqual([true, false, false, true, false, false, false, false]);
    });

    it('recusa período com fim antes do início', async () => {
      await expect(service.listar({ dataInicio: '2026-10-10', dataFim: '2026-10-01' })).rejects.toThrow(BadRequestException);
      expect(prisma.disponibilidade.findMany).not.toHaveBeenCalled();
    });

    it('recusa data de filtro que não existe no calendário', async () => {
      await expect(service.listar({ dataFim: '2026-02-30' })).rejects.toThrow(BadRequestException);
    });
  });
});
