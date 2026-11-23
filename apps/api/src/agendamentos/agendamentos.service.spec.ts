import { NotFoundException } from '@nestjs/common';
import { Modalidade, StatusAgendamento, TipoAtendimento } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { type AgendamentoDetalhado, INCLUDE_DETALHE, paraAgendamentoDto } from './agendamento-detalhe';
import { AgendamentosService } from './agendamentos.service';

const ID = '00000000-0000-4000-a000-000000000201';
const RESPONSAVEL = '00000000-0000-4000-a000-000000000040';

function agendamentoConfirmado(extra: Partial<AgendamentoDetalhado> = {}): AgendamentoDetalhado {
  return {
    id: ID,
    slotId: '00000000-0000-4000-a000-000000000101',
    pacienteId: '00000000-0000-4000-a000-000000000021',
    profissionalId: '00000000-0000-4000-a000-000000000010',
    servicoId: '00000000-0000-4000-a000-000000000002',
    clinicaId: '00000000-0000-4000-a000-000000000001',
    inicio: new Date('2026-10-06T11:30:00.000Z'),
    fim: new Date('2026-10-06T12:00:00.000Z'),
    tipoAtendimento: TipoAtendimento.CONSULTA,
    modalidade: Modalidade.PRESENCIAL,
    status: StatusAgendamento.CONFIRMADO,
    motivo: 'Dor lombar',
    origemDemanda: null,
    chegadaEm: null,
    inicioAtendimentoEm: null,
    fimAtendimentoEm: null,
    canceladoEm: null,
    motivoCancelamento: null,
    canceladoPorId: null,
    agendamentoOrigemId: null,
    createdAt: new Date('2026-10-01T12:00:00.000Z'),
    updatedAt: new Date('2026-10-02T12:00:00.000Z'),
    slot: {
      id: '00000000-0000-4000-a000-000000000101',
      disponibilidadeId: '00000000-0000-4000-a000-000000000030',
      inicio: new Date('2026-10-06T11:30:00.000Z'),
      fim: new Date('2026-10-06T12:00:00.000Z'),
      createdAt: new Date('2026-10-01T12:00:00.000Z'),
      updatedAt: new Date('2026-10-01T12:00:00.000Z'),
    },
    historicoStatus: [
      {
        id: '00000000-0000-4000-a000-000000000301',
        agendamentoId: ID,
        statusAnterior: null,
        statusNovo: StatusAgendamento.AGENDADO,
        em: new Date('2026-10-01T12:00:00.000Z'),
        responsavelId: RESPONSAVEL,
        observacao: null,
        createdAt: new Date('2026-10-01T12:00:00.000Z'),
        updatedAt: new Date('2026-10-01T12:00:00.000Z'),
      },
      {
        id: '00000000-0000-4000-a000-000000000302',
        agendamentoId: ID,
        statusAnterior: StatusAgendamento.AGENDADO,
        statusNovo: StatusAgendamento.CONFIRMADO,
        em: new Date('2026-10-02T12:00:00.000Z'),
        responsavelId: RESPONSAVEL,
        observacao: 'Confirmado por telefone',
        createdAt: new Date('2026-10-02T12:00:00.000Z'),
        updatedAt: new Date('2026-10-02T12:00:00.000Z'),
      },
    ],
    ...extra,
  };
}

