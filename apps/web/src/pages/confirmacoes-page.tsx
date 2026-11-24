import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import './confirmacoes-page.css';

interface ConfirmacaoPendente {
  id: string;
  paciente: string;
  consulta: string;
  servico: string;
  confianca: 'Alta' | 'Baixa';
}

const CONFIRMACOES_INICIAIS: ConfirmacaoPendente[] = [
  {
    id: 'maya',
    paciente: 'Maya Oliveira',
    consulta: 'quinta-feira, 1 de outubro de 2026, 08:00',
    servico: 'Fisioterapia',
    confianca: 'Alta',
  },
  {
    id: 'beatriz',
    paciente: 'Beatriz Nascimento Lima',
    consulta: 'quinta-feira, 1 de outubro de 2026, 09:30',
    servico: 'Nutrição',
    confianca: 'Baixa',
  },
];

export function ConfirmacoesPage() {
  const [confirmacoes, setConfirmacoes] = useState(CONFIRMACOES_INICIAIS);
  const [avisoDemonstracaoVisivel, setAvisoDemonstracaoVisivel] =
    useState(true);
  const [toast, setToast] = useState('');
  const [prioridadeVisivel, setPrioridadeVisivel] = useState(true);

  useEffect(() => {
    if (!avisoDemonstracaoVisivel) return;
    const temporizador = window.setTimeout(() => {
      setAvisoDemonstracaoVisivel(false);
    }, 10_000);
    return () => window.clearTimeout(temporizador);
  }, [avisoDemonstracaoVisivel]);

  useEffect(() => {
    if (!toast) return;
    const temporizador = window.setTimeout(() => {
      setToast('');
    }, 6_000);
    return () => window.clearTimeout(temporizador);
  }, [toast]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('mfe-schedules-confirmation-pending-count', {
        detail: { count: confirmacoes.length },
      }),
    );
  }, [confirmacoes.length]);

  function confirmarConsulta(id: string) {
    const confirmacao = confirmacoes.find((item) => item.id === id);
    setConfirmacoes((atuais) =>
      atuais.filter((item) => item.id !== id),
    );
    setToast(
      confirmacao
        ? `Consulta de ${confirmacao.paciente} confirmada.`
        : 'Consulta confirmada.',
    );
  }

  return (
    <div className="confirmacoes-page">
      {avisoDemonstracaoVisivel && (
        <div role="alert" className="confirmacoes-notice">
          <span aria-hidden="true">i</span>
          <span>
            Dados de demonstração carregados. Nenhuma informação é salva após
            recarregar.
          </span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setAvisoDemonstracaoVisivel(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <header className="confirmacoes-header">
        <p>Anti no-show</p>
        <h1>Confirmações pendentes</h1>
        <span>
          Priorize o contato manual sem impedir qualquer atendimento.
        </span>
      </header>

      {prioridadeVisivel &&
        confirmacoes.find((item) => item.paciente === 'Beatriz Nascimento Lima') && (
        <section className="confirmacoes-prioridade">
          <span aria-hidden="true">!</span>
          <div>
            <strong>Prioridade sugerida: confiança baixa</strong>
            <p>
              Beatriz Nascimento Lima. Confirme a consulta manualmente.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar lembrete"
            onClick={() => setPrioridadeVisivel(false)}
          >
            <X aria-hidden="true" />
          </button>
        </section>
      )}

      {confirmacoes.length > 0 ? (
        <section className="confirmacoes-lista" aria-label="Confirmações pendentes">
          <header className="confirmacoes-lista-cabecalho">
            <span>Paciente</span>
            <span>Consulta</span>
            <span>Confiança</span>
            <span>Ação</span>
          </header>

          <div className="confirmacoes-linhas">
            {confirmacoes.map((confirmacao) => (
              <article key={confirmacao.id} className="confirmacoes-linha">
                <strong className="confirmacoes-paciente">
                  {confirmacao.paciente}
                </strong>
                <div className="confirmacoes-consulta">
                  <strong>{confirmacao.consulta}</strong>
                  <span>{confirmacao.servico}</span>
                </div>
                <div className="confirmacoes-confianca">
                  <span
                    className={
                      confirmacao.confianca === 'Alta'
                        ? 'confianca-alta'
                        : 'confianca-baixa'
                    }
                  >
                    {confirmacao.confianca}
                  </span>
                </div>
                <div className="confirmacoes-acao">
                  <button
                    type="button"
                    onClick={() => confirmarConsulta(confirmacao.id)}
                  >
                    Registrar “Sim”
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="confirmacoes-vazio" role="status">
          Todas as confirmações pendentes foram registradas.
        </section>
      )}

      {toast && (
        <div role="status" className="confirmacoes-toast">
          <CheckCircle2 aria-hidden="true" />
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Fechar confirmação"
            onClick={() => setToast('')}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
