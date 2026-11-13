import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DisponibilidadesController } from './disponibilidades.controller';
import { DisponibilidadesService } from './disponibilidades.service';

@Module({
  imports: [PrismaModule],
  controllers: [DisponibilidadesController],
  providers: [DisponibilidadesService],
})
export class DisponibilidadesModule {}
