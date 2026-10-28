import './styles.css';
import { buildLesson } from './core/lesson';
import { displayStreak } from './core/streak';
import { XP_PERFECT_BONUS, XP_PER_CORRECT } from './core/xp';
import { createI18n } from './i18n';
import { completeLesson, loadProgress, saveProgress } from './state/progress';
import { createStore } from './state/storage';
import type { Catalog } from './types';
import { header } from './ui/components/header';
import { ROUTES, type AppContext, type Route, type Screen } from './ui/context';
import { h } from './ui/dom';
import { aboutScreen } from './ui/screens/about';
import { homeScreen } from './ui/screens/home';
import { lessonScreen } from './ui/screens/lesson';
import { progressScreen } from './ui/screens/progress';
import { summaryScreen } from './ui/screens/summary';

const screens: Record<Route, (ctx: AppContext) => Screen> = {
  home: homeScreen,
  lesson: lessonScreen,
  summary: summaryScreen,
  progress: progressScreen,
  about: aboutScreen,
};

const store = createStore();
const i18n = createI18n(store, navigator.language);
const root = document.getElementById('app')!;
let current: Screen | null = null;
let lastRoute: Route | null = null;

const ctx: AppContext = {
  i18n,
  store,
  progress: loadProgress(store),
  catalog: { status: 'loading' },
  session: null,
  summary: null,

  updateProgress(next) {
    ctx.progress = next;
    saveProgress(store, next);
  },

  navigate(route) {
    const hash = route === 'home' ? '#/' : `#/${route}`;
    if (location.hash === hash) render();
    else location.hash = hash;
  },

  rerender: () => render(),
  reloadCatalog: () => void loadCatalog(),

  startLesson() {
    ctx.session = null;
    ctx.navigate('lesson');
  },

  finishLesson() {
    const s = ctx.session;
    if (!s) return;
    const correct = s.results.filter((r) => r === 'correct').length;
    const wrong = s.results.filter((r) => r === 'wrong').length;
    const bonus = correct > 0 && wrong === 0 ? XP_PERFECT_BONUS : 0;
    // Solo cuenta como día jugado si respondió al menos una pregunta.
    if (correct + wrong > 0) ctx.updateProgress(completeLesson(ctx.progress, bonus, new Date()));
    ctx.summary = {
      questions: s.questions,
      results: s.results,
      xp: correct * XP_PER_CORRECT + bonus,
      bonus,
      streak: displayStreak(ctx.progress.streak, new Date()),
    };
    ctx.session = null;
    ctx.navigate('summary');
  },
};

function routeFromHash(): Route {
  const name = location.hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(name) ? name : 'home';
}

function resolveRoute(route: Route): Route {
  if (route === 'lesson') {
    if (ctx.catalog.status !== 'ready') return 'home';
    if (!ctx.session) {
      const questions = buildLesson(ctx.catalog.catalog.species, ctx.progress.leitner, ctx.progress.lessonsCompleted, Math.random);
      if (questions.length === 0) return 'home';
      ctx.session = { questions, index: 0, results: [], chosen: [], xp: 0 };
    }
  }
  if (route === 'summary' && !ctx.summary) return 'home';
  return route;
}

function render(focus: 'heading' | 'lang' = 'heading') {
  current?.cleanup?.();
  const requested = routeFromHash();
  const route = resolveRoute(requested);
  if (route !== requested) history.replaceState(null, '', route === 'home' ? '#/' : `#/${route}`);

  document.documentElement.lang = i18n.lang;
  document.title = route === 'home' ? i18n.t('app.name') : `${pageTitle(route)} · ${i18n.t('app.name')}`;

  current = screens[route](ctx);
  root.replaceChildren(
    h('a', { class: 'skip-link', href: '#main', onclick: (e: Event) => (e.preventDefault(), document.getElementById('main')?.focus()) }, i18n.t('app.skipToContent')),
    header(ctx, route),
    h('main', { id: 'main', class: `main route-${route}`, tabindex: '-1' }, current.el),
  );

  // Gestión de foco para teclado y lectores de pantalla.
  if (focus === 'lang') {
    root.querySelector<HTMLElement>(`[data-lang="${i18n.lang}"]`)?.focus();
  } else if (lastRoute !== null) {
    root.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: false });
    window.scrollTo(0, 0);
  }
  lastRoute = route;
}

function pageTitle(route: Route): string {
  switch (route) {
    case 'lesson':
      return i18n.t('lesson.title');
    case 'summary':
      return i18n.t('summary.title');
    case 'progress':
      return i18n.t('progress.title');
    case 'about':
      return i18n.t('about.title');
    default:
      return i18n.t('app.name');
  }
}

function isCatalog(data: unknown): data is Catalog {
  return !!data && typeof data === 'object' && Array.isArray((data as Catalog).species);
}

async function loadCatalog() {
  ctx.catalog = { status: 'loading' };
  if (lastRoute) render();
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/catalog.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!isCatalog(data)) throw new Error('Invalid catalog');
    const species = data.species
      .map((s) => ({ ...s, recordings: (s.recordings ?? []).filter((r) => r.audioUrl?.startsWith('https://')) }))
      .filter((s) => s.recordings.length > 0);
    ctx.catalog = { status: 'ready', catalog: { ...data, species } };
  } catch (err) {
    console.error('No se pudo cargar el catálogo', err);
    ctx.catalog = { status: 'error' };
  }
  render();
}

i18n.onChange(() => render('lang'));
window.addEventListener('hashchange', () => render());
render();
void loadCatalog();
