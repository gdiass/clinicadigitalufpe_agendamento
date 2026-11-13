import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProblemDetailsDto } from '../common/dto/problem-details.dto';
import {
  CreateDisponibilidadeDto,
  DisponibilidadeDto,
  ListDisponibilidadesQueryDto,
  PaginatedDisponibilidadesResponseDto,
} from './disponibilidade.dto';
import { DisponibilidadesService } from './disponibilidades.service';

@ApiTags('disponibilidades')
@Controller('disponibilidades')
export class DisponibilidadesController {
  constructor(private readonly disponibilidadesService: DisponibilidadesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cadastrar disponibilidade do profissional (US-01)',
    description: 'Cria a janela de disponibilidade e gera os slots dela, de acordo com a duração informada.',
  })
  @ApiResponse({ status: 201, description: 'Disponibilidade criada com os slots', type: DisponibilidadeDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos, fim antes do início ou janela que não se divide na duração', type: ProblemDetailsDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ProblemDetailsDto })
  @ApiResponse({ status: 409, description: 'Sobrepõe outra disponibilidade do mesmo profissional', type: ProblemDetailsDto })
  async criar(@Body() dto: CreateDisponibilidadeDto): Promise<DisponibilidadeDto> {
    return this.disponibilidadesService.criar(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar disponibilidades',
    description: 'Lista as disponibilidades com os slots e quantos estão ocupados, com filtro por profissional e período.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de disponibilidades', type: PaginatedDisponibilidadesResponseDto })
  @ApiResponse({ status: 400, description: 'Filtros inválidos', type: ProblemDetailsDto })
  @ApiResponse({ status: 401, description: 'Não autenticado', type: ProblemDetailsDto })
  async listar(@Query() query: ListDisponibilidadesQueryDto): Promise<PaginatedDisponibilidadesResponseDto> {
    return this.disponibilidadesService.listar(query);
  }
}
