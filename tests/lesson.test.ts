import { describe, expect, it } from 'vitest';
import { buildLesson, LESSON_SIZE, MAX_NEW_PER_LESSON, selectLessonSpecies } from '../src/core/lesson';
import type { LeitnerState } from '../src/core/leitner';
import { seededRng } from '../src/core/random';
import { catalogFixture, sp } from './fixtures';

const card = (box: number, lastLesson: number) => ({ box, lastLesson, correct: 0, wrong: 0 });

describe('selección de preguntas', () => {
  it('una lección tiene 10 preguntas con 4 opciones únicas que incluyen la correcta', () => {
    const lesson = buildLesson(catalogFixture(), {}, 0, seededRng(42));
    expect(lesson).toHaveLength(LESSON_SIZE);
    for (const q of lesson) {
      const ids = q.options.map((o) => o.id);
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size).toBe(4);
      expect(ids.filter((id) => id === q.species.id)).toHaveLength(1);
      expect(q.species.recordings).toContain(q.recording);
    }
  });

  it('sin progreso, las especies son distintas si el catálogo alcanza', () => {
    const ids = selectLessonSpecies(catalogFixture(), {}, 0, seededRng(1)).map((s) => s.id);
    expect(new Set(ids).size).toBe(LESSON_SIZE);
  });

  it('mezcla repasos vencidos con como máximo 4 especies nuevas', () => {
    const all = catalogFixture();
    const leitner: LeitnerState = {};
    all.slice(0, 8).forEach((s) => (leitner[s.id] = card(1, 4))); // todas vencidas en la lección 5
    const chosen = selectLessonSpecies(all, leitner, 5, seededRng(7));
    const fresh = chosen.filter((s) => !leitner[s.id]);
    expect(fresh.length).toBeLessThanOrEqual(MAX_NEW_PER_LESSON);
    expect(fresh.length).toBeGreaterThan(0);
    expect(chosen.filter((s) => leitner[s.id]).length).toBeGreaterThan(0);
  });

  it('las especies falladas (caja 1) entran antes que las dominadas', () => {
    const all = Array.from({ length: 20 }, (_, i) => sp(`s${i}`));
    const leitner: LeitnerState = {};
    // 10 dominadas vencidas y 4 falladas; sin especies nuevas pendientes salvo 6.
    all.slice(0, 10).forEach((s) => (leitner[s.id] = card(5, 0)));
    all.slice(10, 14).forEach((s) => (leitner[s.id] = card(1, 19)));
    const chosen = selectLessonSpecies(all, leitner, 20, seededRng(3), { maxNew: 4 });
    for (const s of all.slice(10, 14)) expect(chosen).toContain(s);
  });

  it('las especies dominadas y no vencidas solo rellenan si falta', () => {
    const all = Array.from({ length: 30 }, (_, i) => sp(`s${i}`));
    const leitner: LeitnerState = {};
    all.slice(0, 10).forEach((s) => (leitner[s.id] = card(5, 9))); // no vencidas en la lección 10
    all.slice(10, 20).forEach((s) => (leitner[s.id] = card(1, 9))); // vencidas
    const chosen = selectLessonSpecies(all, leitner, 10, seededRng(5));
    expect(chosen.some((s) => leitner[s.id]?.box === 5)).toBe(false);
  });

  it('con un catálogo pequeño repite especies sin repetirlas seguidas', () => {
    const all = [sp('a', 'F1'), sp('b', 'F2'), sp('c', 'F3'), sp('d', 'F4'), sp('e', 'F5')];
    const lesson = buildLesson(all, {}, 0, seededRng(9));
    expect(lesson).toHaveLength(LESSON_SIZE);
    lesson.forEach((q, i) => i > 0 && expect(q.species.id).not.toBe(lesson[i - 1].species.id));
  });

  it('si una especie se repite, usa otra grabación', () => {
    const all = [sp('a', 'F1'), sp('b', 'F2'), sp('c', 'F3'), sp('d', 'F4'), sp('e', 'F5')];
    const lesson = buildLesson(all, {}, 0, seededRng(11));
    const aRecs = lesson.filter((q) => q.species.id === 'a').map((q) => q.recording.xcId);
    expect(new Set(aRecs).size).toBe(aRecs.length);
  });

  it('ignora especies sin grabaciones y devuelve vacío si no hay ninguna', () => {
    expect(buildLesson([sp('a', 'F', 0)], {}, 0, seededRng(1))).toEqual([]);
    const lesson = buildLesson([...catalogFixture(), sp('mute', 'F', 0)], {}, 0, seededRng(1));
    expect(lesson.every((q) => q.species.id !== 'mute' && q.options.every((o) => o.id !== 'mute'))).toBe(true);
  });

  it('es determinista con la misma semilla', () => {
    const ids = (seed: number) => buildLesson(catalogFixture(), {}, 0, seededRng(seed)).map((q) => q.species.id);
    expect(ids(123)).toEqual(ids(123));
  });
});
