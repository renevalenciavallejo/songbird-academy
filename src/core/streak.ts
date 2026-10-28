// Racha de días consecutivos jugados, en la zona horaria local del usuario.

export interface StreakState {
  current: number;
  best: number;
  /** Último día jugado como "YYYY-MM-DD" (hora local), o null si nunca. */
  lastDay: string | null;
}

export const EMPTY_STREAK: StreakState = { current: 0, best: 0, lastDay: null };

/** Clave de día local "YYYY-MM-DD". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Diferencia en días de calendario entre dos claves (b - a). Inmune a cambios de horario (DST). */
export function daysBetween(a: string, b: string): number {
  const toUtc = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Registra que se jugó (terminó una lección) en `now`. */
export function recordPlay(state: StreakState, now: Date): StreakState {
  const today = dayKey(now);
  if (state.lastDay === today) return state;
  const gap = state.lastDay ? daysBetween(state.lastDay, today) : Infinity;
  // gap < 0: el reloj retrocedió; no penalizamos ni sumamos.
  if (gap < 0) return state;
  const current = gap === 1 ? state.current + 1 : 1;
  return { current, best: Math.max(state.best, current), lastDay: today };
}

/** Racha a mostrar hoy: sigue viva si se jugó hoy o ayer; si no, es 0. */
export function displayStreak(state: StreakState, now: Date): number {
  if (!state.lastDay) return 0;
  const gap = daysBetween(state.lastDay, dayKey(now));
  return gap === 0 || gap === 1 ? state.current : 0;
}

export function playedToday(state: StreakState, now: Date): boolean {
  return state.lastDay === dayKey(now);
}
