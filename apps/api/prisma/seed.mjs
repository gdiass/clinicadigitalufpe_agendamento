import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

// ─── UUIDs Fixos (determinísticos, reutilizáveis pela DS-63) ────────────────
//
// DS-61 · Seed da Agenda — UUIDs compartilhados com o Cadastro
//
// A DS-63 (mock do microsserviço Cadastro) DEVE usar os mesmos UUIDs abaixo
// para que os FKs lógicos entre Agenda ↔ Cadastro sejam consistentes em dev.
//
//   Entidade                              UUID
//   ──────────────────────────────────────────────────────────────────────────
//   Clínica                               00000000-0000-4000-a000-000000000001
//   Serviço                               00000000-0000-4000-a000-000000000002
//   Dra. Ana Lima (profissional)          00000000-0000-4000-a000-000000000010
//   Dr. Rui Costa (profissional)          00000000-0000-4000-a000-000000000011
//   Carlos Souza Teste (paciente)         00000000-0000-4000-a000-000000000020
//   Luana Teste Silva (paciente)          00000000-0000-4000-a000-000000000021
//   Maria Teste Oliveira (paciente)       00000000-0000-4000-a000-000000000022
//   Usuário do Shell, fictício (recepção) 00000000-0000-4000-a000-000000000040
//
// Os UUIDs de disponibilidade, slot, agendamento e histórico são internos
// da Agenda e NÃO vão para o Cadastro.
// ────────────────────────────────────────────────────────────────────────────

// Clínica e serviço
const CLINICA_ID = '00000000-0000-4000-a000-000000000001';
const SERVICO_ID = '00000000-0000-4000-a000-000000000002';

// Profissionais
const PROF_ANA_ID  = '00000000-0000-4000-a000-000000000010'; // Dra. Ana Lima
const PROF_RUI_ID  = '00000000-0000-4000-a000-000000000011'; // Dr. Rui Costa

// Pacientes
const PAC_CARLOS_ID = '00000000-0000-4000-a000-000000000020'; // Carlos Souza Teste
const PAC_LUANA_ID  = '00000000-0000-4000-a000-000000000021'; // Luana Teste Silva
const PAC_MARIA_ID  = '00000000-0000-4000-a000-000000000022'; // Maria Teste Oliveira

// Usuário do Shell (fictício) que registra as ações no sistema (ex.: recepção).
// Vai em historico_status.responsavel_id e agendamentos.cancelado_por_id.
// O Shell não tem usuários de dev com UUID fixo, por isso o valor é inventado.
const USUARIO_SHELL_ID = '00000000-0000-4000-a000-000000000040';

// Disponibilidades
const DISP_ANA_ID = '00000000-0000-4000-a000-000000000030';
const DISP_RUI_ID = '00000000-0000-4000-a000-000000000031';

// Slots – 8 por profissional (08:00–12:00, 30 min cada)
// Dra. Ana Lima
const SLOT_ANA_0800_ID = '00000000-0000-4000-a000-000000000100';
const SLOT_ANA_0830_ID = '00000000-0000-4000-a000-000000000101';
const SLOT_ANA_0900_ID = '00000000-0000-4000-a000-000000000102';
const SLOT_ANA_0930_ID = '00000000-0000-4000-a000-000000000103';
const SLOT_ANA_1000_ID = '00000000-0000-4000-a000-000000000104';
const SLOT_ANA_1030_ID = '00000000-0000-4000-a000-000000000105';
const SLOT_ANA_1100_ID = '00000000-0000-4000-a000-000000000106';
const SLOT_ANA_1130_ID = '00000000-0000-4000-a000-000000000107';
// Dr. Rui Costa
const SLOT_RUI_0800_ID = '00000000-0000-4000-a000-000000000110';
const SLOT_RUI_0830_ID = '00000000-0000-4000-a000-000000000111';
const SLOT_RUI_0900_ID = '00000000-0000-4000-a000-000000000112';
const SLOT_RUI_0930_ID = '00000000-0000-4000-a000-000000000113';
const SLOT_RUI_1000_ID = '00000000-0000-4000-a000-000000000114';
const SLOT_RUI_1030_ID = '00000000-0000-4000-a000-000000000115';
const SLOT_RUI_1100_ID = '00000000-0000-4000-a000-000000000116';
const SLOT_RUI_1130_ID = '00000000-0000-4000-a000-000000000117';

// Agendamentos
const AGEND_CARLOS_ID = '00000000-0000-4000-a000-000000000200'; // AGENDADO
const AGEND_LUANA_ID  = '00000000-0000-4000-a000-000000000201'; // CONFIRMADO
const AGEND_MARIA_ID  = '00000000-0000-4000-a000-000000000202'; // CANCELADO

