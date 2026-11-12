import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './protected-route';

const mockUseAuth = vi.fn();
const mockUsePerfil = vi.fn();

vi.mock('../../context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../hooks/use-perfil', () => ({
  usePerfil: () => mockUsePerfil(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePerfil.mockReturnValue({
      perfil: 'RECEPCAO',
      profissionalId: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('renders loading state when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>Conteúdo Protegido</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Verificando sessão segura...')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo Protegido')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/login" element={<div>Tela de Login</div>} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div>Meu Perfil Protegido</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Tela de Login')).toBeInTheDocument();
    expect(screen.queryByText('Meu Perfil Protegido')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated without profile restrictions', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'usr_1', name: 'Ada', email: 'ada@example.com', role: 'USER' },
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <ProtectedRoute>
          <div>Meu Perfil Protegido</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Meu Perfil Protegido')).toBeInTheDocument();
  });

  it('blocks access when required role does not match', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'usr_1', name: 'Ada', email: 'ada@example.com', role: 'USER' },
    });

    render(
      <MemoryRouter initialEntries={['/users']}>
        <ProtectedRoute requiredRole="ADMIN">
          <div>Painel de Usuários</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(screen.queryByText('Painel de Usuários')).not.toBeInTheDocument();
  });

  it('bloqueia acesso e exibe banner quando o perfil não corresponde ao requiredPerfil', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'usr_1', name: 'Dr. Rui', email: 'rui@example.com', role: 'USER' },
    });
    mockUsePerfil.mockReturnValue({
      perfil: 'PROFISSIONAL',
      profissionalId: '00000000-0000-4000-a000-000000000011',
      isLoading: false,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={['/schedules/new']}>
        <ProtectedRoute requiredPerfil="RECEPCAO">
          <div>Tela de Novo Agendamento</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument();
    expect(
      screen.getByText(/Esta funcionalidade é exclusiva do perfil/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Recepção')).toBeInTheDocument();
    expect(screen.getByText('Profissional')).toBeInTheDocument();
    expect(screen.queryByText('Tela de Novo Agendamento')).not.toBeInTheDocument();
  });

  it('renderiza o conteúdo quando o perfil corresponde ao requiredPerfil', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'usr_1', name: 'Recepcionista', email: 'rec@example.com', role: 'USER' },
    });
    mockUsePerfil.mockReturnValue({
      perfil: 'RECEPCAO',
      isLoading: false,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={['/schedules/new']}>
        <ProtectedRoute requiredPerfil="RECEPCAO">
          <div>Tela de Novo Agendamento</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Tela de Novo Agendamento')).toBeInTheDocument();
  });

  it('aceita array de perfis permitidos', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'usr_1', name: 'Dra. Ana', email: 'ana@example.com', role: 'USER' },
    });
    mockUsePerfil.mockReturnValue({
      perfil: 'PROFISSIONAL',
      profissionalId: '00000000-0000-4000-a000-000000000010',
      isLoading: false,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={['/schedules/home']}>
        <ProtectedRoute requiredPerfil={['RECEPCAO', 'PROFISSIONAL']}>
          <div>Agenda Geral</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Agenda Geral')).toBeInTheDocument();
  });

  it('exibe loading enquanto o perfil está sendo carregado', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'usr_1', name: 'Ada', email: 'ada@example.com', role: 'USER' },
    });
    mockUsePerfil.mockReturnValue({
      perfil: undefined,
      isLoading: true,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={['/schedules/new']}>
        <ProtectedRoute requiredPerfil="RECEPCAO">
          <div>Conteúdo</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Verificando sessão segura...')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('bloqueia acesso e exibe erro amigável quando ocorre erro ao carregar o perfil', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'usr_1', name: 'Ada', email: 'ada@example.com', role: 'USER' },
    });
    mockUsePerfil.mockReturnValue({
      perfil: undefined,
      isLoading: false,
      isError: true,
    });

    render(
      <MemoryRouter initialEntries={['/schedules/new']}>
        <ProtectedRoute requiredPerfil="RECEPCAO">
          <div>Conteúdo</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Erro ao Carregar Perfil')).toBeInTheDocument();
    expect(
      screen.getByText(/Não foi possível identificar seu perfil na Agenda/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });

  it('ignora autenticação e perfil quando skipAuth for verdadeiro', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    });
    mockUsePerfil.mockReturnValue({
      perfil: undefined,
      isLoading: false,
      isError: false,
    });

    render(
      <MemoryRouter initialEntries={['/schedules/new']}>
        <ProtectedRoute skipAuth requiredPerfil="RECEPCAO">
          <div>Conteúdo Bypassado</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Conteúdo Bypassado')).toBeInTheDocument();
  });
});
