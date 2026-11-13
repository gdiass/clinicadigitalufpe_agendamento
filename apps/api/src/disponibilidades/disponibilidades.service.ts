import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { STATUS_QUE_LIBERAM_SLOT } from '../agendamentos/ocupacao-slot';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDisponibilidadeDto,
  DisponibilidadeDto,
  ListDisponibilidadesQueryDto,
  PaginatedDisponibilidadesResponseDto,
} from './disponibilidade.dto';
import {
  deColunaDate,
  deColunaTime,
  ehDataValida,
  instanteEmRecife,
  paraColunaDate,
  paraColunaTime,
  paraMinutos,
} from './horario';

const CONSTRAINT_SOBREPOSICAO = 'disponibilidades_sem_sobreposicao';
const PAGE_SIZE_PADRAO = 20;

const INCLUDE_SLOTS = {
  slots: {
    orderBy: { inicio: 'asc' },
    include: {
      _count: {
        select: { agendamentos: { where: { status: { notIn: STATUS_QUE_LIBERAM_SLOT } } } },
      },
    },
  },
} satisfies Prisma.DisponibilidadeInclude;

type DisponibilidadeComSlots = Prisma.DisponibilidadeGetPayload<{ include: typeof INCLUDE_SLOTS }>;

/** Horários de início e fim de um slot, ainda sem id. */
export interface SlotGerado {
  inicio: Date;
  fim: Date;
}

/**
 * Divide a janela [inicio, fim) do dia em slots consecutivos de `duracaoMin` minutos.
 * A janela precisa ser múltipla da duração; quem chama valida isso antes.
 */
export function gerarSlots(data: string, inicioMin: number, fimMin: number, duracaoMin: number): SlotGerado[] {
  const slots: SlotGerado[] = [];
  for (let minuto = inicioMin; minuto + duracaoMin <= fimMin; minuto += duracaoMin) {
    slots.push({
      inicio: instanteEmRecife(data, minuto),
      fim: instanteEmRecife(data, minuto + duracaoMin),
    });
  }
  return slots;
}

/** Mensagem do cenário "disponibilidade sobreposta" da US-01, com o período que já existe. */
export function mensagemSobreposicao(inicio: string, fim: string): string {
  return `Já existe disponibilidade neste período (${inicio}–${fim})`;
}

function erroDeCampo(campo: string, mensagem: string): BadRequestException {
  return new BadRequestException({ message: mensagem, errors: { [campo]: [mensagem] } });
}

function ehViolacaoDeSobreposicao(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientUnknownRequestError && error.message.includes(CONSTRAINT_SOBREPOSICAO);
}

/**
 * Segura, até o fim da transação, um lock exclusivo da agenda do profissional, para que
 * dois cadastros simultâneos do mesmo profissional rodem um depois do outro. Sem ele,
 * as duas inserções esperam uma pela outra no índice do EXCLUDE e o Postgres aborta
 * uma delas por deadlock, o que viraria erro 500 em vez de 409.
 */
