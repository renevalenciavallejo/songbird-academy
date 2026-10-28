import { describe, expect, it } from 'vitest';
import { completeLesson, loadProgress, PROGRESS_KEY, recordAnswer, saveProgress, emptyProgress } from '../src/state/progress';
import { createStore, memoryBackend, type KeyValueBackend } from '../src/state/storage';
import { lessonXp, XP_PER_CORRECT, XP_PERFECT_BONUS } from '../src/core/xp';

const broken: KeyValueBackend = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceeded'); },
  removeItem: () => { throw new Error('SecurityError'); },
};

describe('almacenamiento', () => {
  it('persiste y lee JSON', () => {
    const backend = memoryBackend();
    createStore(backend).write('k', { a: 1 });
    expect(createStore(backend).read('k', null)).toEqual({ a: 1 });
  });

  it('funciona en memoria si localStorage lanza errores', () => {
    const store = createStore(broken);
    store.write('k', 5);
    expect(store.read('k', 0)).toBe(5);
    store.remove('k');
    expect(store.read('k', 0)).toBe(0);
  });

  it('funciona sin backend (null)', () => {
    const store = createStore(null);
    expect(store.persistent).toBe(false);
    store.write('k', 'v');
    expect(store.read('k', '')).toBe('v');
  });

  it('JSON corrupto devuelve el valor por defecto', () => {
    const backend = memoryBackend();
    backend.setItem(PROGRESS_KEY, '{oops');
    expect(loadProgress(createStore(backend))).toEqual(emptyProgress());
  });
});

describe('progreso', () => {
  it('suma XP por acierto y actualiza la caja', () => {
    let p = recordAnswer(emptyProgress(), 'x', true);
    expect(p.xp).toBe(XP_PER_CORRECT);
    p = recordAnswer(p, 'x', false);
    expect(p.xp).toBe(XP_PER_CORRECT);
    expect(p.leitner.x).toMatchObject({ box: 1, correct: 1, wrong: 1 });
  });

  it('completar lección avanza contador y racha, y se guarda', () => {
    const store = createStore(memoryBackend());
    const p = completeLesson(emptyProgress(), 20, new Date(2026, 4, 1));
    saveProgress(store, p);
    expect(loadProgress(store)).toMatchObject({ xp: 20, lessonsCompleted: 1, streak: { current: 1 } });
  });

  it('bonus por lección perfecta', () => {
    expect(lessonXp(10, 0)).toBe(10 * XP_PER_CORRECT + XP_PERFECT_BONUS);
    expect(lessonXp(9, 1)).toBe(9 * XP_PER_CORRECT);
    expect(lessonXp(0, 0)).toBe(0);
  });
});
