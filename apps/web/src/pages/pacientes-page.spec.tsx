import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PacientesPage } from './pacientes-page';

describe('PacientesPage', () => {
  it('renderiza pacientes e abre o cadastro rápido', () => {
    render(
      <MemoryRouter>
        <PacientesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Pacientes' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Maya Oliveira')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));
    expect(
      screen.getByRole('dialog', { name: 'Cadastro rápido de paciente' }),
    ).toBeInTheDocument();
  });

  it('exige nome civil, nascimento e telefone e salva o paciente', () => {
    render(
      <MemoryRouter>
        <PacientesPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar paciente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar paciente' }));
    expect(screen.getByText('Informe o nome civil.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome civil'), {
      target: { value: 'Joana Pereira' },
    });
    fireEvent.change(screen.getByLabelText('Data de nascimento'), {
      target: { value: '1990-05-12' },
    });
    fireEvent.change(screen.getByLabelText('Telefone'), {
      target: { value: '(81) 99999-0000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar paciente' }));

    expect(
      screen.queryByRole('dialog', { name: 'Cadastro rápido de paciente' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Joana Pereira')).toBeInTheDocument();
  });

  it('fecha o aviso de demonstração manualmente', () => {
    render(
      <MemoryRouter>
        <PacientesPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Dados de demonstração carregados/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    expect(screen.queryByText(/Dados de demonstração carregados/i)).not.toBeInTheDocument();
  });
});
