import { applyAnswer, type LeitnerState } from '../core/leitner';
import { EMPTY_STREAK, recordPlay, type StreakState } from '../core/streak';
import { XP_PER_CORRECT } from '../core/xp';
import type { Store } from './storage';

export const PROGRESS_KEY = 'songbird.progress.v1';

export interface Progress {
  xp: number;
  lessonsCompleted: number;
  streak: StreakState;
  leitner: LeitnerState;
}

export function emptyProgress(): Progress {
  return { xp: 0, lessonsCompleted: 0, streak: { ...EMPTY_STREAK }, leitner: {} };
}

/** Lee el progreso validando la forma básica; datos corruptos → progreso vacío. */
export function loadProgress(store: Store): Progress {
  const raw = store.read<Partial<Progress> | null>(PROGRESS_KEY, null);
  if (!raw || typeof raw !== 'object') return emptyProgress();
  const base = emptyProgress();
  return {
    xp: Number.isFinite(raw.xp) ? Number(raw.xp) : base.xp,
    lessonsCompleted: Number.isFinite(raw.lessonsCompleted) ? Number(raw.lessonsCompleted) : 0,
    streak: raw.streak && typeof raw.streak === 'object' ? { ...base.streak, ...raw.streak } : base.streak,
    leitner: raw.leitner && typeof raw.leitner === 'object' ? raw.leitner : {},
  };
}

export function saveProgress(store: Store, progress: Progress): void {
  store.write(PROGRESS_KEY, progress);
}

/** Registra una respuesta: actualiza la caja Leitner y suma XP si acertó. */
export function recordAnswer(progress: Progress, speciesId: string, correct: boolean): Progress {
  return {
    ...progress,
    xp: progress.xp + (correct ? XP_PER_CORRECT : 0),
    leitner: {
      ...progress.leitner,
      [speciesId]: applyAnswer(progress.leitner[speciesId], correct, progress.lessonsCompleted),
    },
  };
}

/** Cierra la lección: suma bonus, avanza el contador y actualiza la racha. */
export function completeLesson(progress: Progress, bonusXp: number, now: Date): Progress {
  return {
    ...progress,
    xp: progress.xp + bonusXp,
    lessonsCompleted: progress.lessonsCompleted + 1,
    streak: recordPlay(progress.streak, now),
  };
}
