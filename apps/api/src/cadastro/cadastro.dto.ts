import { ApiProperty } from '@nestjs/swagger';

export class ClinicaDto {
  @ApiProperty({ description: 'Identificador da clínica (id do Cadastro)', example: '00000000-0000-4000-a000-000000000001' })
  id!: string;

  @ApiProperty({ description: 'Nome da clínica', example: 'Clínica Digital UFPE' })
  nome!: string;
}

export class ProfissionalDto {
  @ApiProperty({ description: 'Identificador do profissional (id do Cadastro)', example: '00000000-0000-4000-a000-000000000010' })
  id!: string;

  @ApiProperty({ description: 'Nome do profissional', example: 'Dra. Ana Lima' })
  nome!: string;
}

export class ServicoDto {
  @ApiProperty({ description: 'Identificador do serviço (id do Cadastro)', example: '00000000-0000-4000-a000-000000000002' })
  id!: string;

  @ApiProperty({ description: 'Nome do serviço', example: 'Fisioterapia' })
  nome!: string;
}