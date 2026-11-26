import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import './pacientes-page.css';

type Confianca = 'Alta' | 'Média' | 'Baixa';

interface PacienteCard {
  id: string;
  nome: string;
  nomeCivil?: string;
  remarcacoes: number;
  cancelamentos: number;
  faltas: number;
  confianca: Confianca;
}

const PACIENTES_INICIAIS: PacienteCard[] = [
  {
    id: 'maya',
    nome: 'Maya Oliveira',
    nomeCivil: 'Marina de Souza Oliveira',
    remarcacoes: 0,
    cancelamentos: 0,
    faltas: 0,
    confianca: 'Alta',
  },
  {
    id: 'jose',
    nome: 'José Carlos Ribeiro',
    remarcacoes: 1,
    cancelamentos: 2,
    faltas: 2,
    confianca: 'Baixa',
  },
  {
    id: 'ana',
    nome: 'Ana Paula Mendes',
    remarcacoes: 1,
    cancelamentos: 0,
    faltas: 0,
    confianca: 'Alta',
  },
  {
    id: 'lucas',
    nome: 'Lucas Gabriel Santos',
    remarcacoes: 0,
    cancelamentos: 0,
    faltas: 0,
    confianca: 'Alta',
  },
  {
    id: 'beatriz',
    nome: 'Beatriz Nascimento Lima',
    remarcacoes: 3,
    cancelamentos: 1,
    faltas: 1,
    confianca: 'Baixa',
  },
  {
    id: 'roberto',
    nome: 'Roberto Alves Costa',
    remarcacoes: 0,
    cancelamentos: 1,
    faltas: 0,
    confianca: 'Alta',
  },
  {
    id: 'larissa',
    nome: 'Larissa Fernandes',
    remarcacoes: 0,
    cancelamentos: 0,
    faltas: 0,
    confianca: 'Alta',
  },
  {
    id: 'francisco',
    nome: 'Francisco das Chagas Souza',
    remarcacoes: 2,
    cancelamentos: 0,
    faltas: 1,
    confianca: 'Média',
  },
];

function abrirCalendario(input: HTMLInputElement) {
  const calendario = input as HTMLInputElement & { showPicker?: () => void };
  try {
    calendario.showPicker?.();
  } catch {
    input.focus();
  }
}

