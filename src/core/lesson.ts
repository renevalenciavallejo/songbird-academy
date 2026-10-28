import type { Recording, Species } from '../types';
import { pickDistractors } from './distractors';
import { isDue, overdueBy, type LeitnerState } from './leitner';
import { pickOne, shuffle, type Rng } from './random';

export const LESSON_SIZE = 10;
export const MAX_NEW_PER_LESSON = 4;
export const OPTIONS_PER_QUESTION = 4;

export interface Question {
  species: Species;
  recording: Recording;
  /** Opciones barajadas; incluyen exactamente una vez a `species`. */
  options: Species[];
}

export interface LessonPlanOptions {
  size?: number;
  maxNew?: number;
}

/**
 * Decide qué especies entran en la lección, en este orden de prioridad:
 * 1. Repasos vencidos (las de caja más baja y más atrasadas primero).
 * 2. Hasta `maxNew` especies nuevas, en el orden del catálogo.
 * 3. Si aún faltan: especies vistas no vencidas (caja baja primero), luego más nuevas.
 * 4. Si el catálogo tiene menos especies que `size`, se repiten especies.
 */
export function selectLessonSpecies(
  species: readonly Species[],
  leitner: LeitnerState,
  lessonIndex: number,
  rng: Rng,
  { size = LESSON_SIZE, maxNew = MAX_NEW_PER_LESSON }: LessonPlanOptions = {},
): Species[] {
  const playable = species.filter((s) => s.recordings.length > 0);
  if (playable.length === 0) return [];

  const seen = playable.filter((s) => leitner[s.id]);
  const fresh = playable.filter((s) => !leitner[s.id]);
  const byPriority = (a: Species, b: Species) => {
    const ca = leitner[a.id];
    const cb = leitner[b.id];
    return (
      ca.box - cb.box ||
      overdueBy(cb, lessonIndex) - overdueBy(ca, lessonIndex) ||
      ca.lastLesson - cb.lastLesson
    );
  };
  // Barajamos antes de ordenar para que los empates no salgan siempre igual.
  const due = shuffle(seen.filter((s) => isDue(leitner[s.id], lessonIndex)), rng).sort(byPriority);
  const notDue = shuffle(seen.filter((s) => !isDue(leitner[s.id], lessonIndex)), rng).sort(byPriority);

  const newCount = Math.min(maxNew, fresh.length, size);
  const reviewSlots = size - newCount;
  const chosen: Species[] = [...due.slice(0, reviewSlots), ...fresh.slice(0, newCount)];

  for (const s of [...notDue, ...fresh.slice(newCount), ...due.slice(reviewSlots)]) {
    if (chosen.length >= size) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  // Catálogo pequeño: repetir especies hasta completar la lección.
  const base = [...chosen];
  while (chosen.length < size) chosen.push(base[chosen.length % base.length]);

  return shuffleAvoidingAdjacent(chosen, rng);
}

/** Baraja intentando que la misma especie no salga dos veces seguidas. */
function shuffleAvoidingAdjacent(items: Species[], rng: Rng): Species[] {
  let best = shuffle(items, rng);
  for (let attempt = 0; attempt < 20 && hasAdjacentRepeat(best); attempt++) best = shuffle(items, rng);
  return best;
}

function hasAdjacentRepeat(items: Species[]): boolean {
  return items.some((s, i) => i > 0 && items[i - 1].id === s.id);
}

/** Arma las preguntas: una grabación al azar y 4 opciones únicas por especie. */
export function buildLesson(
  species: readonly Species[],
  leitner: LeitnerState,
  lessonIndex: number,
  rng: Rng,
  options: LessonPlanOptions = {},
): Question[] {
  const playable = species.filter((s) => s.recordings.length > 0);
  const usedRecordings = new Set<string>();

  return selectLessonSpecies(playable, leitner, lessonIndex, rng, options).map((target) => {
    // Si la especie se repite en la lección, preferimos otra grabación.
    const unused = target.recordings.filter((r) => !usedRecordings.has(r.xcId));
    const recording = pickOne(unused.length ? unused : target.recordings, rng);
    usedRecordings.add(recording.xcId);
    const distractors = pickDistractors(target, playable, rng, OPTIONS_PER_QUESTION - 1);
    return { species: target, recording, options: shuffle([target, ...distractors], rng) };
  });
}