describe('paraAgendamentoDto', () => {
  it('monta o detalhe com participantes como referência, slot e histórico em ISO 8601', () => {
    expect(paraAgendamentoDto(agendamentoConfirmado())).toEqual({
      id: ID,
      status: StatusAgendamento.CONFIRMADO,
      inicio: '2026-10-06T11:30:00.000Z',
      fim: '2026-10-06T12:00:00.000Z',
      modalidade: Modalidade.PRESENCIAL,
      tipoAtendimento: TipoAtendimento.CONSULTA,
      paciente: { id: '00000000-0000-4000-a000-000000000021' },
      profissional: { id: '00000000-0000-4000-a000-000000000010' },
      clinica: { id: '00000000-0000-4000-a000-000000000001' },
      servico: { id: '00000000-0000-4000-a000-000000000002' },
      slot: {
        id: '00000000-0000-4000-a000-000000000101',
        inicio: '2026-10-06T11:30:00.000Z',
        fim: '2026-10-06T12:00:00.000Z',
      },
      motivo: 'Dor lombar',
      origemDemanda: null,
      chegadaEm: null,
      inicioAtendimentoEm: null,
      fimAtendimentoEm: null,
      canceladoEm: null,
      motivoCancelamento: null,
      canceladoPorId: null,
      agendamentoOrigemId: null,
      historico: [
        {
          id: '00000000-0000-4000-a000-000000000301',
          statusAnterior: null,
          statusNovo: StatusAgendamento.AGENDADO,
          em: '2026-10-01T12:00:00.000Z',
          responsavelId: RESPONSAVEL,
          observacao: null,
        },
        {
          id: '00000000-0000-4000-a000-000000000302',
          statusAnterior: StatusAgendamento.AGENDADO,
          statusNovo: StatusAgendamento.CONFIRMADO,
          em: '2026-10-02T12:00:00.000Z',
          responsavelId: RESPONSAVEL,
          observacao: 'Confirmado por telefone',
        },
      ],
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-02T12:00:00.000Z',
    });
  });

  it('devolve slot null quando o agendamento não ocupa slot (encaixe)', () => {
    expect(paraAgendamentoDto(agendamentoConfirmado({ slotId: null, slot: null })).slot).toBeNull();
  });

  const CAMPOS_DE_DATA = ['chegadaEm', 'inicioAtendimentoEm', 'fimAtendimentoEm', 'canceladoEm'] as const;
  const CAMPOS_DE_TEXTO = ['motivo', 'origemDemanda', 'motivoCancelamento', 'canceladoPorId', 'agendamentoOrigemId'] as const;

  it.each(CAMPOS_DE_DATA)('%s: Date vira ISO 8601 e null continua null', (campo) => {
    const instante = new Date('2026-10-06T11:20:30.123Z');

    expect(paraAgendamentoDto(agendamentoConfirmado({ [campo]: instante }))[campo]).toBe('2026-10-06T11:20:30.123Z');
    expect(paraAgendamentoDto(agendamentoConfirmado({ [campo]: null }))[campo]).toBeNull();
  });

  it.each(CAMPOS_DE_TEXTO)('%s: valor é repassado e null continua null (nunca undefined)', (campo) => {
    expect(paraAgendamentoDto(agendamentoConfirmado({ [campo]: 'valor-x' }))[campo]).toBe('valor-x');

    const dto = paraAgendamentoDto(agendamentoConfirmado({ [campo]: null }));
    expect(dto).toHaveProperty(campo, null);
  });

  it('não confunde string vazia com ausência', () => {
    expect(paraAgendamentoDto(agendamentoConfirmado({ motivo: '' })).motivo).toBe('');
  });

  it('devolve histórico vazio quando não há registros', () => {
    expect(paraAgendamentoDto(agendamentoConfirmado({ historicoStatus: [] })).historico).toEqual([]);
  });

  it('mantém a ordem do histórico que veio do banco (quem ordena é o INCLUDE_DETALHE)', () => {
    const [primeiro, segundo] = agendamentoConfirmado().historicoStatus;

    const dto = paraAgendamentoDto(agendamentoConfirmado({ historicoStatus: [segundo, primeiro] }));

    expect(dto.historico.map((h) => h.id)).toEqual([segundo.id, primeiro.id]);
  });

  it('usa os horários do slot, não os do agendamento, no objeto slot', () => {
    const base = agendamentoConfirmado();
    const dto = paraAgendamentoDto({
      ...base,
      inicio: new Date('2026-10-06T11:40:00.000Z'),
      slot: { ...base.slot!, inicio: new Date('2026-10-06T11:30:00.000Z') },
    });

    expect(dto.inicio).toBe('2026-10-06T11:40:00.000Z');
    expect(dto.slot?.inicio).toBe('2026-10-06T11:30:00.000Z');
  });

  it('não altera o objeto lido do banco', () => {
    const lido = agendamentoConfirmado();
    const copia = structuredClone(lido);

    paraAgendamentoDto(lido);

    expect(lido).toEqual(copia);
  });
});

describe('AgendamentosService.obterPorId', () => {
  let prisma: { agendamento: { findUnique: ReturnType<typeof vi.fn> } };
  let service: AgendamentosService;

  beforeEach(() => {
    prisma = { agendamento: { findUnique: vi.fn() } };
    service = new AgendamentosService(prisma as unknown as PrismaService);
  });

  it('busca com o include do detalhe e devolve o DTO', async () => {
    prisma.agendamento.findUnique.mockResolvedValue(agendamentoConfirmado());

    const dto = await service.obterPorId(ID);

    expect(prisma.agendamento.findUnique).toHaveBeenCalledWith({ where: { id: ID }, include: INCLUDE_DETALHE });
    expect(dto).toEqual(paraAgendamentoDto(agendamentoConfirmado()));
  });

  it('propaga erro do banco em vez de transformar em 404', async () => {
    prisma.agendamento.findUnique.mockRejectedValue(new Error('conexão perdida'));

    await expect(service.obterPorId(ID)).rejects.toThrow('conexão perdida');
  });

  it('lança NotFoundException quando o agendamento não existe', async () => {
    prisma.agendamento.findUnique.mockResolvedValue(null);

    await expect(service.obterPorId(ID)).rejects.toThrow(new NotFoundException('Agendamento não encontrado.'));
  });
});