// Histórico de status
const HIST_CARLOS_1_ID = '00000000-0000-4000-a000-000000000300'; // → AGENDADO
const HIST_LUANA_1_ID  = '00000000-0000-4000-a000-000000000301'; // → AGENDADO
const HIST_LUANA_2_ID  = '00000000-0000-4000-a000-000000000302'; // AGENDADO → CONFIRMADO
const HIST_MARIA_1_ID  = '00000000-0000-4000-a000-000000000303'; // → AGENDADO
const HIST_MARIA_2_ID  = '00000000-0000-4000-a000-000000000304'; // AGENDADO → CANCELADO

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * SQL expression for "today" in America/Recife timezone.
 */
const HOJE = `(now() AT TIME ZONE 'America/Recife')::date`;

/**
 * Builds a SQL expression for a timestamptz from a Recife-local time on "today".
 * Example: tsRecife('08:00') → "(((now() AT TIME ZONE 'America/Recife')::date + '08:00'::time) AT TIME ZONE 'America/Recife')"
 */
function tsRecife(hora) {
  return `((${HOJE} + '${hora}'::time) AT TIME ZONE 'America/Recife')`;
}

/**
 * Generates the SQL INSERT for all 8 slots of a given disponibilidade.
 * Slots go from 08:00 to 11:30 in 30-min increments.
 */
