import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmacoesPage } from './confirmacoes-page';

describe('ConfirmacoesPage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('remove uma confirmação e mostra toast de sucesso', () => {
    const eventos = vi.spyOn(window, 'dispatchEvent');
    render(
      <MemoryRouter>
        <ConfirmacoesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Maya Oliveira')).toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Registrar “Sim”' })[0],
    );

    expect(screen.queryByText('Maya Oliveira')).not.toBeInTheDocument();
    expect(eventos).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mfe-schedules-confirmation-pending-count',
      }),
    );
    expect(
      screen.getByRole('status', { name: '' }),
    ).toHaveTextContent('Consulta de Maya Oliveira confirmada.');
  });

  it('remove o toast após seis segundos', () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <ConfirmacoesPage />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Registrar “Sim”' })[0],
    );

    expect(screen.getByText('Consulta de Maya Oliveira confirmada.')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(6_000);
    });
    expect(
      screen.queryByText('Consulta de Maya Oliveira confirmada.'),
    ).not.toBeInTheDocument();
  });

  it('fecha o aviso de demonstração manualmente', () => {
    render(
      <MemoryRouter>
        <ConfirmacoesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Dados de demonstração carregados/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText(/Dados de demonstração carregados/i)).not.toBeInTheDocument();
  });

  it('fecha o lembrete de prioridade manualmente', () => {
    render(
      <MemoryRouter>
        <ConfirmacoesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Prioridade sugerida: confiança baixa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar lembrete' }));
    expect(screen.queryByText('Prioridade sugerida: confiança baixa')).not.toBeInTheDocument();
  });
});
