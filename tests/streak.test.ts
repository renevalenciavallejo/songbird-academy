import { describe, expect, it } from 'vitest';
import { dayKey, daysBetween, displayStreak, EMPTY_STREAK, playedToday, recordPlay } from '../src/core/streak';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);

describe('racha', () => {
  it('el primer juego inicia la racha en 1', () => {
    expect(recordPlay(EMPTY_STREAK, at(2026, 3, 10))).toEqual({ current: 1, best: 1, lastDay: '2026-03-10' });
  });

  it('jugar varias veces el mismo día no suma', () => {
    const s = recordPlay(EMPTY_STREAK, at(2026, 3, 10, 8));
    expect(recordPlay(s, at(2026, 3, 10, 22))).toEqual(s);
  });

  it('días consecutivos suman, incluido el cruce de medianoche', () => {
    let s = recordPlay(EMPTY_STREAK, at(2026, 3, 10, 23, 59));
    s = recordPlay(s, at(2026, 3, 11, 0, 1));
    expect(s.current).toBe(2);
  });

  it('saltarse un día reinicia la racha pero conserva la mejor', () => {
    let s = recordPlay(EMPTY_STREAK, at(2026, 3, 10));
    s = recordPlay(s, at(2026, 3, 11));
    s = recordPlay(s, at(2026, 3, 12));
    s = recordPlay(s, at(2026, 3, 14));
    expect(s).toMatchObject({ current: 1, best: 3 });
  });

  it('cruza fin de mes y de año', () => {
    let s = recordPlay(EMPTY_STREAK, at(2026, 12, 31));
    s = recordPlay(s, at(2027, 1, 1));
    expect(s.current).toBe(2);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2); // año bisiesto
    expect(daysBetween('2027-02-28', '2027-03-01')).toBe(1);
  });

  it('daysBetween no se afecta por cambios de horario (DST)', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('si el reloj retrocede no se modifica la racha', () => {
    const s = recordPlay(EMPTY_STREAK, at(2026, 3, 10));
    expect(recordPlay(s, at(2026, 3, 8))).toEqual(s);
  });

  it('la racha mostrada sigue viva hasta el final del día siguiente', () => {
    const s = recordPlay(EMPTY_STREAK, at(2026, 3, 10));
    expect(displayStreak(s, at(2026, 3, 10))).toBe(1);
    expect(displayStreak(s, at(2026, 3, 11, 23, 59))).toBe(1);
    expect(displayStreak(s, at(2026, 3, 12, 0, 0))).toBe(0);
    expect(displayStreak(EMPTY_STREAK, at(2026, 3, 12))).toBe(0);
  });

  it('dayKey usa la fecha local con ceros a la izquierda', () => {
    expect(dayKey(at(2026, 1, 5, 0, 0))).toBe('2026-01-05');
    expect(playedToday(recordPlay(EMPTY_STREAK, at(2026, 1, 5)), at(2026, 1, 5, 23))).toBe(true);
  });
});
