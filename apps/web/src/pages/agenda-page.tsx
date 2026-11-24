import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState, EmptyState } from '@/components/ui/state-feedback';
import { usePerfil } from '@/hooks/use-perfil';
import {
  agendaControllerObter,
  cadastroControllerListarProfissionais,
  cadastroControllerListarServicos,
} from '@/lib/api-client';
import type { HorarioDaAgendaDto, StatusAgendamento } from '@/lib/api-client/models';
import './agenda-page.css';

type StatusLocal = StatusAgendamento;

const nomesPacientesDemo: Record<string, string> = {
  '00000000-0000-4000-a000-000000000020': 'Carlos Souza Teste',
  '00000000-0000-4000-a000-000000000021': 'Luana Teste Silva',
  '00000000-0000-4000-a000-000000000022': 'Maria Teste Oliveira',
  'demo-paciente-maya': 'Maya Oliveira',
  'demo-paciente-ana': 'Ana Paula Mendes',
};

function dataLocalISO() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarHora(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Recife',
  }).format(new Date(iso));
}

function formatarDataCabecalho(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  const dataLocal = new Date(ano, mes - 1, dia);
  const diaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(dataLocal)
    .replace('.', '')
    .replace('-feira', '');
  const mesAbreviado = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(dataLocal)
    .replace('.', '');

  return `${diaDaSemana.toUpperCase().replace(/[^A-Z]/g, '')}. ${String(dia).padStart(2, '0')} DE ${mesAbreviado.toUpperCase()}`;
}

function formatarDataCompleta(data: string) {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(new Date(ano, mes - 1, dia));
}

function formatarCancelamentoDetalhe(inicio: string) {
  const data = new Date(inicio);
  const dataTexto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Recife',
  }).format(data);
  const horaTexto = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Recife',
  }).format(data);
  return `${dataTexto}, às ${horaTexto}`;
}

function textoTipoAtendimento(tipo: string) {
  const tipos: Record<string, string> = {
    CONSULTA: 'Primeira consulta',
    AVALIACAO: 'Avaliação',
    PROCEDIMENTO: 'Procedimento',
    RETORNO: 'Retorno',
  };
  return tipos[tipo] ?? 'Atendimento';
}

function textoStatus(status: StatusAgendamento) {
  const textos: Record<StatusAgendamento, string> = {
    AGENDADO: 'Aguardando confirmação',
    CONFIRMADO: 'Confirmada',
    CHEGOU: 'Chegou',
    EM_ATENDIMENTO: 'Em atendimento',
    REALIZADO: 'Realizado',
    CANCELADO: 'Cancelado',
    FALTOU: 'Faltou',
    REMARCADO: 'Remarcado',
  };
  return textos[status];
}

function badgeStatus(status: StatusAgendamento) {
  if (status === 'CONFIRMADO' || status === 'CHEGOU' || status === 'REALIZADO') {
    return 'success' as const;
  }
  if (status === 'CANCELADO' || status === 'FALTOU') {
    return 'destructive' as const;
  }
  if (status === 'AGENDADO' || status === 'REMARCADO') {
    return 'default' as const;
  }
  return 'warning' as const;
}

function nomePaciente(id: string) {
  return nomesPacientesDemo[id] ?? `Paciente ${id.slice(-6).toUpperCase()}`;
}

function abrirCalendario(input: HTMLInputElement) {
  const calendario = input as HTMLInputElement & {
    showPicker?: () => void;
  };

  try {
    calendario.showPicker?.();
  } catch {
    input.focus();
  }
}