function gerarSlotsSQL(slotIds, disponibilidadeId) {
  const horarios = [
    '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30',
  ];

  const values = horarios.map((hora, i) => {
    const horaFim = horarios[i + 1] || '12:00';
    return `(
      '${slotIds[i]}',
      '${disponibilidadeId}',
      ${tsRecife(hora)},
      ${tsRecife(horaFim)},
      now(),
      now()
    )`;
  });

  return `
    INSERT INTO slots (id, disponibilidade_id, inicio, fim, created_at, updated_at)
    VALUES ${values.join(',\n           ')}
    ON CONFLICT (id) DO UPDATE SET
      disponibilidade_id = EXCLUDED.disponibilidade_id,
      inicio             = EXCLUDED.inicio,
      fim                = EXCLUDED.fim,
      updated_at         = EXCLUDED.updated_at;
  `;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();

  try {
    await client.query('BEGIN');

    // ── Disponibilidades ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO disponibilidades (id, profissional_id, clinica_id, servico_id, data, inicio, fim, modalidade, duracao_slot_min, created_at, updated_at)
      VALUES
        ('${DISP_ANA_ID}', '${PROF_ANA_ID}', '${CLINICA_ID}', '${SERVICO_ID}', ${HOJE}, '08:00'::time, '12:00'::time, 'PRESENCIAL', 30, now(), now()),
        ('${DISP_RUI_ID}', '${PROF_RUI_ID}', '${CLINICA_ID}', '${SERVICO_ID}', ${HOJE}, '08:00'::time, '12:00'::time, 'PRESENCIAL', 30, now(), now())
      ON CONFLICT (id) DO UPDATE SET
        data       = EXCLUDED.data,
        inicio     = EXCLUDED.inicio,
        fim        = EXCLUDED.fim,
        updated_at = EXCLUDED.updated_at;
    `);
    console.log('  ✅ Disponibilidades inseridas');

    // ── Slots (Ana: 8 slots, Rui: 8 slots) ───────────────────────────────
    const slotsAna = [
      SLOT_ANA_0800_ID, SLOT_ANA_0830_ID, SLOT_ANA_0900_ID, SLOT_ANA_0930_ID,
      SLOT_ANA_1000_ID, SLOT_ANA_1030_ID, SLOT_ANA_1100_ID, SLOT_ANA_1130_ID,
    ];
    const slotsRui = [
      SLOT_RUI_0800_ID, SLOT_RUI_0830_ID, SLOT_RUI_0900_ID, SLOT_RUI_0930_ID,
      SLOT_RUI_1000_ID, SLOT_RUI_1030_ID, SLOT_RUI_1100_ID, SLOT_RUI_1130_ID,
    ];

    await client.query(gerarSlotsSQL(slotsAna, DISP_ANA_ID));
    await client.query(gerarSlotsSQL(slotsRui, DISP_RUI_ID));
    console.log('  ✅ Slots inseridos (16 total)');

    // ── Agendamentos ──────────────────────────────────────────────────────
    // Carlos Souza Teste → slot Ana 08:00, AGENDADO
    // Luana Teste Silva  → slot Ana 08:30, CONFIRMADO
    // Maria Teste Oliveira → slot Rui 08:00, CANCELADO
    await client.query(`
      INSERT INTO agendamentos (
        id, slot_id, paciente_id, profissional_id, servico_id, clinica_id,
        inicio, fim, tipo_atendimento, modalidade, status,
        motivo, origem_demanda,
        chegada_em, inicio_atendimento_em, fim_atendimento_em,
        cancelado_em, motivo_cancelamento, cancelado_por_id,
        agendamento_origem_id, created_at, updated_at
      ) VALUES
        (
          '${AGEND_CARLOS_ID}', '${SLOT_ANA_0800_ID}',
          '${PAC_CARLOS_ID}', '${PROF_ANA_ID}', '${SERVICO_ID}', '${CLINICA_ID}',
          ${tsRecife('08:00')}, ${tsRecife('08:30')},
          'CONSULTA', 'PRESENCIAL', 'AGENDADO',
          'Dor lombar crônica', 'Encaminhamento médico',
          NULL, NULL, NULL,
          NULL, NULL, NULL,
          NULL, now(), now()
        ),
        (
          '${AGEND_LUANA_ID}', '${SLOT_ANA_0830_ID}',
          '${PAC_LUANA_ID}', '${PROF_ANA_ID}', '${SERVICO_ID}', '${CLINICA_ID}',
          ${tsRecife('08:30')}, ${tsRecife('09:00')},
          'AVALIACAO', 'PRESENCIAL', 'CONFIRMADO',
          'Avaliação postural', 'Demanda espontânea',
          NULL, NULL, NULL,
          NULL, NULL, NULL,
          NULL, now(), now()
        ),
        (
          '${AGEND_MARIA_ID}', '${SLOT_RUI_0800_ID}',
          '${PAC_MARIA_ID}', '${PROF_RUI_ID}', '${SERVICO_ID}', '${CLINICA_ID}',
          ${tsRecife('08:00')}, ${tsRecife('08:30')},
          'RETORNO', 'PRESENCIAL', 'CANCELADO',
          'Retorno pós-cirúrgico', 'Encaminhamento médico',
          NULL, NULL, NULL,
          ${tsRecife('07:30')}, 'Paciente solicitou cancelamento por motivo pessoal', '${USUARIO_SHELL_ID}',
          NULL, now(), now()
        )
      ON CONFLICT (id) DO UPDATE SET
        slot_id                = EXCLUDED.slot_id,
        inicio                 = EXCLUDED.inicio,
        fim                    = EXCLUDED.fim,
        status                 = EXCLUDED.status,
        chegada_em             = EXCLUDED.chegada_em,
        inicio_atendimento_em  = EXCLUDED.inicio_atendimento_em,
        fim_atendimento_em     = EXCLUDED.fim_atendimento_em,
        cancelado_em           = EXCLUDED.cancelado_em,
        motivo_cancelamento    = EXCLUDED.motivo_cancelamento,
        cancelado_por_id       = EXCLUDED.cancelado_por_id,
        updated_at             = EXCLUDED.updated_at;
    `);
    console.log('  ✅ Agendamentos inseridos (3 total)');

    // ── Histórico de Status ───────────────────────────────────────────────
    await client.query(`
      INSERT INTO historico_status (
        id, agendamento_id, status_anterior, status_novo, em, responsavel_id, observacao, created_at, updated_at
      ) VALUES
        -- Carlos: → AGENDADO
        (
          '${HIST_CARLOS_1_ID}', '${AGEND_CARLOS_ID}',
          NULL, 'AGENDADO', ${tsRecife('07:00')},
          '${USUARIO_SHELL_ID}', NULL, now(), now()
        ),
        -- Luana: → AGENDADO
        (
          '${HIST_LUANA_1_ID}', '${AGEND_LUANA_ID}',
          NULL, 'AGENDADO', ${tsRecife('07:00')},
          '${USUARIO_SHELL_ID}', NULL, now(), now()
        ),
        -- Luana: AGENDADO → CONFIRMADO
        (
          '${HIST_LUANA_2_ID}', '${AGEND_LUANA_ID}',
          'AGENDADO', 'CONFIRMADO', ${tsRecife('07:15')},
          '${USUARIO_SHELL_ID}', 'Confirmado via sistema', now(), now()
        ),
        -- Maria: → AGENDADO
        (
          '${HIST_MARIA_1_ID}', '${AGEND_MARIA_ID}',
          NULL, 'AGENDADO', ${tsRecife('06:50')},
          '${USUARIO_SHELL_ID}', NULL, now(), now()
        ),
        -- Maria: AGENDADO → CANCELADO
        (
          '${HIST_MARIA_2_ID}', '${AGEND_MARIA_ID}',
          'AGENDADO', 'CANCELADO', ${tsRecife('07:30')},
          '${USUARIO_SHELL_ID}', 'Paciente solicitou cancelamento por motivo pessoal', now(), now()
        )
      ON CONFLICT (id) DO UPDATE SET
        status_anterior = EXCLUDED.status_anterior,
        status_novo     = EXCLUDED.status_novo,
        em              = EXCLUDED.em,
        responsavel_id  = EXCLUDED.responsavel_id,
        observacao      = EXCLUDED.observacao,
        updated_at      = EXCLUDED.updated_at;
    `);
    console.log('  ✅ Histórico de status inserido (5 registros)');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar seed da agenda:', error);
    throw error;
  } finally {
    await client.end();
  }

  console.log('');
  console.log('Seed da aplicação concluído.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
