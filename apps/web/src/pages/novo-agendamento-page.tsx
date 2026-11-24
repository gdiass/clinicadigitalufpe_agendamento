import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import './novo-agendamento-page.css';

interface PacienteOpcao {
  id: string;
  nome: string;
  nascidoEm?: string;
  cns?: string;
}

interface ProfissionalOpcao {
  id: string;
  nome: string;
  servico: string;
  duracaoMinutos: number;
  grade: string[];
}

const PACIENTES_DEMO: PacienteOpcao[] = [
  { id: 'maya-oliveira', nome: 'Maya Oliveira' },
  { id: 'larissa-fernandes', nome: 'Larissa Fernandes' },
  { id: 'ana-paula-mendes', nome: 'Ana Paula Mendes' },
  { id: '00000000-0000-4000-a000-000000000020', nome: 'Carlos Souza Teste' },
  { id: '00000000-0000-4000-a000-000000000021', nome: 'Luana Teste Silva' },
  { id: '00000000-0000-4000-a000-000000000022', nome: 'Maria Teste Oliveira' },
];

const PROFISSIONAIS_DEMO: ProfissionalOpcao[] = [
  {
    id: 'demo-camila',
    nome: 'Dra. Camila',
    servico: 'Fisioterapia',
    duracaoMinutos: 60,
    grade: ['08:00', '09:00', '10:00', '11:00'],
  },
  {
    id: 'demo-rafael',
    nome: 'Dr. Rafael',
    servico: 'Nutrição',
    duracaoMinutos: 30,
    grade: [
      '08:00',
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
    ],
  },
];

const DATA_DEMO = '2026-10-02';

function formatarHora(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Recife',
  }).format(new Date(iso));
}

function abrirCalendario(input: HTMLInputElement) {
  const calendario = input as HTMLInputElement & { showPicker?: () => void };
  try {
    calendario.showPicker?.();
  } catch {
    input.focus();
  }
}

