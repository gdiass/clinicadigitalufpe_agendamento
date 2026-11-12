import { Logger, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app.config';
import { MockPerfilProvider } from './mock-perfil.provider';
import { PerfilController } from './perfil.controller';
import { PERFIL_PROVIDER } from './perfil.types';
import { ShellPerfilProvider } from './shell-perfil.provider';

@Module({
  controllers: [PerfilController],
  providers: [
    {
      provide: PERFIL_PROVIDER,
      useFactory: (config: AppConfig) => {
        const isMock = config.perfilProvider === 'mock';
        const isProd = config.nodeEnv === 'production';

        if (isMock && isProd) {
          Logger.warn(
            'PERFIL_PROVIDER=mock foi solicitado mas NODE_ENV=production. ' +
              'O mock foi ignorado e ShellPerfilProvider será usado.',
            'PerfilModule',
          );
          return new ShellPerfilProvider();
        }

        if (isMock) {
          return new MockPerfilProvider(config.nodeEnv);
        }

        return new ShellPerfilProvider();
      },
      inject: [APP_CONFIG],
    },
  ],
  exports: [PERFIL_PROVIDER],
})
export class PerfilModule {}
