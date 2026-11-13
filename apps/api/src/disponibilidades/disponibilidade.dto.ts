import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Modalidade } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Matches, Min } from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from '../common/dto/pagination.dto';

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MENSAGEM_DATA = 'deve estar no formato AAAA-MM-DD.';
const MENSAGEM_HORA = 'deve estar no formato HH:mm (00:00 a 23:59).';

export class CreateDisponibilidadeDto {
  @ApiProperty({ description: 'Profissional dono da disponibilidade (id do Cadastro)', example: '00000000-0000-4000-a000-000000000010' })
  @IsUUID('all', { message: 'profissionalId deve ser um UUID.' })
  profissionalId!: string;

  @ApiProperty({ description: 'Clínica onde o atendimento acontece (id do Cadastro)', example: '00000000-0000-4000-a000-000000000001' })
  @IsUUID('all', { message: 'clinicaId deve ser um UUID.' })
  clinicaId!: string;

  @ApiProperty({ description: 'Serviço oferecido na janela (id do Cadastro)', example: '00000000-0000-4000-a000-000000000002' })
  @IsUUID('all', { message: 'servicoId deve ser um UUID.' })
  servicoId!: string;

  @ApiProperty({ description: 'Dia da disponibilidade (AAAA-MM-DD)', example: '2026-10-06' })
  @Matches(FORMATO_DATA, { message: `data ${MENSAGEM_DATA}` })
  data!: string;

  @ApiProperty({ description: 'Hora de início, no horário de Recife (HH:mm)', example: '08:00' })
  @Matches(FORMATO_HORA, { message: `inicio ${MENSAGEM_HORA}` })
  inicio!: string;

  @ApiProperty({ description: 'Hora de fim, no horário de Recife (HH:mm)', example: '12:00' })
  @Matches(FORMATO_HORA, { message: `fim ${MENSAGEM_HORA}` })
  fim!: string;

  @ApiProperty({ description: 'Modalidade do atendimento', enum: Modalidade, enumName: 'Modalidade', example: Modalidade.PRESENCIAL })
  @IsEnum(Modalidade, { message: 'modalidade deve ser PRESENCIAL ou REMOTO.' })
  modalidade!: Modalidade;

  @ApiProperty({ description: 'Duração de cada slot, em minutos', example: 30, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'duracaoSlotMin deve ser um número inteiro.' })
  @Min(1, { message: 'duracaoSlotMin deve ser no mínimo 1.' })
  duracaoSlotMin!: number;
}

export class ListDisponibilidadesQueryDto extends PickType(PaginationQueryDto, ['page', 'pageSize'] as const) {
  @ApiPropertyOptional({ description: 'Filtra pelo profissional' })
  @IsOptional()
  @IsUUID('all', { message: 'profissionalId deve ser um UUID.' })
  profissionalId?: string;

  @ApiPropertyOptional({ description: 'Primeiro dia do período, inclusive (AAAA-MM-DD)', example: '2026-10-01' })
  @IsOptional()
  @Matches(FORMATO_DATA, { message: `dataInicio ${MENSAGEM_DATA}` })
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Último dia do período, inclusive (AAAA-MM-DD)', example: '2026-10-31' })
  @IsOptional()
  @Matches(FORMATO_DATA, { message: `dataFim ${MENSAGEM_DATA}` })
  dataFim?: string;
}

export class SlotDto {
  @ApiProperty({ description: 'Identificador do slot' })
  id!: string;

  @ApiProperty({ description: 'Início do slot (ISO 8601)', example: '2026-10-06T11:00:00.000Z' })
  inicio!: string;

  @ApiProperty({ description: 'Fim do slot (ISO 8601)', example: '2026-10-06T11:30:00.000Z' })
  fim!: string;

  @ApiProperty({ description: 'Se o slot já tem agendamento ativo (RN01)' })
  ocupado!: boolean;
}

export class DisponibilidadeDto {
  @ApiProperty({ description: 'Identificador da disponibilidade' })
  id!: string;

  @ApiProperty({ description: 'Profissional dono da disponibilidade' })
  profissionalId!: string;

  @ApiProperty({ description: 'Clínica do atendimento' })
  clinicaId!: string;

  @ApiProperty({ description: 'Serviço oferecido' })
  servicoId!: string;

  @ApiProperty({ description: 'Dia (AAAA-MM-DD)', example: '2026-10-06' })
  data!: string;

  @ApiProperty({ description: 'Hora de início (HH:mm)', example: '08:00' })
  inicio!: string;

  @ApiProperty({ description: 'Hora de fim (HH:mm)', example: '12:00' })
  fim!: string;

  @ApiProperty({ description: 'Modalidade do atendimento', enum: Modalidade, enumName: 'Modalidade' })
  modalidade!: Modalidade;

  @ApiProperty({ description: 'Duração de cada slot, em minutos', example: 30 })
  duracaoSlotMin!: number;

  @ApiProperty({ description: 'Quantidade de slots da janela', example: 8 })
  totalSlots!: number;

  @ApiProperty({ description: 'Quantidade de slots ocupados', example: 2 })
  slotsOcupados!: number;

  @ApiProperty({ description: 'Slots da janela em ordem de horário', type: [SlotDto] })
  slots!: SlotDto[];

  @ApiProperty({ description: 'Data de criação' })
  createdAt!: string;

  @ApiProperty({ description: 'Data de última atualização' })
  updatedAt!: string;
}

export class PaginatedDisponibilidadesResponseDto {
  @ApiProperty({ description: 'Disponibilidades da página', type: [DisponibilidadeDto] })
  data!: DisponibilidadeDto[];

  @ApiProperty({ description: 'Metadados de paginação', type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
