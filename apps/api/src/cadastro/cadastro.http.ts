import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  CadastroProvider,
  Clinica,
  Paciente,
  Profissional,
  Servico,
} from './cadastro.provider';

@Injectable()
export class CadastroHttpProvider implements CadastroProvider {
  private naoImplementado(): never {
    const url = process.env.CADASTRO_API_URL ?? 'não definida';
    throw new NotImplementedException(
      `Integração HTTP com o Cadastro ainda não implementada (CADASTRO_API_URL: ${url}).`,
    );
  }

  buscarPacientes(_termo: string): Promise<Paciente[]> {
    return this.naoImplementado();
  }

  obterPaciente(_id: string): Promise<Paciente | null> {
    return this.naoImplementado();
  }

  listarProfissionais(): Promise<Profissional[]> {
    return this.naoImplementado();
  }

  obterProfissional(_id: string): Promise<Profissional | null> {
    return this.naoImplementado();
  }

  listarServicos(): Promise<Servico[]> {
    return this.naoImplementado();
  }

  listarClinicas(): Promise<Clinica[]> {
    return this.naoImplementado();
  }
}