export function PacientesPage() {
  const [pacientes, setPacientes] = useState(PACIENTES_INICIAIS);
  const [avisoDemonstracaoVisivel, setAvisoDemonstracaoVisivel] =
    useState(true);
  const [toast, setToast] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [nomeCivil, setNomeCivil] = useState('');
  const [nomeSocial, setNomeSocial] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');

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
    if (!modalAberto) return;
    const fecharPorEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalAberto(false);
    };
    window.addEventListener('keydown', fecharPorEscape);
    return () => window.removeEventListener('keydown', fecharPorEscape);
  }, [modalAberto]);

  function abrirModal() {
    setNomeCivil('');
    setNomeSocial('');
    setDataNascimento('');
    setTelefone('');
    setEmail('');
    setErro('');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setErro('');
  }

  function salvarPaciente() {
    if (!nomeCivil.trim()) {
      setErro('Informe o nome civil.');
      return;
    }
    if (!dataNascimento) {
      setErro('Informe a data de nascimento.');
      return;
    }
    if (!telefone.trim()) {
      setErro('Informe o telefone.');
      return;
    }

    const novoPaciente: PacienteCard = {
      id: `paciente-${Date.now()}`,
      nome: nomeSocial.trim() || nomeCivil.trim(),
      nomeCivil: nomeCivil.trim(),
      remarcacoes: 0,
      cancelamentos: 0,
      faltas: 0,
      confianca: 'Alta',
    };

    setPacientes((atuais) => [novoPaciente, ...atuais]);
    setModalAberto(false);
    setToast(`Paciente ${novoPaciente.nome} cadastrado.`);
  }

  function nivelConfianca(paciente: PacienteCard) {
    if (paciente.confianca === 'Alta') {
      return 'confianca-alta';
    }
    if (paciente.confianca === 'Baixa') {
      return 'confianca-baixa';
    }
    return 'confianca-media';
  }

  return (
    <div className="pacientes-page">
      {avisoDemonstracaoVisivel && (
        <div role="alert" className="pacientes-notice">
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

      <header className="pacientes-header">
        <div>
          <p>Régua de confiança</p>
          <h1>Pacientes</h1>
          <span>
            O indicador serve para apoiar a confirmação, não para impedir
            qualquer atendimento.
          </span>
        </div>
        <button type="button" onClick={abrirModal}>
          <Plus aria-hidden="true" />
          Cadastrar paciente
        </button>
      </header>

      <section className="pacientes-grid" aria-label="Lista de pacientes">
        {pacientes.map((paciente) => (
          <article key={paciente.id} className="paciente-card">
            <header>
              <h2>{paciente.nome}</h2>
              <span className={nivelConfianca(paciente)}>
                Confiança {paciente.confianca.toLowerCase()}
              </span>
            </header>

            {paciente.nomeCivil && (
              <p className="paciente-nome-civil">
                Nome civil (dados cadastrais): {paciente.nomeCivil}
              </p>
            )}

            <div className="paciente-metricas">
              <div>
                <span>Remarcações</span>
                <strong>{paciente.remarcacoes}</strong>
              </div>
              <div>
                <span>Cancelamentos</span>
                <strong>{paciente.cancelamentos}</strong>
              </div>
              <div>
                <span>Faltas</span>
                <strong>{paciente.faltas}</strong>
              </div>
            </div>

            <p className="paciente-calculo">
              Cálculo: faltas × 3 + cancelamentos × 2 + remarcações. 0–2 alta,
              3–5 média, 6 ou mais baixa.
            </p>
          </article>
        ))}
      </section>

      {modalAberto && (
        <div
          className="pacientes-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cadastro-paciente"
            className="pacientes-modal"
          >
            <header>
              <h2 id="titulo-cadastro-paciente">
                Cadastro rápido de paciente
              </h2>
              <button
                type="button"
                aria-label="Fechar cadastro"
                onClick={fecharModal}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <p className="pacientes-modal-aviso">
              O nome social será exibido por padrão em agendas, mensagens e
              e-mails.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                salvarPaciente();
              }}
            >
              <label className="pacientes-modal-field">
                <span>
                  Nome civil <em>(obrigatório)</em>
                </span>
                <input
                  aria-label="Nome civil"
                  value={nomeCivil}
                  onChange={(event) => {
                    setNomeCivil(event.target.value);
                    setErro('');
                  }}
                />
              </label>

              <label className="pacientes-modal-field">
                <span>
                  Nome social <small>(opcional)</small>
                </span>
                <input
                  aria-label="Nome social"
                  value={nomeSocial}
                  onChange={(event) => setNomeSocial(event.target.value)}
                />
              </label>

              <div className="pacientes-modal-row">
                <label className="pacientes-modal-field">
                  <span>
                    Data de nascimento <em>(obrigatório)</em>
                  </span>
                  <input
                    aria-label="Data de nascimento"
                    type="date"
                    value={dataNascimento}
                    onChange={(event) => {
                      setDataNascimento(event.target.value);
                      setErro('');
                    }}
                    onClick={(event) => abrirCalendario(event.currentTarget)}
                  />
                </label>

                <label className="pacientes-modal-field">
                  <span>
                    Telefone <em>(obrigatório)</em>
                  </span>
                  <input
                    aria-label="Telefone"
                    value={telefone}
                    onChange={(event) => {
                      setTelefone(event.target.value);
                      setErro('');
                    }}
                  />
                </label>
              </div>

              <label className="pacientes-modal-field">
                <span>
                  E-mail <small>(opcional)</small>
                </span>
                <input
                  aria-label="E-mail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              {erro && (
                <p className="pacientes-modal-error" role="alert">
                  {erro}
                </p>
              )}

              <footer>
                <button
                  type="button"
                  className="pacientes-modal-cancelar"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="pacientes-modal-salvar">
                  Salvar paciente
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {toast && (
        <div role="status" className="pacientes-toast">
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
