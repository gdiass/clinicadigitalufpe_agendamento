import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_PROF_ANA_UUID, MockPerfilProvider } from './mock-perfil.provider';
import { ShellPerfilProvider } from './shell-perfil.provider';

// ─── Usuários de mock ─────────────────────────────────────────────────────────

const userBase = { id: 'user-1', name: 'Ada', email: 'ada@example.com' } as const;

const userUser = { ...userBase, role: 'USER' as const };
const userAdmin = { ...userBase, role: 'ADMIN' as const };
const userRecepcao = { ...userBase, role: 'RECEPCAO' as const };
const userProfissional = { ...userBase, role: 'PROFISSIONAL' as const };

// ─── MockPerfilProvider ───────────────────────────────────────────────────────

describe('MockPerfilProvider', () => {
  describe('em desenvolvimento', () => {
    let provider: MockPerfilProvider;

    beforeEach(() => {
      provider = new MockPerfilProvider('development');
    });

    it('retorna RECEPCAO quando não há cabeçalho', () => {
      expect(provider.obterPerfil(userUser)).toEqual({ perfil: 'RECEPCAO' });
    });

    it('retorna RECEPCAO quando o cabeçalho está ausente no ctx', () => {
      expect(provider.obterPerfil(userUser, {})).toEqual({ perfil: 'RECEPCAO' });
    });

    it('retorna RECEPCAO com X-Dev-Perfil=RECEPCAO', () => {
      expect(provider.obterPerfil(userUser, { devPerfil: 'RECEPCAO' })).toEqual({ perfil: 'RECEPCAO' });
    });

    it('retorna PROFISSIONAL com UUID da Dra. Ana Lima quando X-Dev-Perfil=PROFISSIONAL', () => {
      const result = provider.obterPerfil(userUser, { devPerfil: 'PROFISSIONAL' });
      expect(result).toEqual({
        perfil: 'PROFISSIONAL',
        profissionalId: MOCK_PROF_ANA_UUID,
      });
    });

    it('aceita o cabeçalho em letras minúsculas (case-insensitive)', () => {
      expect(provider.obterPerfil(userUser, { devPerfil: 'profissional' })).toEqual({
        perfil: 'PROFISSIONAL',
        profissionalId: MOCK_PROF_ANA_UUID,
      });
    });

    it('aceita o cabeçalho com espaços ao redor (trim)', () => {
      expect(provider.obterPerfil(userUser, { devPerfil: '  Profissional  ' })).toEqual({
        perfil: 'PROFISSIONAL',
        profissionalId: MOCK_PROF_ANA_UUID,
      });
    });

    it('retorna RECEPCAO com valor inválido no cabeçalho', () => {
      expect(provider.obterPerfil(userUser, { devPerfil: 'INVALIDO' })).toEqual({ perfil: 'RECEPCAO' });
    });

    it('retorna RECEPCAO com cabeçalho vazio', () => {
      expect(provider.obterPerfil(userUser, { devPerfil: '' })).toEqual({ perfil: 'RECEPCAO' });
    });
  });

  describe('em produção', () => {
    let provider: MockPerfilProvider;

    beforeEach(() => {
      provider = new MockPerfilProvider('production');
    });

    it('lança ForbiddenException ao tentar obter perfil em produção', () => {
      expect(() => provider.obterPerfil(userUser, { devPerfil: 'PROFISSIONAL' })).toThrow(
        ForbiddenException,
      );
      expect(() => provider.obterPerfil(userAdmin, { devPerfil: 'RECEPCAO' })).toThrow(
        ForbiddenException,
      );
      expect(() => provider.obterPerfil(userAdmin, {})).toThrow(ForbiddenException);
    });
  });

  describe('em test', () => {
    it('funciona como development e respeita o cabeçalho', () => {
      const provider = new MockPerfilProvider('test');
      expect(provider.obterPerfil(userUser, { devPerfil: 'PROFISSIONAL' })).toEqual({
        perfil: 'PROFISSIONAL',
        profissionalId: MOCK_PROF_ANA_UUID,
      });
    });
  });
});

// ─── ShellPerfilProvider ──────────────────────────────────────────────────────

