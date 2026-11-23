import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { ErrorMonitoringService } from './common/observability/error-monitoring.service';
import { HttpLoggingInterceptor } from './common/observability/logging.interceptor';
import { RequestIdMiddleware } from './common/observability/request-id.middleware';
import { HealthController } from './health/health.controller';
import { PerfilModule } from './perfil/perfil.module';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';
import { ShellAuthModule } from './shell-auth/shell-auth.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { AgendaModule } from './agenda/agenda.module';
import { DisponibilidadesModule } from './disponibilidades/disponibilidades.module';

@Module({
  imports: [
    PrismaModule,
    ShellAuthModule,
    TasksModule,
    AgendamentosModule,
    AgendaModule,
    DisponibilidadesModule,
    PerfilModule,
  ],
  controllers: [HealthController],
  providers: [
    ErrorMonitoringService,
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}