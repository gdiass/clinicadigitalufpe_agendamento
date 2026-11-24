import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgendaPage } from './agenda-page';

vi.mock('@/hooks/use-perfil', () => ({
  usePerfil: () => ({
    perfil: 'RECEPCAO',
    profissionalId: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/api-client', () => ({
  agendaControllerObter: vi.fn().mockResolvedValue({
    status: 200,
    data: {
      data: '2026-11-23',
      temDisponibilidade: true,
      horarios: [
        {
          inicio: '2026-11-23T11:00:00.000Z',
          fim: '2026-11-23T11:30:00.000Z',
          profissional: { id: 'prof-1' },
          servico: { id: 'service-1' },
          clinica: { id: 'clinic-1' },
          modalidade: 'PRESENCIAL',
          slotId: 'slot-1',
          agendamento: {
            id: 'appointment-1',
            status: 'AGENDADO',
            paciente: { id: '00000000-0000-4000-a000-000000000020' },
            tipoAtendimento: 'CONSULTA',
          },
        },
        {
          inicio: '2026-11-23T12:00:00.000Z',
          fim: '2026-11-23T12:30:00.000Z',
          profissional: { id: 'prof-1' },
          servico: { id: 'service-1' },
          clinica: { id: 'clinic-1' },
          modalidade: 'PRESENCIAL',
          slotId: 'slot-2',
          agendamento: null,
        },
      ],
    },
  }),
  cadastroControllerListarProfissionais: vi.fn().mockResolvedValue({
    status: 200,
    data: [{ id: 'prof-1', nome: 'Dra. Camila Andrade Rocha' }],
  }),
  cadastroControllerListarServicos: vi.fn().mockResolvedValue({
    status: 200,
    data: [{ id: 'service-1', nome: 'Fisioterapia' }],
  }),
  agendamentosControllerObter: vi.fn().mockResolvedValue({
    status: 200,
  }),
}));

describe('AgendaPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fecha o aviso de demonstração manualmente e automaticamente após dez segundos', () => {
    vi.useFakeTimers();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Dados de demonstração carregados/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText(/Dados de demonstração carregados/i)).not.toBeInTheDocument();

    unmount();

    vi.useFakeTimers();
    render(
      <QueryClientProvider
        client={new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
              gcTime: 0,
            },
          },
        })}
      >
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Dados de demonstração carregados/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.queryByText(/Dados de demonstração carregados/i)).not.toBeInTheDocument();
  });

  it('mostra a grade da agenda e permite confirmar um agendamento', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Agenda de atendimentos' })).toBeInTheDocument();
    expect(await screen.findByText('Carlos Souza Teste')).toBeInTheDocument();
    expect(screen.getByText('Disponível para agendamento')).toBeInTheDocument();
    expect(screen.getAllByText('Dra. Camila Andrade Rocha').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pelo paciente' }));
    expect(screen.getByText('✓ Confirmada')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Agendamento confirmado pelo paciente.');
  });

  it('abre o modal de novo encaixe e exige o motivo antes de confirmar', () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: showPicker,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fazer encaixe' }));
    expect(screen.getByRole('dialog', { name: 'Novo encaixe' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Larissa Fernandes')).toBeInTheDocument();
    expect(screen.getByLabelText('Data do encaixe')).toHaveAttribute('type', 'date');

    fireEvent.click(screen.getByLabelText('Data do encaixe'));
    expect(showPicker).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('Horário do encaixe'), {
      target: { value: '14:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar encaixe' }));
    expect(screen.getByText('Preencha todos os campos obrigatórios.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Motivo do encaixe'), {
      target: { value: 'Paciente chegou fora do horário habitual.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar encaixe' }));
    expect(screen.queryByRole('dialog', { name: 'Novo encaixe' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Encaixe confirmado.');
  });

  it('abre o modal de cancelamento e exige descrição apenas para Outro', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgendaPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const botoesCancelar = await screen.findAllByRole('button', { name: 'Cancelar' });
    fireEvent.click(botoesCancelar[0]);
    expect(screen.getByRole('dialog', { name: 'Cancelar consulta?' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), {
      target: { value: 'Outro' },
    });
    expect(screen.getByLabelText('Descreva o motivo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(screen.getByText('Descreva o motivo do cancelamento.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Descreva o motivo'), {
      target: { value: 'Paciente mudou o plano de viagem.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));

    expect(screen.queryByRole('dialog', { name: 'Cancelar consulta?' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Agendamento cancelado.');
  });
});
