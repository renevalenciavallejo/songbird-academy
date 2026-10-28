import type { Question } from '../core/lesson';
import type { I18n, Lang } from '../i18n';
import type { Progress } from '../state/progress';
import type { Store } from '../state/storage';
import type { Catalog, Species } from '../types';

export type Route = 'home' | 'lesson' | 'summary' | 'progress' | 'about';
export const ROUTES: Route[] = ['home', 'lesson', 'summary', 'progress', 'about'];

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; catalog: Catalog };

export type QuestionResult = 'correct' | 'wrong' | 'skipped';

export interface LessonSession {
  questions: Question[];
  index: number;
  results: QuestionResult[];
  chosen: (string | null)[];
  xp: number;
}

export interface LessonSummary {
  questions: Question[];
  results: QuestionResult[];
  xp: number;
  bonus: number;
  streak: number;
}

export interface AppContext {
  i18n: I18n;
  store: Store;
  progress: Progress;
  catalog: CatalogState;
  session: LessonSession | null;
  summary: LessonSummary | null;
  updateProgress(next: Progress): void;
  navigate(route: Route): void;
  rerender(): void;
  reloadCatalog(): void;
  startLesson(): void;
  finishLesson(): void;
}

export interface Screen {
  el: HTMLElement;
  cleanup?: () => void;
}

export function speciesName(s: Species, lang: Lang): string {
  return lang === 'es' ? s.nameEs : s.nameEn;
}
