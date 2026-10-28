import { speciesLabel } from '../components/species-name';
import type { AppContext, QuestionResult, Screen } from '../context';
import { h, icon, ICONS } from '../dom';

export function summaryScreen(ctx: AppContext): Screen {
  const { t, tn } = ctx.i18n;
  const lang = ctx.i18n.lang;
  const s = ctx.summary!;
  const correct = s.results.filter((r) => r === 'correct').length;
  const skipped = s.results.filter((r) => r === 'skipped').length;
  const answered = s.results.length - skipped;
  const ratio = answered ? correct / answered : 0;
  const message = ratio === 1 && answered > 0 ? t('summary.msgPerfect') : ratio >= 0.6 ? t('summary.msgGood') : t('summary.msgKeep');

  const resultLabel: Record<QuestionResult, string> = {
    correct: t('summary.resultCorrect'),
    wrong: t('summary.resultWrong'),
    skipped: t('summary.resultSkipped'),
  };

  const el = h(
    'section',
    { class: 'screen summary' },
    h('h1', { tabindex: '-1' }, t('summary.title')),
    h('p', { class: 'summary-message' }, message),
    h(
      'div',
      { class: 'stats' },
      h('div', { class: 'stat stat-score' }, icon(ICONS.check, 26), h('span', { class: 'stat-value' }, `${correct}/${answered}`), h('span', { class: 'stat-label' }, t('summary.score', { correct, total: answered }))),
      h('div', { class: 'stat stat-xp' }, icon(ICONS.star, 26), h('span', { class: 'stat-value' }, `+${s.xp}`), h('span', { class: 'stat-label' }, t('summary.xpEarned'))),
      h('div', { class: 'stat stat-streak' }, icon(ICONS.flame, 26), h('span', { class: 'stat-value' }, tn('home.days', s.streak)), h('span', { class: 'stat-label' }, t('summary.streak'))),
    ),
    s.bonus > 0 && h('p', { class: 'muted small center' }, t('summary.perfectBonus', { n: s.bonus })),
    skipped > 0 && h('p', { class: 'muted small center' }, tn('summary.skipped', skipped)),
    h('h2', {}, t('summary.review')),
    h(
      'ol',
      { class: 'review-list' },
      s.questions.map((q, i) => {
        const r = s.results[i] ?? 'skipped';
        return h(
          'li',
          { class: `review-item is-${r}` },
          h('span', { class: 'review-icon' }, r === 'correct' ? icon(ICONS.check, 20) : r === 'wrong' ? icon(ICONS.cross, 20) : '–'),
          speciesLabel(q.species, lang),
          h('span', { class: 'visually-hidden' }, resultLabel[r]),
        );
      }),
    ),
    h(
      'div',
      { class: 'button-row stack-mobile' },
      h('button', { type: 'button', class: 'btn btn-primary btn-lg', onclick: ctx.startLesson }, t('summary.again')),
      h('a', { class: 'btn btn-secondary btn-lg', href: '#/' }, t('summary.home')),
    ),
  );
  return { el };
}
