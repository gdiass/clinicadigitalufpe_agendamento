-- CreateEnum
CREATE TYPE "status_agendamento" AS ENUM ('AGENDADO', 'CONFIRMADO', 'CHEGOU', 'EM_ATENDIMENTO', 'REALIZADO', 'CANCELADO', 'FALTOU', 'REMARCADO');

-- CreateEnum
CREATE TYPE "modalidade" AS ENUM ('PRESENCIAL', 'REMOTO');

-- CreateEnum
CREATE TYPE "tipo_atendimento" AS ENUM ('CONSULTA', 'AVALIACAO', 'PROCEDIMENTO', 'RETORNO');

-- CreateTable
CREATE TABLE "disponibilidades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profissional_id" UUID NOT NULL,
    "clinica_id" UUID NOT NULL,
    "servico_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "inicio" TIME NOT NULL,
    "fim" TIME NOT NULL,
    "modalidade" "modalidade" NOT NULL,
    "duracao_slot_min" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "disponibilidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disponibilidade_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fim" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agendamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slot_id" UUID,
    "paciente_id" UUID NOT NULL,
    "profissional_id" UUID NOT NULL,
    "servico_id" UUID NOT NULL,
    "clinica_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fim" TIMESTAMPTZ NOT NULL,
    "tipo_atendimento" "tipo_atendimento" NOT NULL,
    "modalidade" "modalidade" NOT NULL,
    "status" "status_agendamento" NOT NULL DEFAULT 'AGENDADO',
    "motivo" TEXT,
    "origem_demanda" TEXT,
    "chegada_em" TIMESTAMPTZ,
    "inicio_atendimento_em" TIMESTAMPTZ,
    "fim_atendimento_em" TIMESTAMPTZ,
    "cancelado_em" TIMESTAMPTZ,
    "motivo_cancelamento" TEXT,
    "cancelado_por_id" UUID,
    "agendamento_origem_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agendamento_id" UUID NOT NULL,
    "status_anterior" "status_agendamento",
    "status_novo" "status_agendamento" NOT NULL,
    "em" TIMESTAMPTZ NOT NULL,
    "responsavel_id" UUID NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique)
CREATE UNIQUE INDEX "slots_disponibilidade_id_inicio_key" ON "slots"("disponibilidade_id", "inicio");

-- CreateIndex
CREATE INDEX "agendamentos_profissional_id_inicio_idx" ON "agendamentos"("profissional_id", "inicio");

-- CreateIndex
CREATE INDEX "agendamentos_paciente_id_idx" ON "agendamentos"("paciente_id");

-- CreateIndex
CREATE INDEX "agendamentos_status_idx" ON "agendamentos"("status");

-- CreateIndex
CREATE INDEX "agendamentos_clinica_id_idx" ON "agendamentos"("clinica_id");

-- CreateIndex
CREATE INDEX "historico_status_agendamento_id_idx" ON "historico_status"("agendamento_id");

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_disponibilidade_id_fkey" FOREIGN KEY ("disponibilidade_id") REFERENCES "disponibilidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamentos" ADD CONSTRAINT "agendamentos_agendamento_origem_id_fkey" FOREIGN KEY ("agendamento_origem_id") REFERENCES "agendamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "agendamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
