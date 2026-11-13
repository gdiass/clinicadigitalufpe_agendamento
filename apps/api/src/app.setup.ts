import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Configuração HTTP comum da API: prefixo das rotas e validação dos DTOs.
 * Usada pelo main.ts e pelos testes e2e, para que os testes exercitem
 * a mesma API que roda de verdade.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/(.*)'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
}
