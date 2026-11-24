import { useEffect, useState } from 'react';
import { Mail, X } from 'lucide-react';
import './emails-page.css';

interface EmailSimulado {
  id: string;
  paciente: string;
  texto: string;
  consulta: string;
}

const EMAILS_INICIAIS: EmailSimulado[] = [
  {
    id: 'maya',
    paciente: 'Maya Oliveira',
    texto:
      'Para Maya Oliveira: confirme sua consulta de Fisioterapia em quinta-feira, 1 de outubro, 08:00.',
    consulta: 'Fisioterapia · quinta-feira, 1 de outubro · 08:00',
  },
  {
    id: 'beatriz',
    paciente: 'Beatriz Nascimento Lima',
    texto:
      'Para Beatriz Nascimento Lima: confirme sua consulta de Nutrição em quinta-feira, 1 de outubro, 09:30.',
    consulta: 'Nutrição · quinta-feira, 1 de outubro · 09:30',
  },
];

export function EmailsPage() {
  const [avisoDemonstracaoVisivel, setAvisoDemonstracaoVisivel] =
    useState(true);
  const [emails] = useState(EMAILS_INICIAIS);

  useEffect(() => {
    if (!avisoDemonstracaoVisivel) return;
    const temporizador = window.setTimeout(() => {
      setAvisoDemonstracaoVisivel(false);
    }, 10_000);
    return () => window.clearTimeout(temporizador);
  }, [avisoDemonstracaoVisivel]);

  return (
    <div className="emails-page">
      {avisoDemonstracaoVisivel && (
        <div role="alert" className="emails-notice">
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

      <header className="emails-header">
        <p>Simulação</p>
        <h1>E-mails enviados</h1>
        <span>Nenhum e-mail real é enviado neste protótipo.</span>
      </header>

      <section className="emails-lista" aria-label="E-mails simulados enviados">
        {emails.map((email) => (
          <article key={email.id} className="emails-item">
            <div className="emails-icon">
              <Mail aria-hidden="true" />
            </div>
            <div className="emails-conteudo">
              <h2>E-mail simulado enviado</h2>
              <p>{email.texto}</p>
              <span>{email.consulta}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