async function travarAgendaDoProfissional(tx: Prisma.TransactionClient, profissionalId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${profissionalId}, 0))`;
}

@Injectable()
export class DisponibilidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CreateDisponibilidadeDto): Promise<DisponibilidadeDto> {
    const inicioMin = paraMinutos(dto.inicio);
    const fimMin = paraMinutos(dto.fim);
    this.validarJanela(dto, inicioMin, fimMin);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await travarAgendaDoProfissional(tx, dto.profissionalId);
        await this.garantirSemSobreposicao(tx, dto);
        const criada = await tx.disponibilidade.create({
          data: {
            profissionalId: dto.profissionalId,
            clinicaId: dto.clinicaId,
            servicoId: dto.servicoId,
            data: paraColunaDate(dto.data),
            inicio: paraColunaTime(dto.inicio),
            fim: paraColunaTime(dto.fim),
            modalidade: dto.modalidade,
            duracaoSlotMin: dto.duracaoSlotMin,
            slots: {
              createMany: { data: gerarSlots(dto.data, inicioMin, fimMin, dto.duracaoSlotMin) },
            },
          },
          include: INCLUDE_SLOTS,
        });
        return this.serializar(criada);
      });
    } catch (error) {
      if (!ehViolacaoDeSobreposicao(error)) throw error;
      await this.garantirSemSobreposicao(this.prisma, dto);
      throw new ConflictException('Já existe disponibilidade neste período');
    }
  }

  async listar(query: ListDisponibilidadesQueryDto): Promise<PaginatedDisponibilidadesResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? PAGE_SIZE_PADRAO;
    const where = this.filtroDaListagem(query);

    const [total, itens] = await Promise.all([
      this.prisma.disponibilidade.count({ where }),
      this.prisma.disponibilidade.findMany({
        where,
        include: INCLUDE_SLOTS,
        orderBy: [{ data: 'asc' }, { inicio: 'asc' }, { profissionalId: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: itens.map((item) => this.serializar(item)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) || 1 },
    };
  }

  private validarJanela(dto: CreateDisponibilidadeDto, inicioMin: number, fimMin: number): void {
    if (!ehDataValida(dto.data)) {
      throw erroDeCampo('data', 'data não existe no calendário.');
    }
    if (fimMin <= inicioMin) {
      throw erroDeCampo('fim', 'A hora de fim deve ser posterior à hora de início');
    }
    if ((fimMin - inicioMin) % dto.duracaoSlotMin !== 0) {
      throw erroDeCampo(
        'duracaoSlotMin',
        `A janela de ${dto.inicio} a ${dto.fim} não se divide em slots de ${dto.duracaoSlotMin} minutos.`,
      );
    }
  }

  private async garantirSemSobreposicao(db: Prisma.TransactionClient, dto: CreateDisponibilidadeDto): Promise<void> {
    const existente = await db.disponibilidade.findFirst({
      where: {
        profissionalId: dto.profissionalId,
        data: paraColunaDate(dto.data),
        inicio: { lt: paraColunaTime(dto.fim) },
        fim: { gt: paraColunaTime(dto.inicio) },
      },
      orderBy: { inicio: 'asc' },
    });
    if (existente) {
      throw new ConflictException(mensagemSobreposicao(deColunaTime(existente.inicio), deColunaTime(existente.fim)));
    }
  }

  private filtroDaListagem(query: ListDisponibilidadesQueryDto): Prisma.DisponibilidadeWhereInput {
    for (const campo of ['dataInicio', 'dataFim'] as const) {
      const valor = query[campo];
      if (valor !== undefined && !ehDataValida(valor)) {
        throw erroDeCampo(campo, `${campo} não existe no calendário.`);
      }
    }
    if (query.dataInicio && query.dataFim && query.dataFim < query.dataInicio) {
      throw erroDeCampo('dataFim', 'dataFim deve ser igual ou posterior a dataInicio.');
    }

    const where: Prisma.DisponibilidadeWhereInput = {};
    if (query.profissionalId) where.profissionalId = query.profissionalId;
    if (query.dataInicio || query.dataFim) {
      where.data = {
        ...(query.dataInicio ? { gte: paraColunaDate(query.dataInicio) } : {}),
        ...(query.dataFim ? { lte: paraColunaDate(query.dataFim) } : {}),
      };
    }
    return where;
  }

  private serializar(disponibilidade: DisponibilidadeComSlots): DisponibilidadeDto {
    const slots = disponibilidade.slots.map((slot) => ({
      id: slot.id,
      inicio: slot.inicio.toISOString(),
      fim: slot.fim.toISOString(),
      ocupado: slot._count.agendamentos > 0,
    }));

    return {
      id: disponibilidade.id,
      profissionalId: disponibilidade.profissionalId,
      clinicaId: disponibilidade.clinicaId,
      servicoId: disponibilidade.servicoId,
      data: deColunaDate(disponibilidade.data),
      inicio: deColunaTime(disponibilidade.inicio),
      fim: deColunaTime(disponibilidade.fim),
      modalidade: disponibilidade.modalidade,
      duracaoSlotMin: disponibilidade.duracaoSlotMin,
      totalSlots: slots.length,
      slotsOcupados: slots.filter((slot) => slot.ocupado).length,
      slots,
      createdAt: disponibilidade.createdAt.toISOString(),
      updatedAt: disponibilidade.updatedAt.toISOString(),
    };
  }
}
