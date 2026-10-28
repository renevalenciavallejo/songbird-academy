import type { Species } from '../types';
import { shuffle, type Rng } from './random';

/**
 * Elige `count` especies incorrectas para `target`: primero de la misma familia
 * (más difíciles de distinguir) y, si no alcanzan, aleatorias. Nunca repite ni
 * incluye la especie correcta.
 */
export function pickDistractors(target: Species, all: readonly Species[], rng: Rng, count = 3): Species[] {
  const seen = new Set<string>([target.id]);
  const unique = all.filter((s) => !seen.has(s.id) && (seen.add(s.id), true));
  const sameFamily = shuffle(unique.filter((s) => s.family === target.family), rng);
  const others = shuffle(unique.filter((s) => s.family !== target.family), rng);
  return [...sameFamily, ...others].slice(0, count);
}
