export const XP_PER_CORRECT = 10;
/** Bonus por terminar una lección sin errores (preguntas saltadas no cuentan como error). */
export const XP_PERFECT_BONUS = 20;

export function lessonXp(correct: number, wrong: number): number {
  const base = correct * XP_PER_CORRECT;
  return correct > 0 && wrong === 0 ? base + XP_PERFECT_BONUS : base;
}
