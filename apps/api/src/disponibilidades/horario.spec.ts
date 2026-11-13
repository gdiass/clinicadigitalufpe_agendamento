import { describe, expect, it } from 'vitest';
import {
  deColunaDate,
  deColunaTime,
  ehDataValida,
  formatarHora,
  instanteEmRecife,
  paraColunaDate,
  paraColunaTime,
  paraMinutos,
} from './horario';

describe('horario', () => {
  it.each([
    ['00:00', 0],
    ['08:30', 510],
    ['23:59', 1439],
  ])('converte %s em %i minutos e de volta', (hora, minutos) => {
    expect(paraMinutos(hora)).toBe(minutos);
    expect(formatarHora(minutos)).toBe(hora);
  });

  it('monta o instante absoluto no fuso de Recife (UTC-3)', () => {
    expect(instanteEmRecife('2026-10-06', paraMinutos('08:00')).toISOString()).toBe('2026-10-06T11:00:00.000Z');
    expect(instanteEmRecife('2026-10-06', paraMinutos('23:30')).toISOString()).toBe('2026-10-07T02:30:00.000Z');
  });

  it('faz ida e volta das colunas @db.Date e @db.Time sem depender do fuso da máquina', () => {
    expect(deColunaDate(paraColunaDate('2026-10-06'))).toBe('2026-10-06');
    expect(deColunaTime(paraColunaTime('08:00'))).toBe('08:00');
    expect(deColunaTime(paraColunaTime('23:59'))).toBe('23:59');
  });

  it.each([
    ['2026-10-06', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-04-31', false],
    ['2026-00-10', false],
    ['2026-13-01', false],
    ['2026-1-6', false],
    ['06/10/2026', false],
  ])('ehDataValida(%s) = %s', (data, esperado) => {
    expect(ehDataValida(data)).toBe(esperado);
  });
});
