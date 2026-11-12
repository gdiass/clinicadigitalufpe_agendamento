import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO de resposta de GET /api/v1/perfil/me */
export class PerfilDto {
  @ApiProperty({
    description: 'Perfil de negócio do usuário na Agenda.',
    enum: ['RECEPCAO', 'PROFISSIONAL'],
    example: 'RECEPCAO',
  })
  perfil!: 'RECEPCAO' | 'PROFISSIONAL';

  @ApiPropertyOptional({
    description:
      'UUID do profissional no microsserviço Cadastro (DS-63). ' +
      'Presente somente quando perfil === "PROFISSIONAL".',
    example: '00000000-0000-4000-a000-000000000010',
    format: 'uuid',
  })
  profissionalId?: string;
}
