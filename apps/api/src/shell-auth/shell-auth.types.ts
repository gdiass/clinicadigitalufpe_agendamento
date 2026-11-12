export interface ShellUser {
  id: string;
  name: string;
  email: string;
  /**
   * Papel do usuário emitido pelo Shell.
   * USER e ADMIN são os papéis originais do sistema.
   * RECEPCAO e PROFISSIONAL são papéis específicos da Agenda, a serem emitidos pelo Shell
   * quando a DS-65 for implementada.
   * [VALIDAR com o time do Shell] Confirmar quando DS-65 estiver disponível.
   */
  role: 'USER' | 'ADMIN' | 'RECEPCAO' | 'PROFISSIONAL';
}