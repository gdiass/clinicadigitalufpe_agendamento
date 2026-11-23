import { Injectable } from '@nestjs/common';
import {
  CadastroProvider,
  Clinica,
  Paciente,
  Profissional,
  Servico,
} from './cadastro.provider';

const CLINICAS: Clinica[] = [
  { id: '00000000-0000-4000-a000-000000000001', nome: 'Clínica Digital UFPE' },
];

const SERVICOS: Servico[] = [
  { id: '00000000-0000-4000-a000-000000000002', nome: 'Fisioterapia' },
];

const PROFISSIONAIS: Profissional[] = [
  { id: '00000000-0000-4000-a000-000000000010', nome: 'Dra. Ana Lima' },
  { id: '00000000-0000-4000-a000-000000000011', nome: 'Dr. Rui Costa' },
];

const PACIENTES: Paciente[] = [
  {
    id: '00000000-0000-4000-a000-000000000020',
    nome: 'Carlos Souza Teste',
    dataNascimento: '1985-03-12',
    cns: '700000000000001',
  },
  {
    id: '00000000-0000-4000-a000-000000000021',
    nome: 'Luana Teste Silva',
    dataNascimento: '1992-07-25',
    cns: '700000000000002',
  },
  {
    id: '00000000-0000-4000-a000-000000000022',
    nome: 'Maria Teste Oliveira',
    dataNascimento: '1978-11-03',
    cns: '700000000000003',
  },
  
  {
    id: '00000000-0000-4000-a000-000000000023',
    nome: 'Maria Teste Oliveira',
    dataNascimento: '2001-02-18',
  },
];

// Tira acentos e maiúsculas, para "joao" encontrar "João".
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Injectable()
export class CadastroMockProvider implements CadastroProvider {
  async buscarPacientes(termo: string): Promise<Paciente[]> {
    const busca = normalizar(termo);
    if (busca === '') {
      return [];
    }
    return PACIENTES.filter((p) => normalizar(p.nome).includes(busca));
  }

  async obterPaciente(id: string): Promise<Paciente | null> {
    return PACIENTES.find((p) => p.id === id) ?? null;
  }

  async listarProfissionais(): Promise<Profissional[]> {
    return PROFISSIONAIS;
  }

  async obterProfissional(id: string): Promise<Profissional | null> {
    return PROFISSIONAIS.find((p) => p.id === id) ?? null;
  }

  async listarServicos(): Promise<Servico[]> {
    return SERVICOS;
  }

  async listarClinicas(): Promise<Clinica[]> {
    return CLINICAS;
  }
}