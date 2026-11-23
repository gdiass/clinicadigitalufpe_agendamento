export interface Clinica {
  id: string;
  nome: string;
}

export interface Profissional {
  id: string;
  nome: string;
}

export interface Servico {
  id: string;
  nome: string;
}

export interface Paciente {
  id: string;
  nome: string;
  dataNascimento: string; // AAAA-MM-DD [VALIDAR COM TIME 01]
  cns?: string; // Cartão Nacional de Saúde, opcional [VALIDAR COM TIME 01]
}

export interface CadastroProvider {
  buscarPacientes(termo: string): Promise<Paciente[]>;
  obterPaciente(id: string): Promise<Paciente | null>;
  listarProfissionais(): Promise<Profissional[]>;
  obterProfissional(id: string): Promise<Profissional | null>;
  listarServicos(): Promise<Servico[]>;
  listarClinicas(): Promise<Clinica[]>;
}

export const CADASTRO_PROVIDER_TOKEN = Symbol('CADASTRO_PROVIDER_TOKEN');