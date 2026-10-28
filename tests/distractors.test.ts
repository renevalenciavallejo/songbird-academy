import { describe, expect, it } from 'vitest';
import { pickDistractors } from '../src/core/distractors';
import { seededRng } from '../src/core/random';
import { catalogFixture, sp } from './fixtures';

describe('distractores', () => {
  it('devuelve 3 especies distintas que no incluyen la correcta', () => {
    const all = catalogFixture();
    for (let seed = 0; seed < 50; seed++) {
      const target = all[seed % all.length];
      const d = pickDistractors(target, all, seededRng(seed));
      expect(d).toHaveLength(3);
      expect(new Set(d.map((s) => s.id)).size).toBe(3);
      expect(d.some((s) => s.id === target.id)).toBe(false);
    }
  });

  it('prioriza especies de la misma familia', () => {
    const all = [sp('a', 'F1'), sp('b', 'F1'), sp('c', 'F1'), sp('d', 'F1'), sp('x', 'F2'), sp('y', 'F3')];
    const d = pickDistractors(all[0], all, seededRng(1));
    expect(d.every((s) => s.family === 'F1')).toBe(true);
  });

  it('completa con otras familias cuando la familia no alcanza', () => {
    const all = [sp('a', 'F1'), sp('b', 'F1'), sp('x', 'F2'), sp('y', 'F3'), sp('z', 'F4')];
    const d = pickDistractors(all[0], all, seededRng(2));
    expect(d[0].id).toBe('b');
    expect(d).toHaveLength(3);
  });

  it('ignora duplicados en la lista de especies', () => {
    const a = sp('a');
    const b = sp('b');
    const d = pickDistractors(a, [a, b, b, b, a], seededRng(3));
    expect(d.map((s) => s.id)).toEqual(['b']);
  });
});
