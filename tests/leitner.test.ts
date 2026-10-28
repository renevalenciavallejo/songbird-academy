import { describe, expect, it } from 'vitest';
import { applyAnswer, BOX_INTERVALS, isDue, masteryLevel, MAX_BOX } from '../src/core/leitner';

describe('leitner', () => {
  it('una especie nueva acertada pasa de la caja 1 a la 2', () => {
    const first = applyAnswer(undefined, true, 0);
    expect(first.box).toBe(2);
    expect(applyAnswer(first, true, 1).box).toBe(3);
  });

  it('una especie nueva fallada entra en la caja 1', () => {
    expect(applyAnswer(undefined, false, 0)).toMatchObject({ box: 1, wrong: 1, correct: 0 });
  });

  it('un error devuelve cualquier caja a la 1', () => {
    expect(applyAnswer({ box: 4, lastLesson: 0, correct: 5, wrong: 0 }, false, 3).box).toBe(1);
  });

  it('no supera la caja máxima', () => {
    expect(applyAnswer({ box: MAX_BOX, lastLesson: 0, correct: 9, wrong: 0 }, true, 1).box).toBe(MAX_BOX);
  });

  it('registra la lección y los contadores', () => {
    const c = applyAnswer({ box: 2, lastLesson: 1, correct: 1, wrong: 1 }, true, 7);
    expect(c).toEqual({ box: 3, lastLesson: 7, correct: 2, wrong: 1 });
  });

  it('cajas más altas se repasan con menos frecuencia', () => {
    for (let box = 1; box <= MAX_BOX; box++) {
      const card = { box, lastLesson: 10, correct: 0, wrong: 0 };
      expect(isDue(card, 10 + BOX_INTERVALS[box] - 1)).toBe(false);
      expect(isDue(card, 10 + BOX_INTERVALS[box])).toBe(true);
    }
    expect(BOX_INTERVALS[1]).toBeLessThan(BOX_INTERVALS[5]);
  });

  it('una especie fallada vuelve en la siguiente lección', () => {
    const card = applyAnswer({ box: 5, lastLesson: 0, correct: 4, wrong: 0 }, false, 20);
    expect(isDue(card, 21)).toBe(true);
  });

  it('masteryLevel es 0 para especies nuevas', () => {
    expect(masteryLevel(undefined)).toBe(0);
    expect(masteryLevel({ box: 3, lastLesson: 0, correct: 0, wrong: 0 })).toBe(3);
  });
});
