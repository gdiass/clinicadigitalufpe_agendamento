import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { ShellAuthGuard } from '../src/shell-auth/shell-auth.guard';
import type { ShellUser } from '../src/shell-auth/shell-auth.types';

/** Usuário fictício que o Shell "devolveria" nos testes e2e. */
export const USUARIO_E2E: ShellUser = {
  id: '00000000-0000-4000-a000-000000000040',
  name: 'Joana Teste',
  email: 'joana.teste@example.com',
  role: 'USER',
};

/**
 * Sobe a API inteira (AppModule + mesma configuração do main.ts) contra o banco
 * de DATABASE_URL. Só o ShellAuthGuard é trocado, porque o Shell não roda nos
 * testes: todo request entra autenticado como USUARIO_E2E.
 */
export async function criarAppE2E(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ShellAuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest().shellUser = USUARIO_E2E;
        return true;
      },
    })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return app;
}
