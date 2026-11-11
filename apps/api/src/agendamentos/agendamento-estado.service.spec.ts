import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { StatusAgendamento } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import {
  AgendamentoEstadoService,
  TRANSICOES_PERMITIDAS,
} from './agendamento-estado.service';

const EXPECTED: Record<StatusAgendamento, StatusAgendamento[]> = {
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

describe('AgendamentoEstadoService', () => {
  let service: AgendamentoEstadoService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      agendamento: {
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        updateMany: vi.fn(),
      },
      historicoStatus: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)),
    };
    service = new AgendamentoEstadoService(prisma as unknown as PrismaService);
  });

  describe('completude da tabela de transições', () => {
    it('deve possuir entrada definida para todos os valores do enum StatusAgendamento', () => {
      const allStatuses = Object.values(StatusAgendamento);
      for (const status of allStatuses) {
        expect(TRANSICOES_PERMITIDAS).toHaveProperty(status);
        expect(Array.isArray(TRANSICOES_PERMITIDAS[status])).toBe(true);
      }
      expect(Object.keys(TRANSICOES_PERMITIDAS)).toHaveLength(allStatuses.length);
    });

    it('deve corresponder exatamente à matriz esperada pela RN08', () => {
      expect(TRANSICOES_PERMITIDAS).toEqual(EXPECTED);
    });
  });

  describe('transições de estado (matriz 8x8)', () => {
    const allStatuses = Object.values(StatusAgendamento);
    const allPairs = allStatuses.flatMap((statusDe) =>
      allStatuses.map((statusPara) => ({
        statusDe,
        statusPara,
        valido: (EXPECTED[statusDe] ?? []).includes(statusPara),
      })),
    );

    it.each(allPairs)(
      'deve lidar corretamente com a transição de $statusDe para $statusPara (válida: $valido)',
      async ({ statusDe, statusPara, valido }) => {
        const agendamentoId = '00000000-0000-4000-a000-000000000200';
        const responsavelId = '00000000-0000-4000-a000-000000000040';
        const observacao = 'Observação de teste';

        const mockAgendamento = {
          id: agendamentoId,
          status: statusDe,
        };
        const mockAgendamentoAtualizado = {
          ...mockAgendamento,
          status: statusPara,
        };

        prisma.agendamento.findUnique.mockResolvedValue(mockAgendamento);
        prisma.agendamento.updateMany.mockResolvedValue({ count: 1 });
        prisma.agendamento.findUniqueOrThrow.mockResolvedValue(mockAgendamentoAtualizado);
        prisma.historicoStatus.create.mockResolvedValue({ id: 'hist-uuid-1' });

        if (valido) {
          const resultado = await service.transicionar(
            agendamentoId,
            statusPara,
            responsavelId,
            observacao,
          );

          expect(resultado.status).toBe(statusPara);
          expect(prisma.agendamento.findUnique).toHaveBeenCalledWith({
            where: { id: agendamentoId },
          });
          expect(prisma.agendamento.updateMany).toHaveBeenCalledWith({
            where: {
              id: agendamentoId,
              status: statusDe,
            },
            data: {
              status: statusPara,
            },
          });
          expect(prisma.historicoStatus.create).toHaveBeenCalledWith({
            data: {
              agendamentoId,
              statusAnterior: statusDe,
              statusNovo: statusPara,
              em: expect.any(Date),
              responsavelId,
              observacao,
            },
          });
          expect(prisma.agendamento.findUniqueOrThrow).toHaveBeenCalledWith({
            where: { id: agendamentoId },
          });
        } else {
          await expect(
            service.transicionar(agendamentoId, statusPara, responsavelId, observacao),
          ).rejects.toThrow(ConflictException);

          await expect(
            service.transicionar(agendamentoId, statusPara, responsavelId, observacao),
          ).rejects.toThrow(
            `Não é possível passar de ${statusDe} para ${statusPara}.`,
          );

          expect(prisma.agendamento.updateMany).not.toHaveBeenCalled();
          expect(prisma.historicoStatus.create).not.toHaveBeenCalled();
          expect(prisma.agendamento.findUniqueOrThrow).not.toHaveBeenCalled();
        }
      },
    );
  });

  describe('validações e casos de borda', () => {
    const agendamentoId = '00000000-0000-4000-a000-000000000200';
    const responsavelId = '00000000-0000-4000-a000-000000000040';

    it('lança BadRequestException se responsavelId for vazio ou apenas espaços', async () => {
      await expect(
        service.transicionar(agendamentoId, StatusAgendamento.CONFIRMADO, ''),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.transicionar(agendamentoId, StatusAgendamento.CONFIRMADO, '   '),
      ).rejects.toThrow(new BadRequestException('Responsável é obrigatório.'));

      expect(prisma.agendamento.findUnique).not.toHaveBeenCalled();
      expect(prisma.agendamento.updateMany).not.toHaveBeenCalled();
      expect(prisma.historicoStatus.create).not.toHaveBeenCalled();
    });

    it('lança NotFoundException se o agendamento não for encontrado', async () => {
      prisma.agendamento.findUnique.mockResolvedValue(null);

      await expect(
        service.transicionar(
          agendamentoId,
          StatusAgendamento.CONFIRMADO,
          responsavelId,
        ),
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.transicionar(
          agendamentoId,
          StatusAgendamento.CONFIRMADO,
          responsavelId,
        ),
      ).rejects.toThrow(new NotFoundException('Agendamento não encontrado.'));

      expect(prisma.agendamento.updateMany).not.toHaveBeenCalled();
      expect(prisma.historicoStatus.create).not.toHaveBeenCalled();
    });

    it('lança ConflictException se updateMany retornar count 0 (concorrência)', async () => {
      prisma.agendamento.findUnique.mockResolvedValue({
        id: agendamentoId,
        status: StatusAgendamento.AGENDADO,
      });
      prisma.agendamento.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.transicionar(
          agendamentoId,
          StatusAgendamento.CONFIRMADO,
          responsavelId,
          'Tentativa de transição concorrente',
        ),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.transicionar(
          agendamentoId,
          StatusAgendamento.CONFIRMADO,
          responsavelId,
          'Tentativa de transição concorrente',
        ),
      ).rejects.toThrow(
        new ConflictException('O agendamento foi alterado por outra operação.'),
      );

      expect(prisma.historicoStatus.create).not.toHaveBeenCalled();
    });

    it('grava historicoStatus com observacao null quando observacao não for fornecida', async () => {
      const mockAgendamento = {
        id: agendamentoId,
        status: StatusAgendamento.AGENDADO,
      };
      const mockAtualizado = {
        ...mockAgendamento,
        status: StatusAgendamento.CONFIRMADO,
      };

      prisma.agendamento.findUnique.mockResolvedValue(mockAgendamento);
      prisma.agendamento.updateMany.mockResolvedValue({ count: 1 });
      prisma.agendamento.findUniqueOrThrow.mockResolvedValue(mockAtualizado);
      prisma.historicoStatus.create.mockResolvedValue({ id: 'hist-uuid-1' });

      await service.transicionar(
        agendamentoId,
        StatusAgendamento.CONFIRMADO,
        responsavelId,
      );

      expect(prisma.historicoStatus.create).toHaveBeenCalledWith({
        data: {
          agendamentoId,
          statusAnterior: StatusAgendamento.AGENDADO,
          statusNovo: StatusAgendamento.CONFIRMADO,
          em: expect.any(Date),
          responsavelId,
          observacao: null,
        },
      });
    });

    it('grava historicoStatus com observacao null quando observacao for string em branco', async () => {
      const mockAgendamento = {
        id: agendamentoId,
        status: StatusAgendamento.AGENDADO,
      };
      const mockAtualizado = {
        ...mockAgendamento,
        status: StatusAgendamento.CONFIRMADO,
      };

      prisma.agendamento.findUnique.mockResolvedValue(mockAgendamento);
      prisma.agendamento.updateMany.mockResolvedValue({ count: 1 });
      prisma.agendamento.findUniqueOrThrow.mockResolvedValue(mockAtualizado);
      prisma.historicoStatus.create.mockResolvedValue({ id: 'hist-uuid-1' });

      await service.transicionar(
        agendamentoId,
        StatusAgendamento.CONFIRMADO,
        responsavelId,
        '   ',
      );

      expect(prisma.historicoStatus.create).toHaveBeenCalledWith({
        data: {
          agendamentoId,
          statusAnterior: StatusAgendamento.AGENDADO,
          statusNovo: StatusAgendamento.CONFIRMADO,
          em: expect.any(Date),
          responsavelId,
          observacao: null,
        },
      });
    });
  });
});
