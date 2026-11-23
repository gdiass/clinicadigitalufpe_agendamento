import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Modalidade, StatusAgendamento, TipoAtendimento } from '@prisma/client';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import { ReferenciaCadastroDto } from '../agendamentos/agendamento.dto';

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Filtros da agenda do dia (US-12, tela T01). */
export class AgendaDoDiaQueryDto {
  @ApiProperty({ description: 'Dia da agenda, no calendário de Recife (AAAA-MM-DD)', example: '2026-10-06' })
  @Matches(FORMATO_DATA, { message: 'data deve estar no formato AAAA-MM-DD.' })
  data!: string;

  @ApiPropertyOptional({ description: 'Mostra só os horários deste profissional' })
  @IsOptional()
  @IsUUID('all', { message: 'profissionalId deve ser um UUID.' })
  profissionalId?: string;

  @ApiPropertyOptional({ description: 'Mostra só os horários deste serviço' })
  @IsOptional()
  @IsUUID('all', { message: 'servicoId deve ser um UUID.' })
  servicoId?: string;
}

/** Agendamento que ocupa (ou ocupou) um horário da agenda. */
export class AgendamentoDaAgendaDto {
  @ApiProperty({ description: 'Identificador do agendamento (abre a T05)' })
  id!: string;

  @ApiProperty({ description: 'Estado atual (RN08)', enum: StatusAgendamento, enumName: 'StatusAgendamento' })
  status!: StatusAgendamento;

  @ApiProperty({ description: 'Paciente', type: ReferenciaCadastroDto })
  paciente!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Tipo do atendimento', enum: TipoAtendimento, enumName: 'TipoAtendimento' })
  tipoAtendimento!: TipoAtendimento;
}

/** Uma linha da agenda do dia: um horário livre ou um agendamento. */
export class HorarioDaAgendaDto {
  @ApiProperty({ description: 'Início (ISO 8601)', example: '2026-10-06T11:00:00.000Z' })
  inicio!: string;

  @ApiProperty({ description: 'Fim (ISO 8601)', example: '2026-10-06T11:30:00.000Z' })
  fim!: string;

  @ApiProperty({ description: 'Profissional', type: ReferenciaCadastroDto })
  profissional!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Serviço que identifica a agenda do profissional', type: ReferenciaCadastroDto })
  servico!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Clínica', type: ReferenciaCadastroDto })
  clinica!: ReferenciaCadastroDto;

  @ApiProperty({ description: 'Modalidade do atendimento', enum: Modalidade, enumName: 'Modalidade' })
  modalidade!: Modalidade;

  @ApiProperty({
    description: 'Slot da disponibilidade (null quando o agendamento não tem slot, ex.: encaixe)',
    nullable: true,
    type: String,
  })
  slotId!: string | null;

  @ApiProperty({
    description:
      'Agendamento da linha. null quando o horário está livre. Um agendamento CANCELADO ou REMARCADO aparece numa linha própria, e o slot dele volta como livre em outra linha.',
    nullable: true,
    type: AgendamentoDaAgendaDto,
  })
  agendamento!: AgendamentoDaAgendaDto | null;
}

/** Agenda do dia: horários livres e agendamentos, em ordem de início. */
export class AgendaDoDiaDto {
  @ApiProperty({ description: 'Dia consultado (AAAA-MM-DD)', example: '2026-10-06' })
  data!: string;

  @ApiProperty({
    description: 'Se há disponibilidade cadastrada no dia para os filtros. Quando false, a tela mostra "Nenhuma disponibilidade cadastrada para este dia".',
  })
  temDisponibilidade!: boolean;

  @ApiProperty({
    description: 'Horários em ordem de início. No mesmo horário e profissional: agendamento ativo, horário livre e, por último, agendamentos cancelados ou remarcados.',
    type: [HorarioDaAgendaDto],
  })
  horarios!: HorarioDaAgendaDto[];
}
