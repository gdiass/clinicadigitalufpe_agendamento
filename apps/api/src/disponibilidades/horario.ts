const MINUTOS_POR_HORA = 60;

const OFFSET_RECIFE = '-03:00';

/** Converte "HH:mm" em minutos desde a meia-noite. */
export function paraMinutos(hora: string): number {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * MINUTOS_POR_HORA + minutos;
}

/** Converte minutos desde a meia-noite em "HH:mm". */
export function formatarHora(minutosDoDia: number): string {
  const horas = Math.floor(minutosDoDia / MINUTOS_POR_HORA);
  const minutos = minutosDoDia % MINUTOS_POR_HORA;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** Valor que o Prisma grava numa coluna `@db.Date` para o dia "AAAA-MM-DD". */
export function paraColunaDate(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}

/** Valor que o Prisma grava numa coluna `@db.Time` para "HH:mm". */
export function paraColunaTime(hora: string): Date {
  return new Date(`1970-01-01T${hora}:00.000Z`);
}

/** Lê uma coluna `@db.Date` como "AAAA-MM-DD". */
export function deColunaDate(valor: Date): string {
  return valor.toISOString().slice(0, 10);
}

/** Lê uma coluna `@db.Time` como "HH:mm". */
export function deColunaTime(valor: Date): string {
  return valor.toISOString().slice(11, 16);
}

/**
 * Instante absoluto de um horário (em minutos) no dia "AAAA-MM-DD" de America/Recife,
 * o mesmo fuso que o seed usa para os slots. Recife não tem horário de verão, então
 * o deslocamento é fixo.
 */
export function instanteEmRecife(data: string, minutosDoDia: number): Date {
  return new Date(`${data}T${formatarHora(minutosDoDia)}:00${OFFSET_RECIFE}`);
}

/** Diz se "AAAA-MM-DD" é uma data que existe no calendário (rejeita 2026-02-30). */
export function ehDataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const valor = paraColunaDate(data);
  return !Number.isNaN(valor.getTime()) && deColunaDate(valor) === data;
}
