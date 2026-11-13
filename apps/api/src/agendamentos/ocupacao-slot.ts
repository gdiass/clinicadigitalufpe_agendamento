import { StatusAgendamento } from '@prisma/client';

export const STATUS_QUE_LIBERAM_SLOT: StatusAgendamento[] = [
  StatusAgendamento.CANCELADO,
  StatusAgendamento.REMARCADO,
];
