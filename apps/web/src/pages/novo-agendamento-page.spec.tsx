import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NovoAgendamentoPage } from './novo-agendamento-page';

vi.mock('@/lib/api-client', () => ({
  agendaControllerObter: vi.fn().mockResolvedValue({
    status: 200,
    data: {
      data: '2026-11-24',
      temDisponibilidade: true,
      horarios: [],
    },
  }),
  cadastroControllerListarProfissionais: vi.fn().mockResolvedValue({
    status: 200,
    data: [
      { id: 'prof-camila', nome: 'Dra. Camila Andrade Rocha' },
      { id: 'prof-rafael', nome: 'Dr. Rafael Nutrição' },
    ],
  }),
  cadastroControllerListarServicos: vi.fn().mockResolvedValue({
    status: 200,
    data: [
      { id: 'service-fisio', nome: 'Fisioterapia' },
      { id: 'service-nutri', nome: 'Nutrição' },
    ],
  }),
}));

describe('NovoAgendamentoPage', () => {
  it('renderiza a página e permite selecionar um horário', async () => {
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
        <MemoryRouter initialEntries={['/schedules/new']}>
          <NovoAgendamentoPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('heading', { name: 'Novo agendamento' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1. Dados da consulta')).toBeInTheDocument();
    expect(screen.getByText('2. Escolha o horário')).toBeInTheDocument();

    const horario = await screen.findByRole('button', { name: /09:00/ });
    fireEvent.click(horario);

    expect(horario).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Confirmar agendamento' }),
    ).not.toBeDisabled();
  });

  it('abre o cadastro rápido e cadastra um paciente local', () => {
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
        <MemoryRouter initialEntries={['/schedules/new']}>
          <NovoAgendamentoPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cadastro rápido' }));
    expect(screen.getByRole('dialog', { name: 'Cadastro rápido' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Joana Pereira' },
    });
    fireEvent.change(screen.getByLabelText('CNS'), {
      target: { value: '700000000000010' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));

    expect(screen.queryByRole('dialog', { name: 'Cadastro rápido' })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Joana Pereira')).toBeInTheDocument();
  });
});