export function NovoAgendamentoPage() {
  const [searchParams] = useSearchParams();

  const [pacientes, setPacientes] = useState<PacienteOpcao[]>(PACIENTES_DEMO);
  const [pacienteSelecionado, setPacienteSelecionado] = useState('maya-oliveira');
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(
    searchParams.get('profissional') || 'demo-camila',
  );
  const [dataAgendamento, setDataAgendamento] = useState(
    searchParams.get('data') || DATA_DEMO,
  );
  const [horarioSelecionado, setHorarioSelecionado] = useState(() => {
    const hora = searchParams.get('hora');
    if (!hora) return '';
    return formatarHora(hora);
  });
  const [feedback, setFeedback] = useState('');
  const [mostrarCadastroRapido, setMostrarCadastroRapido] = useState(false);
  const [nomeCadastroRapido, setNomeCadastroRapido] = useState('');
  const [nascimentoCadastroRapido, setNascimentoCadastroRapido] = useState('');
  const [cnsCadastroRapido, setCnsCadastroRapido] = useState('');
  const [erroCadastroRapido, setErroCadastroRapido] = useState('');
  const [avisoDemonstracaoVisivel, setAvisoDemonstracaoVisivel] = useState(true);

  useEffect(() => {
    if (!avisoDemonstracaoVisivel) return;
    const temporizador = window.setTimeout(
      () => setAvisoDemonstracaoVisivel(false),
      10_000,
    );
    return () => window.clearTimeout(temporizador);
  }, [avisoDemonstracaoVisivel]);

  useEffect(() => {
    if (!mostrarCadastroRapido) return;
    const fecharPorEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMostrarCadastroRapido(false);
    };
    window.addEventListener('keydown', fecharPorEscape);
    return () => window.removeEventListener('keydown', fecharPorEscape);
  }, [mostrarCadastroRapido]);

  const profissionaisDisponiveis = PROFISSIONAIS_DEMO;

  const profissionalAtual =
    profissionaisDisponiveis.find(
      (profissional) => profissional.id === profissionalSelecionado,
    ) ?? profissionaisDisponiveis[0];

  const horariosOcupados = useMemo(() => {
    if (profissionalAtual?.id === 'demo-rafael') {
      return new Set(['10:00']);
    }
    return new Set<string>();
  }, [profissionalAtual]);

  const horarioLivreAtual =
    horarioSelecionado &&
    profissionalAtual?.grade.includes(horarioSelecionado) &&
    !horariosOcupados.has(horarioSelecionado);

  function confirmarCadastroRapido() {
    if (!nomeCadastroRapido.trim()) {
      setErroCadastroRapido('Informe o nome completo do paciente.');
      return;
    }

    const novoPaciente: PacienteOpcao = {
      id: `paciente-${Date.now()}`,
      nome: nomeCadastroRapido.trim(),
      nascidoEm: nascimentoCadastroRapido || undefined,
      cns: cnsCadastroRapido.trim() || undefined,
    };
    setPacientes((atuais) => [novoPaciente, ...atuais]);
    setPacienteSelecionado(novoPaciente.id);
    setMostrarCadastroRapido(false);
    setNomeCadastroRapido('');
    setNascimentoCadastroRapido('');
    setCnsCadastroRapido('');
    setErroCadastroRapido('');
  }

  function confirmarAgendamento() {
    if (!pacienteSelecionado || !profissionalAtual || !horarioLivreAtual) {
      setFeedback('Selecione paciente, profissional e um horário disponível.');
      return;
    }
    setFeedback(
      `Agendamento confirmado para ${pacientes.find((paciente) => paciente.id === pacienteSelecionado)?.nome} às ${horarioSelecionado}.`,
    );
  }

  return (
    <div className="novo-agendamento-page">
      {avisoDemonstracaoVisivel && (
        <div role="alert" className="novo-agendamento-notice">
          <span aria-hidden="true">i</span>
          <span>Dados de demonstração carregados. Nenhuma informação é salva após recarregar.</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => setAvisoDemonstracaoVisivel(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <header className="novo-agendamento-header">
        <div>
          <p className="novo-agendamento-eyebrow">Novo atendimento</p>
          <h1>Novo agendamento</h1>
          <p>A consulta será criada como “Aguardando confirmação”.</p>
        </div>
        <button
          type="button"
          className="novo-agendamento-cadastro"
          onClick={() => setMostrarCadastroRapido(true)}
        >
          <Plus aria-hidden="true" />
          Cadastro rápido
        </button>
      </header>

      {feedback && (
        <div role="status" className="novo-agendamento-feedback">
          <span>{feedback}</span>
          <button type="button" aria-label="Fechar mensagem" onClick={() => setFeedback('')}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="novo-agendamento-layout">
        <section className="novo-agendamento-card novo-agendamento-dados" aria-labelledby="dados-consulta">
          <h2 id="dados-consulta">1. Dados da consulta</h2>

          <label className="novo-agendamento-field">
            <span>Paciente</span>
            <span className="novo-agendamento-select">
              <select
                value={pacienteSelecionado}
                onChange={(event) => setPacienteSelecionado(event.target.value)}
              >
                {pacientes.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nome}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>

          <label className="novo-agendamento-field">
            <span>Profissional</span>
            <span className="novo-agendamento-select">
              <select
                value={profissionalAtual?.id ?? profissionalSelecionado}
                onChange={(event) => {
                  setProfissionalSelecionado(event.target.value);
                  setHorarioSelecionado('');
                }}
              >
                {profissionaisDisponiveis.map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome} · {profissional.servico} ({profissional.duracaoMinutos} min)
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>

          <label className="novo-agendamento-field">
            <span>Data</span>
            <input
              aria-label="Data do novo agendamento"
              type="date"
              value={dataAgendamento}
              onChange={(event) => {
                setDataAgendamento(event.target.value);
                setHorarioSelecionado('');
              }}
              onClick={(event) => abrirCalendario(event.currentTarget)}
            />
          </label>

          <aside className="novo-agendamento-regra">
            <strong>Regra configurável desta clínica</strong>
            <span>
              Nutrição: idade máxima de 65 anos. Fisioterapia: sem limite de idade.
            </span>
          </aside>

          <button
            type="button"
            className="novo-agendamento-confirmar"
            disabled={!pacienteSelecionado || !profissionalAtual || !horarioLivreAtual}
            onClick={confirmarAgendamento}
          >
            Confirmar agendamento
          </button>
        </section>

        <section className="novo-agendamento-card novo-agendamento-horarios" aria-labelledby="horarios-agendamento">
          <h2 id="horarios-agendamento">2. Escolha o horário</h2>
          {profissionalAtual && (
            <p>
              {profissionalAtual.duracaoMinutos === 60
                ? '08:00 às 12:00'
                : '08:00 às 12:00'}{' '}
              · intervalo de {profissionalAtual.duracaoMinutos === 60 ? '12:00 às 13:00' : '12:00 às 13:00'}{' '}
              indisponível
            </p>
          )}

          <div className="novo-agendamento-slots">
            {profissionalAtual?.grade.map((hora) => {
              const ocupado = horariosOcupados.has(hora);
              const selecionado = horarioSelecionado === hora;
              return (
                <button
                  key={hora}
                  type="button"
                  disabled={ocupado}
                  aria-pressed={selecionado}
                  className={
                    selecionado
                      ? 'novo-agendamento-slot selecionado'
                      : ocupado
                        ? 'novo-agendamento-slot ocupado'
                        : 'novo-agendamento-slot'
                  }
                  onClick={() => setHorarioSelecionado(hora)}
                >
                  <strong>{hora}</strong>
                  <span>{ocupado ? '× Ocupado' : selecionado ? '✓ Selecionado' : '✓ Livre'}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {mostrarCadastroRapido && (
        <div
          className="novo-agendamento-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMostrarCadastroRapido(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cadastro-rapido"
            className="novo-agendamento-modal"
          >
            <header>
              <h2 id="titulo-cadastro-rapido">Cadastro rápido</h2>
              <button
                type="button"
                aria-label="Fechar cadastro rápido"
                onClick={() => setMostrarCadastroRapido(false)}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                confirmarCadastroRapido();
              }}
            >
              <label className="novo-agendamento-field">
                <span>Nome completo <em>(obrigatório)</em></span>
                <input
                  aria-label="Nome completo"
                  value={nomeCadastroRapido}
                  onChange={(event) => {
                    setNomeCadastroRapido(event.target.value);
                    setErroCadastroRapido('');
                  }}
                />
              </label>

              <div className="novo-agendamento-modal-row">
                <label className="novo-agendamento-field">
                  <span>Data de nascimento</span>
                  <input
                    aria-label="Data de nascimento"
                    type="date"
                    value={nascimentoCadastroRapido}
                    onChange={(event) => setNascimentoCadastroRapido(event.target.value)}
                    onClick={(event) => abrirCalendario(event.currentTarget)}
                  />
                </label>

                <label className="novo-agendamento-field">
                  <span>CNS</span>
                  <input
                    aria-label="CNS"
                    value={cnsCadastroRapido}
                    onChange={(event) => setCnsCadastroRapido(event.target.value)}
                  />
                </label>
              </div>

              {erroCadastroRapido && (
                <p className="novo-agendamento-modal-error" role="alert">
                  {erroCadastroRapido}
                </p>
              )}

              <footer>
                <button
                  type="button"
                  className="novo-agendamento-modal-voltar"
                  onClick={() => setMostrarCadastroRapido(false)}
                >
                  Voltar
                </button>
                <button type="submit" className="novo-agendamento-modal-confirmar">
                  Cadastrar paciente
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
