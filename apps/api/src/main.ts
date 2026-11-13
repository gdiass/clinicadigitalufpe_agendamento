import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { APP_CONFIG, type AppConfig } from './config/app.config';
import { setupSwagger } from './openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  configureApp(app);

  app.enableCors({
    origin: new URL(config.webBaseUrl).origin,
    credentials: true,
  });
  app.enableShutdownHooks();

  const isSwaggerEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    process.env.ENABLE_SWAGGER === 'true' ||
    config.nodeEnv !== 'production';

  if (isSwaggerEnabled) {
    setupSwagger(app);
  }

  await app.listen(config.apiPort);
  console.log(`[api] ouvindo em ${config.apiBaseUrl}`);
  if (isSwaggerEnabled) {
    console.log(`[api] documentação Swagger disponível em ${config.apiBaseUrl}/api/v1/docs`);
  }
}

void bootstrap();
