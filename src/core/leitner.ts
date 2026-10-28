// Sistema Leitner de 5 cajas por especie, programado por número de lección.
// Caja 1 = se repasa en cada lección; caja 5 = cada 16 lecciones.

export const MIN_BOX = 1;
export const MAX_BOX = 5;

/** Lecciones que deben pasar antes de repasar una especie según su caja. */
export const BOX_INTERVALS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

export interface LeitnerCard {
  box: number;
  /** Índice de la última lección (0-based) en la que apareció la especie. */
  lastLesson: number;
  correct: number;
  wrong: number;
}

export type LeitnerState = Record<string, LeitnerCard>;

/** Aplica una respuesta: acierto sube una caja; error vuelve a la caja 1. */
export function applyAnswer(card: LeitnerCard | undefined, correct: boolean, lessonIndex: number): LeitnerCard {
  // Una especie nueva parte de la caja 1: si acierta a la primera pasa a la 2.
  const prevBox = card?.box ?? MIN_BOX;
  const box = correct ? Math.min(MAX_BOX, prevBox + 1) : MIN_BOX;
  return {
    box,
    lastLesson: lessonIndex,
    correct: (card?.correct ?? 0) + (correct ? 1 : 0),
    wrong: (card?.wrong ?? 0) + (correct ? 0 : 1),
  };
}

export function isDue(card: LeitnerCard, lessonIndex: number): boolean {
  return lessonIndex - card.lastLesson >= BOX_INTERVALS[card.box];
}

/** Cuántas lecciones de retraso lleva una tarjeta respecto a su intervalo (0 si no está vencida). */
export function overdueBy(card: LeitnerCard, lessonIndex: number): number {
  return Math.max(0, lessonIndex - card.lastLesson - BOX_INTERVALS[card.box]);
}

/** Nivel de dominio para la UI: 0 = nueva, 1..5 = caja actual. */
export function masteryLevel(card: LeitnerCard | undefined): number {
  return card?.box ?? 0;
}
