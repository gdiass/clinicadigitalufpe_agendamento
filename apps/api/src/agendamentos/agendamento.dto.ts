import { ApiProperty } from '@nestjs/swagger';
import { Modalidade, StatusAgendamento, TipoAtendimento } from '@prisma/client';

/** Referência a um registro do Cadastro (paciente, profissional, clínica ou serviço). */
export class ReferenciaCadastroDto {
  @ApiProperty({ description: 'Identificador no Cadastro', example: '00000000-0000-4000-a000-000000000020' })
  id!: string;
}

/** Slot da disponibilidade ocupado pelo agendamento. */
export class SlotDoAgendamentoDto {
  @ApiProperty({ description: 'Identificador do slot' })
  id!: string;

  @ApiProperty({ description: 'Início do slot (ISO 8601)', example: '2026-10-06T11:00:00.000Z' })
  inicio!: string;

  @ApiProperty({ description: 'Fim do slot (ISO 8601)', example: '2026-10-06T11:30:00.000Z' })
  fim!: string;
}

/** Uma troca de estado registrada no histórico do agendamento. */
export class HistoricoStatusDto {
  @ApiProperty({ description: 'Identificador do registro' })
  id!: string;

  @ApiProperty({
    description: 'Estado anterior (null na criação do agendamento)',
    enum: StatusAgendamento,
    enumName: 'StatusAgendamento',
    nullable: true,
  })
  statusAnterior!: StatusAgendamento | null;

  @ApiProperty({ description: 'Estado novo', enum: StatusAgendamento, enumName: 'StatusAgendamento' })
  statusNovo!: StatusAgendamento;

  @ApiProperty({ description: 'Quando a troca aconteceu (ISO 8601)' })
  em!: string;

  @ApiProperty({ description: 'Usuário do Shell que fez a troca' })
  responsavelId!: string;

  @ApiProperty({ description: 'Observação registrada junto com a troca', nullable: true, type: String })
  observacao!: string | null;
}

/** Agendamento com estado, horários, participantes e histórico de status. */
export class AgendamentoDto {
  @ApiProperty({ description: 'Identificador do agendamento' })
  id!: string;

  @ApiProperty({ description: 'Estado atual (RN08)', enum: StatusAgendamento, enumName: 'StatusAgendamento' })
  status!: StatusAgendamento;

  @ApiProperty({ description: 'Início marcado (ISO 8601)', example: '2026-10-06T11:00:00.000Z' })
  inicio!: string;

  @ApiProperty({ description: 'Fim marcado (ISO 8601)', example: '2026-10-06T11:30:00.000Z' })
  fim!: string;

  @ApiProperty({ description: 'Modalidade do atendimento', enum: Modalidade, enumName: 'Modalidade' })
  modalidade!: Modalidade;

  @ApiProperty({ description: 'Tipo do atendimento', enum: TipoAtendimento, enumName: 'TipoAtendimento' })
  tipoAtendimento!: TipoAtendimento;

  @ApiProperty({ description: 'Paciente atendido', type: ReferenciaCadastroDto })
  paciente!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Profissional responsável', type: ReferenciaCadastroDto })
  profissional!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Clínica do atendimento', type: ReferenciaCadastroDto })
  clinica!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Serviço do atendimento', type: ReferenciaCadastroDto })
  servico!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Slot da agenda reservado na marcação; null quando não há slot (ex.: encaixe). Em CANCELADO e REMARCADO o slot continua aqui, mas já está livre na agenda', type: SlotDoAgendamentoDto, nullable: true })
  slot!: SlotDoAgendamentoDto | null;

  @ApiProperty({ description: 'Motivo do atendimento', nullable: true, type: String })
  motivo!: string | null;

  @ApiProperty({ description: 'Origem da demanda', nullable: true, type: String })
  origemDemanda!: string | null;

  @ApiProperty({ description: 'Chegada do paciente (ISO 8601)', nullable: true, type: String })
  chegadaEm!: string | null;

  @ApiProperty({ description: 'Início do atendimento (ISO 8601)', nullable: true, type: String })
  inicioAtendimentoEm!: string | null;

  @ApiProperty({ description: 'Fim do atendimento (ISO 8601)', nullable: true, type: String })
  fimAtendimentoEm!: string | null;

  @ApiProperty({ description: 'Data do cancelamento (ISO 8601)', nullable: true, type: String })
  canceladoEm!: string | null;

  @ApiProperty({ description: 'Motivo do cancelamento', nullable: true, type: String })
  motivoCancelamento!: string | null;

  @ApiProperty({ description: 'Usuário do Shell que cancelou', nullable: true, type: String })
  canceladoPorId!: string | null;

  @ApiProperty({ description: 'Agendamento original, quando este veio de uma remarcação', nullable: true, type: String })
  agendamentoOrigemId!: string | null;

  @ApiProperty({ description: 'Trocas de estado em ordem cronológica', type: [HistoricoStatusDto] })
  historico!: HistoricoStatusDto[];

  @ApiProperty({ description: 'Data de criação' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de última atualização' })
  updatedAt!: string;
}
