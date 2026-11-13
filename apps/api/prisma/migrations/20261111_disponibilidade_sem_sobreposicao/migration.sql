-- US-01 (DS-9): regras da disponibilidade garantidas pelo próprio banco.
-- O Prisma não modela CHECK nem EXCLUDE, por isso elas existem só aqui na migration.

-- 1. A hora de fim tem que ser posterior à de início.
ALTER TABLE "disponibilidades"
  ADD CONSTRAINT "disponibilidades_fim_apos_inicio" CHECK ("fim" > "inicio");

-- 2. Um profissional não pode ter duas disponibilidades sobrepostas.
--    O intervalo é meio-aberto '[)', então janelas encostadas (08:00-12:00 e 12:00-14:00) são permitidas.
--    A constraint fecha a corrida entre duas requisições simultâneas que passariam pela checagem do service.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "disponibilidades"
  ADD CONSTRAINT "disponibilidades_sem_sobreposicao"
  EXCLUDE USING gist (
    "profissional_id" WITH =,
    tsrange("data" + "inicio", "data" + "fim", '[)') WITH &&
  );
