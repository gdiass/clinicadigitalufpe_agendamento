import { beforeEach, describe, expect, it } from 'vitest';
import { CadastroMockProvider } from './cadastro.mock';

const CLINICA_ID = '00000000-0000-4000-a000-000000000001';
const SERVICO_ID = '00000000-0000-4000-a000-000000000002';
const PROF_ANA_ID = '00000000-0000-4000-a000-000000000010';
const PROF_RUI_ID = '00000000-0000-4000-a000-000000000011';
const PAC_CARLOS_ID = '00000000-0000-4000-a000-000000000020';
const PAC_LUANA_ID = '00000000-0000-4000-a000-000000000021';
const PAC_MARIA_ID = '00000000-0000-4000-a000-000000000022';
const PAC_MARIA_HOMONIMA_ID = '00000000-0000-4000-a000-000000000023';

describe('CadastroMockProvider', () => {
  let provider: CadastroMockProvider;

  beforeEach(() => {
    provider = new CadastroMockProvider();
  });

  describe('buscarPacientes', () => {
    it('encontra paciente por parte do nome', async () => {
      const resultado = await provider.buscarPacientes('carl');
      expect(resultado.map((p) => p.id)).toEqual([PAC_CARLOS_ID]);
    });

    it('encontra pelo sobrenome', async () => {
      const resultado = await provider.buscarPacientes('silva');
      expect(resultado.map((p) => p.id)).toEqual([PAC_LUANA_ID]);
    });

    it('ignora maiúsculas, minúsculas e espaços nas pontas', async () => {
      const resultado = await provider.buscarPacientes('  LUANA ');
      expect(resultado.map((p) => p.id)).toEqual([PAC_LUANA_ID]);
    });

    it('devolve todos os pacientes que combinam com um termo comum', async () => {
      const resultado = await provider.buscarPacientes('teste');
      expect(resultado).toHaveLength(4);
    });

    it('devolve homônimos como pacientes separados, com ids diferentes', async () => {
      const resultado = await provider.buscarPacientes('maria teste oliveira');
      expect(resultado.map((p) => p.id)).toEqual([PAC_MARIA_ID, PAC_MARIA_HOMONIMA_ID]);
      expect(new Set(resultado.map((p) => p.nome)).size).toBe(1);
    });

    it('devolve lista vazia quando ninguém combina', async () => {
      expect(await provider.buscarPacientes('zzzz')).toEqual([]);
    });

    it('devolve lista vazia para termo vazio ou só com espaços', async () => {
      expect(await provider.buscarPacientes('')).toEqual([]);
      expect(await provider.buscarPacientes('   ')).toEqual([]);
    });
  });

  describe('obterPaciente', () => {
    it('devolve o paciente pelo id', async () => {
      const paciente = await provider.obterPaciente(PAC_CARLOS_ID);
      expect(paciente?.nome).toBe('Carlos Souza Teste');
    });

    it('devolve null quando o paciente não existe', async () => {
      const paciente = await provider.obterPaciente('00000000-0000-4000-a000-0000000000ff');
      expect(paciente).toBeNull();
    });
  });

  describe('profissionais, serviços e clínicas', () => {
    it('lista os dois profissionais do seed', async () => {
      const profissionais = await provider.listarProfissionais();
      expect(profissionais.map((p) => p.id)).toEqual([PROF_ANA_ID, PROF_RUI_ID]);
    });

    it('obtém um profissional pelo id e devolve null se não existir', async () => {
      expect((await provider.obterProfissional(PROF_ANA_ID))?.nome).toBe('Dra. Ana Lima');
      expect(await provider.obterProfissional('00000000-0000-4000-a000-0000000000ff')).toBeNull();
    });

    it('lista o serviço e a clínica com os ids do seed', async () => {
      const servicos = await provider.listarServicos();
      const clinicas = await provider.listarClinicas();
      expect(servicos.map((s) => s.id)).toEqual([SERVICO_ID]);
      expect(clinicas.map((c) => c.id)).toEqual([CLINICA_ID]);
    });
  });
});