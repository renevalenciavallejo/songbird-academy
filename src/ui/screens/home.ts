import { displayStreak, playedToday } from '../../core/streak';
import type { AppContext, Screen } from '../context';
import { h, icon, ICONS } from '../dom';

export function homeScreen(ctx: AppContext): Screen {
  const { t, tn } = ctx.i18n;
  const now = new Date();
  const streak = displayStreak(ctx.progress.streak, now);
  const { catalog } = ctx;

  const stat = (iconPath: string, cls: string, label: string, value: string) =>
    h('div', { class: `stat ${cls}` }, icon(iconPath, 26), h('span', { class: 'stat-value' }, value), h('span', { class: 'stat-label' }, label));

  let action: HTMLElement;
  if (catalog.status === 'loading') {
    action = h('p', { class: 'notice', role: 'status' }, t('catalog.loading'));
  } else if (catalog.status === 'error') {
    action = h(
      'div',
      { class: 'notice notice-error', role: 'alert' },
      h('p', {}, t('catalog.error')),
      h('button', { type: 'button', class: 'btn btn-secondary', onclick: ctx.reloadCatalog }, t('catalog.retry')),
    );
  } else if (catalog.catalog.species.length < 4) {
    action = h('p', { class: 'notice notice-error', role: 'alert' }, t('catalog.empty'));
  } else {
    action = h(
      'div',
      { class: 'start-block' },
      h('button', { type: 'button', class: 'btn btn-primary btn-xl', onclick: ctx.startLesson }, icon(ICONS.play, 22), t('home.start')),
      h('p', { class: 'muted small' }, t('home.speciesCount', { n: catalog.catalog.species.length })),
    );
  }

  const hint =
    ctx.progress.lessonsCompleted === 0
      ? t('home.firstTime')
      : playedToday(ctx.progress.streak, now)
        ? t('home.playedToday')
        : t('home.notPlayedToday');

  const el = h(
    'section',
    { class: 'screen home' },
    h(
      'div',
      { class: 'hero' },
      h('div', { class: 'hero-bird', 'aria-hidden': 'true' }, h('img', { src: `${import.meta.env.BASE_URL}favicon.svg`, alt: '', width: 88, height: 88 }), h('span', { class: 'wave' }), h('span', { class: 'wave wave-2' })),
      h('h1', { tabindex: '-1' }, t('app.name')),
      h('p', { class: 'tagline' }, t('app.tagline')),
    ),
    h(
      'div',
      { class: 'stats' },
      stat(ICONS.flame, 'stat-streak', t('home.streak'), tn('home.days', streak)),
      stat(ICONS.star, 'stat-xp', t('home.xp'), String(ctx.progress.xp)),
      stat(ICONS.book, 'stat-lessons', t('home.lessons'), String(ctx.progress.lessonsCompleted)),
    ),
    h('p', { class: 'hint' }, hint),
    action,
  );
  return { el };
}
