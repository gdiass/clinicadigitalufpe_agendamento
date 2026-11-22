import { Module } from '@nestjs/common';
import { CadastroHttpProvider } from './cadastro.http';
import { CadastroMockProvider } from './cadastro.mock';
import { CADASTRO_PROVIDER_TOKEN } from './cadastro.provider';

@Module({
  providers: [
    {
      provide: CADASTRO_PROVIDER_TOKEN,
      useFactory: () => {
        const modo = process.env.CADASTRO_PROVIDER ?? 'mock';
        if (modo === 'mock') {
          return new CadastroMockProvider();
        }
        if (modo === 'http') {
          return new CadastroHttpProvider();
        }
        throw new Error(
          `CADASTRO_PROVIDER inválido: "${modo}". Use "mock" ou "http".`,
        );
      },
    },
  ],
  exports: [CADASTRO_PROVIDER_TOKEN],
})
export class CadastroModule {}