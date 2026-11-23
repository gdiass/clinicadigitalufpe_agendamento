-- US-12 (DS-13): índices da agenda do dia.
-- A recepção abre o dia sem filtrar profissional, então a data vem na frente;
-- com profissional, o mesmo índice atende as duas colunas.
CREATE INDEX "disponibilidades_data_profissional_id_idx" ON "disponibilidades"("data", "profissional_id");

-- Agendamentos do dia de todos os profissionais (intervalo em "inicio").
-- O índice (profissional_id, inicio) que já existe só serve quando há profissional.
CREATE INDEX "agendamentos_inicio_idx" ON "agendamentos"("inicio");
