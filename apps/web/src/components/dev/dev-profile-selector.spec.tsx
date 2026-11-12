import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DevProfileSelector } from './dev-profile-selector';

describe('DevProfileSelector', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined as never);
    window.localStorage.clear();
  });

  it('renderiza o seletor em ambiente de desenvolvimento com botões Recepção e Profissional', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DevProfileSelector />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Dev Mode')).toBeInTheDocument();
    expect(screen.getByTestId('dev-select-recepcao')).toBeInTheDocument();
    expect(screen.getByTestId('dev-select-profissional')).toBeInTheDocument();
  });

  it('grava em localStorage e invalida queries ao selecionar Profissional', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DevProfileSelector />
      </QueryClientProvider>,
    );

    const btnProf = screen.getByTestId('dev-select-profissional');
    fireEvent.click(btnProf);

    expect(window.localStorage.getItem('dev_perfil')).toBe('PROFISSIONAL');
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  it('grava em localStorage e invalida queries ao selecionar Recepção', async () => {
    window.localStorage.setItem('dev_perfil', 'PROFISSIONAL');

    render(
      <QueryClientProvider client={queryClient}>
        <DevProfileSelector />
      </QueryClientProvider>,
    );

    const btnRec = screen.getByTestId('dev-select-recepcao');
    fireEvent.click(btnRec);

    expect(window.localStorage.getItem('dev_perfil')).toBe('RECEPCAO');
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });
});