export function AgendaPage() {
  const navigate = useNavigate();
  const { perfil, profissionalId, isLoading: perfilLoading } = usePerfil();
  const [dataAgenda, setDataAgenda] = useState(dataLocalISO);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState('');
  const [statusLocais, setStatusLocais] = useState<Record<string, StatusLocal>>({});
  const [feedback, setFeedback] = useState('');
  const [avisoDemonstracaoVisivel, setAvisoDemonstracaoVisivel] = useState(true);
  const [modalEncaixeAberto, setModalEncaixeAberto] = useState(false);
  const [pacienteEncaixe, setPacienteEncaixe] = useState('larissa-fernandes');
  const [dataEncaixe, setDataEncaixe] = useState('2026-10-01');
  const [horaEncaixe, setHoraEncaixe] = useState('');
  const [motivoEncaixe, setMotivoEncaixe] = useState('');
  const [erroEncaixe, setErroEncaixe] = useState('');
  const [modalCancelamento, setModalCancelamento] = useState<{
    agendamentoId: string;
    pacienteNome: string;
    inicio: string;
  } | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [descricaoMotivoCancelamento, setDescricaoMotivoCancelamento] = useState('');
  const [erroCancelamento, setErroCancelamento] = useState('');

  const pacientesEncaixe = [
    { id: 'larissa-fernandes', nome: 'Larissa Fernandes' },
    { id: 'maya-oliveira', nome: 'Maya Oliveira' },
    { id: 'ana-paula-mendes', nome: 'Ana Paula Mendes' },
  ];

  useEffect(() => {
    if (perfil === 'PROFISSIONAL' && profissionalId) {
      setProfissionalSelecionado(profissionalId);
    }
  }, [perfil, profissionalId]);

  useEffect(() => {
    if (!avisoDemonstracaoVisivel) return;

    const temporizador = window.setTimeout(() => {
      setAvisoDemonstracaoVisivel(false);
    }, 10_000);

    return () => window.clearTimeout(temporizador);
  }, [avisoDemonstracaoVisivel]);

  useEffect(() => {
    if (!modalEncaixeAberto && !modalCancelamento) return;

    function fecharPorEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (modalCancelamento) {
        fecharModalCancelamento();
      } else {
        fecharModalEncaixe();
      }
    }

    window.addEventListener('keydown', fecharPorEscape);
    return () => window.removeEventListener('keydown', fecharPorEscape);
  }, [modalEncaixeAberto, modalCancelamento]);

  const profissionaisQuery = useQuery({
    queryKey: ['cadastro', 'profissionais'],
    queryFn: async () => {
      const response = await cadastroControllerListarProfissionais();
      if (response.status === 200) return response.data;
      throw response.data;
    },
  });

  const servicosQuery = useQuery({
    queryKey: ['cadastro', 'servicos'],
    queryFn: async () => {
      const response = await cadastroControllerListarServicos();
      if (response.status === 200) return response.data;
      throw response.data;
    },
  });

  const agendaQuery = useQuery({
    queryKey: ['agenda', dataAgenda, profissionalSelecionado || null],
    queryFn: async () => {
      const response = await agendaControllerObter({
        data: dataAgenda,
        profissionalId: profissionalSelecionado || undefined,
      });
      if (response.status === 200) return response.data;
      throw response.data;
    },
  });

  const modoStandalone = typeof window !== 'undefined' && window.location.port === '5174';

  const agendaDemo = useMemo(() => ({
    data: dataAgenda,
    temDisponibilidade: true,
    horarios: [
      {
        inicio: `${dataAgenda}T08:00:00-03:00`,
        fim: `${dataAgenda}T08:30:00-03:00`,
        profissional: { id: 'demo-profissional-camila' },
        servico: { id: 'demo-servico-fisioterapia' },
        clinica: { id: 'demo-clinica' },
        modalidade: 'PRESENCIAL' as const,
        slotId: 'demo-slot-0800',
        agendamento: {
          id: 'demo-agendamento-maya',
          status: 'AGENDADO' as const,
          paciente: { id: 'demo-paciente-maya' },
          tipoAtendimento: 'CONSULTA' as const,
        },
      },
      {
        inicio: `${dataAgenda}T09:00:00-03:00`,
        fim: `${dataAgenda}T09:30:00-03:00`,
        profissional: { id: 'demo-profissional-camila' },
        servico: { id: 'demo-servico-fisioterapia' },
        clinica: { id: 'demo-clinica' },
        modalidade: 'PRESENCIAL' as const,
        slotId: 'demo-slot-0900',
        agendamento: null,
      },
      {
        inicio: `${dataAgenda}T10:00:00-03:00`,
        fim: `${dataAgenda}T10:30:00-03:00`,
        profissional: { id: 'demo-profissional-camila' },
        servico: { id: 'demo-servico-fisioterapia' },
        clinica: { id: 'demo-clinica' },
        modalidade: 'PRESENCIAL' as const,
        slotId: 'demo-slot-1000',
        agendamento: {
          id: 'demo-agendamento-ana',
          status: 'CONFIRMADO' as const,
          paciente: { id: 'demo-paciente-ana' },
          tipoAtendimento: 'CONSULTA' as const,
        },
      },
      {
        inicio: `${dataAgenda}T11:00:00-03:00`,
        fim: `${dataAgenda}T12:00:00-03:00`,
        profissional: { id: 'demo-profissional-camila' },
        servico: { id: 'demo-servico-fisioterapia' },
        clinica: { id: 'demo-clinica' },
        modalidade: 'PRESENCIAL' as const,
        slotId: 'demo-slot-1100',
        agendamento: null,
      },
    ],
  }), [dataAgenda]);

  const nomesProfissionais = useMemo(() => {
    const nomes = new Map(
      (profissionaisQuery.data ?? []).map((profissional) => [profissional.id, profissional.nome]),
    );
    nomes.set('demo-profissional-camila', 'Dra. Camila Andrade Rocha');
    return nomes;
  }, [profissionaisQuery.data]);

  const nomesServicos = useMemo(() => {
    const nomes = new Map(
      (servicosQuery.data ?? []).map((servico) => [servico.id, servico.nome]),
    );
    nomes.set('demo-servico-fisioterapia', 'Fisioterapia');
    return nomes;
  }, [servicosQuery.data]);

  const profissionaisDisponiveis =
    modoStandalone ||
    agendaQuery.isError ||
    !agendaQuery.data?.temDisponibilidade
      ? [{ id: 'demo-profissional-camila', nome: 'Dra. Camila Andrade Rocha' }]
      : (profissionaisQuery.data ?? []);

  const dadosAgenda =
    modoStandalone ||
    agendaQuery.isError ||
    !agendaQuery.data?.temDisponibilidade
      ? agendaDemo
      : agendaQuery.data;

  const gruposPorProfissional = useMemo(() => {
    const grupos = new Map<string, HorarioDaAgendaDto[]>();
    for (const horario of dadosAgenda?.horarios ?? []) {
      const itens = grupos.get(horario.profissional.id) ?? [];
      itens.push(horario);
      grupos.set(horario.profissional.id, itens);
    }
    return Array.from(grupos.entries());
  }, [dadosAgenda?.horarios]);

  function confirmarAgendamento(id: string) {
    setStatusLocais((atuais) => ({ ...atuais, [id]: 'CONFIRMADO' }));
    setFeedback('Agendamento confirmado pelo paciente.');
  }

  function abrirModalEncaixe() {
    setPacienteEncaixe('larissa-fernandes');
    setDataEncaixe('2026-10-01');
    setHoraEncaixe('');
    setMotivoEncaixe('');
    setErroEncaixe('');
    setModalEncaixeAberto(true);
  }

  function fecharModalEncaixe() {
    setModalEncaixeAberto(false);
    setErroEncaixe('');
  }

  function confirmarEncaixe() {
    if (!pacienteEncaixe || !dataEncaixe || !horaEncaixe || !motivoEncaixe.trim()) {
      setErroEncaixe('Preencha todos os campos obrigatórios.');
      return;
    }

    setModalEncaixeAberto(false);
    setErroEncaixe('');
    setFeedback('Encaixe confirmado.');
  }

  function abrirModalCancelamento(
    agendamentoId: string,
    pacienteNome: string,
    inicio: string,
  ) {
    setModalCancelamento({
      agendamentoId,
      pacienteNome,
      inicio,
    });
    setMotivoCancelamento('');
    setDescricaoMotivoCancelamento('');
    setErroCancelamento('');
  }

  function fecharModalCancelamento() {
    setModalCancelamento(null);
    setMotivoCancelamento('');
    setDescricaoMotivoCancelamento('');
    setErroCancelamento('');
  }

  function confirmarCancelamento() {
    if (!motivoCancelamento) {
      setErroCancelamento('Selecione o motivo do cancelamento.');
      return;
    }

    if (motivoCancelamento === 'Outro' && !descricaoMotivoCancelamento.trim()) {
      setErroCancelamento('Descreva o motivo do cancelamento.');
      return;
    }

    if (modalCancelamento) {
      setStatusLocais((atuais) => ({
        ...atuais,
        [modalCancelamento.agendamentoId]: 'CANCELADO',
      }));
    }
    setFeedback('Agendamento cancelado.');
    fecharModalCancelamento();
  }

  return (
    <div className="agenda-page">
      {avisoDemonstracaoVisivel && (
        <div
          role="alert"
          className="agenda-notice"
        >
          <span aria-hidden="true">i</span>
          <span>Dados de demonstração carregados. Nenhuma informação é salva após recarregar.</span>
          <button
            type="button"
            aria-label="Fechar aviso"
            className="agenda-notice-close"
            onClick={() => setAvisoDemonstracaoVisivel(false)}
          >
            <X aria-hidden="true" />
          </button>
        </div>
      )}

      <header className="agenda-header">
        <div className="agenda-header-copy">
          <p className="agenda-eyebrow">
            Visão da clínica
          </p>
          <h1 className="agenda-title">
            Agenda de atendimentos
          </h1>
          <p className="agenda-subtitle">
            Horários, situações e ações em uma grade acessível.
          </p>
        </div>
        <Button
          size="md"
          className="agenda-primary-action"
          onClick={abrirModalEncaixe}
        >
          <Plus className="h-4 w-4" />
          Fazer encaixe
        </Button>
      </header>

      {feedback && (
        <div
          role="status"
          className="agenda-feedback"
        >
          <span>{feedback}</span>
          <button
            type="button"
            aria-label="Fechar mensagem"
            onClick={() => setFeedback('')}
            className="ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <section
        aria-label="Filtros da agenda"
        className="agenda-filters-section"
      >
        <div className="agenda-filters-grid grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-heading">Período</span>
            <span className="relative block h-11">
              <select
                className="h-11 w-full appearance-none rounded-lg border border-line-strong bg-surface px-3 pr-9 text-sm font-medium text-heading"
                defaultValue="diaria"
              >
                <option value="diaria">Agenda diária</option>
                <option value="semanal">Agenda semanal</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-heading" />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-heading">Data</span>
            <span className="relative block h-11" style={{ height: '44px' }}>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 flex items-center truncate rounded-lg px-3 pr-9 text-sm font-medium"
                style={{
                  color: 'var(--heading)',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--line-strong)',
                  height: '44px'
                }}
              >
                {formatarDataCompleta(dataAgenda)}
              </span>
              <input
                aria-label="Data da agenda"
                type="date"
                value={dataAgenda}
                onChange={(event) => setDataAgenda(event.target.value)}
                onClick={(event) => abrirCalendario(event.currentTarget)}
                className="absolute inset-0 z-20 h-11 w-full cursor-pointer opacity-0"
                style={{ paddingRight: '30px', color: 'transparent', WebkitTextFillColor: 'transparent', height: '44px' }}
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 z-30 h-4 w-4 -translate-y-1/2 text-heading" />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-heading">Profissional</span>
            <span className="relative block">
              <select
                value={profissionalSelecionado}
                onChange={(event) => setProfissionalSelecionado(event.target.value)}
                disabled={perfil === 'PROFISSIONAL' || perfilLoading}
                className="h-11 w-full appearance-none rounded-lg border border-line-strong bg-surface px-3 pr-9 text-sm font-medium text-heading disabled:cursor-not-allowed disabled:opacity-70"
              >
                {perfil !== 'PROFISSIONAL' && <option value="">Todos os profissionais</option>}
                {profissionaisDisponiveis.map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-heading" />
            </span>
          </label>
        </div>

        <div className="agenda-status-badges">
          <Badge variant="success" className="border border-success-line bg-success-subtle px-2 py-1 text-[11px]">
            <span aria-hidden="true">✓</span>&nbsp; Livre
          </Badge>
          <Badge variant="secondary" className="border border-line-strong px-2 py-1 text-[11px]">
            <span aria-hidden="true">—</span>&nbsp; Bloqueado
          </Badge>
          <Badge variant="warning" className="border border-warning-line px-2 py-1 text-[11px]">
            <span aria-hidden="true">◆</span>&nbsp; ENCAIXE
          </Badge>
        </div>
      </section>

      {(agendaQuery.isLoading && !modoStandalone) ? (
        <div className="rounded-xl border border-line bg-surface">
          <LoadingState message="Carregando agenda do dia..." />
        </div>
      ) : !dadosAgenda?.temDisponibilidade ? (
        <EmptyState
          title="Nenhuma disponibilidade cadastrada"
          description="Não há horários disponíveis para os filtros selecionados neste dia."
        />
      ) : gruposPorProfissional.length === 0 ? (
        <EmptyState
          title="Nenhum horário encontrado"
          description="Não há horários cadastrados para os filtros selecionados."
        />
      ) : (
        <div className="agenda-results">
          <div className="agenda-date-banner">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand-text">
              {formatarDataCabecalho(dataAgenda)}
            </p>
            <p className="sr-only">{formatarDataCompleta(dataAgenda)}</p>
          </div>

          {gruposPorProfissional.map(([profissionalId, horarios]) => {
            const nomeProfissional =
              nomesProfissionais.get(profissionalId) ?? `Profissional ${profissionalId.slice(-6)}`;
            const primeiro = horarios.reduce((menor, horario) =>
              horario.inicio < menor.inicio ? horario : menor,
            );
            const ultimo = horarios.reduce((maior, horario) =>
              horario.fim > maior.fim ? horario : maior,
            );
            const servicoNome =
              nomesServicos.get(primeiro.servico.id) ??
              (primeiro.servico.id ? 'Fisioterapia' : 'Atendimento');
            const temEncaixe = horarios.some(
              (horario) => horario.agendamento && horario.slotId === null,
            );

            const linhas = new Map<string, HorarioDaAgendaDto[]>();
            for (const horario of horarios) {
              const chave = horario.inicio;
              const itens = linhas.get(chave) ?? [];
              itens.push(horario);
              linhas.set(chave, itens);
            }

            return (
              <section key={profissionalId} className="agenda-professional-section">
                <div className="agenda-professional-header">
                  <div className="agenda-professional-copy">
                    <h2 className="agenda-professional-name">
                      {nomeProfissional}
                      <span className="font-normal text-body"> - {servicoNome}</span>
                    </h2>
                    <p className="agenda-professional-time">
                      {formatarHora(primeiro.inicio)} às {formatarHora(ultimo.fim)} · consultas de 60 minutos
                    </p>
                  </div>
                  {temEncaixe && (
                    <Badge variant="warning" className="mt-2 w-fit border border-warning-line px-2.5 py-1 sm:mt-0">
                      ENCAIXE
                    </Badge>
                  )}
                </div>

                {Array.from(linhas.entries()).map(([inicio, itens]) => (
                  <div
                    key={inicio}
                    className="agenda-time-row"
                  >
                    <div className="agenda-time-column">
                      <p className="text-base font-bold text-heading">{formatarHora(inicio)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatarHora(itens[0].fim)}
                      </p>
                    </div>

                    <div className="agenda-time-content">
                      {itens.map((horario) => {
                        const agendamento = horario.agendamento;

                        if (!agendamento) {
                          return (
                            <div
                              key={`${horario.inicio}-${horario.slotId ?? 'livre'}`}
                              className="agenda-available-row"
                            >
                              <Badge
                                variant="success"
                                className="shrink-0 border border-success-line bg-surface px-2 py-1 text-[11px]"
                              >
                                <span aria-hidden="true">✓</span>&nbsp; Livre
                              </Badge>
                              <span className="text-base font-medium text-heading">
                                Disponível para agendamento
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/schedules/new?profissional=${encodeURIComponent(
                                      horario.profissional.id,
                                    )}&data=${encodeURIComponent(dataAgenda)}&hora=${encodeURIComponent(
                                      horario.inicio,
                                    )}`,
                                  )
                                }
                                className="ml-1 text-xs font-bold text-brand-text underline underline-offset-2"
                              >
                                Agendar neste horário
                              </button>
                            </div>
                          );
                        }

                        const status = statusLocais[agendamento.id] ?? agendamento.status;
                        const podeConfirmar =
                          status === 'AGENDADO' || status === 'CONFIRMADO';

                        return (
                          <article
                            key={agendamento.id}
                            className="agenda-appointment-row"
                          >
                            <div className="agenda-appointment-copy">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-heading">
                                  {nomePaciente(agendamento.paciente.id)}
                                </h3>
                                {status === 'AGENDADO' ? (
                                  <Badge
                                    variant="default"
                                    className="border border-info-line px-2 py-0.5 text-[10px]"
                                  >
                                    Aguardando confirmação
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant={badgeStatus(status)}
                                    className="border border-line px-2 py-0.5 text-[10px]"
                                  >
                                    {status === 'CONFIRMADO' ? '✓ Confirmada' : textoStatus(status)}
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-1.5 text-sm text-muted">
                                {textoTipoAtendimento(agendamento.tipoAtendimento)}
                              </p>
                            </div>

                            {status !== 'CANCELADO' &&
                              status !== 'REMARCADO' &&
                              status !== 'REALIZADO' && (
                                <div className="agenda-appointment-actions">
                                  {podeConfirmar && status === 'AGENDADO' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-10 border-line-strong bg-surface px-4 text-sm font-bold text-heading"
                                      onClick={() => confirmarAgendamento(agendamento.id)}
                                    >
                                      Confirmar pelo paciente
                                    </Button>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-10 px-4 text-sm font-bold"
                                    onClick={() =>
                                      abrirModalCancelamento(
                                        agendamento.id,
                                        nomePaciente(agendamento.paciente.id),
                                        horario.inicio,
                                      )
                                    }
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}

      {modalEncaixeAberto && (
        <div
          className="agenda-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharModalEncaixe();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-novo-encaixe"
            className="agenda-modal"
          >
            <header className="agenda-modal-header">
              <h2 id="titulo-novo-encaixe">Novo encaixe</h2>
              <button
                type="button"
                aria-label="Fechar modal"
                className="agenda-modal-close"
                onClick={fecharModalEncaixe}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <p className="agenda-modal-description">
              Encaixes podem ocupar um horário já usado ou fora da grade e ficam identificados como <strong>ENCAIXE</strong>.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                confirmarEncaixe();
              }}
            >
              <label className="agenda-modal-field agenda-modal-patient">
                <span>Paciente</span>
                <span className="agenda-modal-select-wrap">
                  <select
                    value={pacienteEncaixe}
                    onChange={(event) => setPacienteEncaixe(event.target.value)}
                  >
                    {pacientesEncaixe.map((paciente) => (
                      <option key={paciente.id} value={paciente.id}>
                        {paciente.nome}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" />
                </span>
              </label>

              <div className="agenda-modal-row">
                <label className="agenda-modal-field">
                  <span>Data</span>
                  <input
                    aria-label="Data do encaixe"
                    type="date"
                    value={dataEncaixe}
                    onChange={(event) => setDataEncaixe(event.target.value)}
                    onClick={(event) => abrirCalendario(event.currentTarget)}
                  />
                </label>

                <label className="agenda-modal-field">
                  <span>Horário</span>
                  <input
                    aria-label="Horário do encaixe"
                    type="time"
                    value={horaEncaixe}
                    onChange={(event) => setHoraEncaixe(event.target.value)}
                  />
                </label>
              </div>

              <label className="agenda-modal-field">
                <span>
                  Motivo do encaixe <em>(obrigatório)</em>
                </span>
                <textarea
                  aria-label="Motivo do encaixe"
                  value={motivoEncaixe}
                  onChange={(event) => setMotivoEncaixe(event.target.value)}
                  rows={4}
                />
              </label>

              {erroEncaixe && (
                <p className="agenda-modal-error" role="alert">
                  {erroEncaixe}
                </p>
              )}

              <footer className="agenda-modal-actions">
                <button type="button" className="agenda-modal-secondary" onClick={fecharModalEncaixe}>
                  Voltar
                </button>
                <button type="submit" className="agenda-modal-primary">
                  Confirmar encaixe
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {modalCancelamento && (
        <div
          className="agenda-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) fecharModalCancelamento();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cancelar-consulta"
            className="agenda-modal agenda-cancel-modal"
          >
            <header className="agenda-modal-header">
              <h2 id="titulo-cancelar-consulta">Cancelar consulta?</h2>
              <button
                type="button"
                aria-label="Fechar modal de cancelamento"
                className="agenda-modal-close"
                onClick={fecharModalCancelamento}
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <p className="agenda-modal-description agenda-cancel-description">
              Consulta de <strong>{modalCancelamento.pacienteNome}</strong>{' '}
              {formatarCancelamentoDetalhe(modalCancelamento.inicio)}. O horário ficará livre imediatamente.
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                confirmarCancelamento();
              }}
            >
              <label className="agenda-modal-field agenda-cancel-reason">
                <span>
                  Motivo <em>(obrigatório)</em>
                </span>
                <span className="agenda-modal-select-wrap">
                  <select
                    aria-label="Motivo do cancelamento"
                    value={motivoCancelamento}
                    onChange={(event) => {
                      setMotivoCancelamento(event.target.value);
                      setErroCancelamento('');
                      if (event.target.value !== 'Outro') {
                        setDescricaoMotivoCancelamento('');
                      }
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="Imprevisto pessoal">Imprevisto pessoal</option>
                    <option value="Problema de saúde">Problema de saúde</option>
                    <option value="Conflito de horário">Conflito de horário</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <ChevronDown aria-hidden="true" />
                </span>
              </label>

              {motivoCancelamento === 'Outro' && (
                <label className="agenda-modal-field agenda-cancel-description-field">
                  <span>
                    Descreva o motivo <em>(obrigatório)</em>
                  </span>
                  <textarea
                    aria-label="Descreva o motivo"
                    value={descricaoMotivoCancelamento}
                    onChange={(event) => {
                      setDescricaoMotivoCancelamento(event.target.value);
                      setErroCancelamento('');
                    }}
                    rows={4}
                  />
                </label>
              )}

              <aside className="agenda-cancel-warning" aria-label="Confirma antes de continuar">
                <strong>Confirma antes de continuar</strong>
                <span>Esta ação cancela a consulta. Em seguida, a opção de reagendar ficará disponível.</span>
              </aside>

              {erroCancelamento && (
                <p className="agenda-modal-error" role="alert">
                  {erroCancelamento}
                </p>
              )}

              <footer className="agenda-modal-actions">
                <button type="button" className="agenda-modal-secondary" onClick={fecharModalCancelamento}>
                  Voltar sem cancelar
                </button>
                <button type="submit" className="agenda-cancel-confirm">
                  Confirmar cancelamento
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
