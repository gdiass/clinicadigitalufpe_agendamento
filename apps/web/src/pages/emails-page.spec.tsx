import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { EmailsPage } from './emails-page';

describe('EmailsPage', () => {
  it('renderiza os e-mails simulados', () => {
    render(
      <MemoryRouter>
        <EmailsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'E-mails enviados' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('E-mail simulado enviado')).toHaveLength(2);
    expect(screen.getByText(/Maya Oliveira/i)).toBeInTheDocument();
    expect(screen.getByText(/Beatriz Nascimento Lima/i)).toBeInTheDocument();
  });

  it('fecha o aviso de demonstração manualmente', () => {
    render(
      <MemoryRouter>
        <EmailsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Dados de demonstração carregados/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(
      screen.queryByText(/Dados de demonstração carregados/i),
    ).not.toBeInTheDocument();
  });
});