describe('ShellPerfilProvider', () => {
  let provider: ShellPerfilProvider;

  beforeEach(() => {
    provider = new ShellPerfilProvider();
  });

  it('mapeia role RECEPCAO para perfil RECEPCAO', () => {
    expect(provider.obterPerfil(userRecepcao)).toEqual({ perfil: 'RECEPCAO' });
  });

  it('mapeia role PROFISSIONAL para perfil PROFISSIONAL (sem profissionalId por ora)', () => {
    const result = provider.obterPerfil(userProfissional);
    expect(result.perfil).toBe('PROFISSIONAL');
    // [VALIDAR] profissionalId será preenchido pela integração com DS-63 (Cadastro).
    expect(result.profissionalId).toBeUndefined();
  });

  it('lança ForbiddenException para role USER', () => {
    expect(() => provider.obterPerfil(userUser)).toThrow(ForbiddenException);
  });

  it('lança ForbiddenException para role ADMIN', () => {
    expect(() => provider.obterPerfil(userAdmin)).toThrow(ForbiddenException);
  });

  it('a mensagem da ForbiddenException menciona o papel e a DS-65', () => {
    expect(() => provider.obterPerfil(userUser)).toThrow(/USER/);
    expect(() => provider.obterPerfil(userUser)).toThrow(/DS-65/);
  });
});

// ─── Seleção de provider pela factory do PerfilModule ─────────────────────────

describe('Seleção de provider pela factory do PerfilModule', () => {
  /**
   * Replica a lógica da factory do perfil.module.ts sem depender de NestJS,
   * para verificar os casos de mock/shell/mock+production.
   */
  function criarProvider(config: { perfilProvider: 'mock' | 'shell'; nodeEnv: string }) {
    const isMock = config.perfilProvider === 'mock';
    const isProd = config.nodeEnv === 'production';
    if (isMock && isProd) {
      return new ShellPerfilProvider();
    }
    if (isMock) {
      return new MockPerfilProvider(config.nodeEnv);
    }
    return new ShellPerfilProvider();
  }

  it('usa MockPerfilProvider quando perfilProvider=mock e nodeEnv=development', () => {
    const provider = criarProvider({ perfilProvider: 'mock', nodeEnv: 'development' });
    expect(provider).toBeInstanceOf(MockPerfilProvider);
  });

  it('usa ShellPerfilProvider quando perfilProvider=shell', () => {
    const provider = criarProvider({ perfilProvider: 'shell', nodeEnv: 'development' });
    expect(provider).toBeInstanceOf(ShellPerfilProvider);
  });

  it('usa ShellPerfilProvider quando perfilProvider=mock mas nodeEnv=production (mock ignorado)', () => {
    const provider = criarProvider({ perfilProvider: 'mock', nodeEnv: 'production' });
    expect(provider).toBeInstanceOf(ShellPerfilProvider);
  });

  it('usa ShellPerfilProvider quando perfilProvider=shell e nodeEnv=production', () => {
    const provider = criarProvider({ perfilProvider: 'shell', nodeEnv: 'production' });
    expect(provider).toBeInstanceOf(ShellPerfilProvider);
  });
});

// ─── PerfilController ─────────────────────────────────────────────────────────

describe('PerfilController (unitário)', () => {
  /**
   * Testa o controller diretamente, sem subir o módulo NestJS completo.
   */
  it('retorna PerfilDto com os dados do provider', async () => {
    // Importação dinâmica para evitar dependência de ciclo em testes
    const { PerfilController } = await import('./perfil.controller');

    const mockProvider: { obterPerfil: ReturnType<typeof vi.fn> } = {
      obterPerfil: vi.fn().mockResolvedValue({ perfil: 'RECEPCAO' }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new PerfilController(mockProvider as any);
    const user = userUser;

    const result = await controller.me(user, 'RECEPCAO');

    expect(result.perfil).toBe('RECEPCAO');
    expect(result.profissionalId).toBeUndefined();
    expect(mockProvider.obterPerfil).toHaveBeenCalledWith(user, { devPerfil: 'RECEPCAO' });
  });

  it('repassa profissionalId quando o provider retorna PROFISSIONAL', async () => {
    const { PerfilController } = await import('./perfil.controller');

    const mockProvider = {
      obterPerfil: vi.fn().mockResolvedValue({
        perfil: 'PROFISSIONAL',
        profissionalId: MOCK_PROF_ANA_UUID,
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const controller = new PerfilController(mockProvider as any);

    const result = await controller.me(userUser, 'PROFISSIONAL');

    expect(result.perfil).toBe('PROFISSIONAL');
    expect(result.profissionalId).toBe(MOCK_PROF_ANA_UUID);
  });
});

// vi necessário para o último bloco
import { vi } from 'vitest';
