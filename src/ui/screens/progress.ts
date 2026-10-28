import { masteryLevel, MAX_BOX } from '../../core/leitner';
import type { MessageKey } from '../../i18n';
import { emptyProgress } from '../../state/progress';
import { speciesLabel } from '../components/species-name';
import { speciesName, type AppContext, type Screen } from '../context';
import { h } from '../dom';

export function progressScreen(ctx: AppContext): Screen {
  const { t } = ctx.i18n;
  const lang = ctx.i18n.lang;
  const species = ctx.catalog.status === 'ready' ? ctx.catalog.catalog.species : [];
  const { leitner } = ctx.progress;

  const rows = species
    .map((s) => ({ s, card: leitner[s.id], level: masteryLevel(leitner[s.id]) }))
    .sort((a, b) => b.level - a.level || speciesName(a.s, lang).localeCompare(speciesName(b.s, lang), lang));
  const seen = rows.filter((r) => r.card).length;
  const mastered = rows.filter((r) => r.level === MAX_BOX).length;

  const status = h('p', { class: 'toast', role: 'status', 'aria-live': 'polite' });

  const dialog = h(
    'dialog',
    { class: 'dialog', 'aria-labelledby': 'reset-title' },
    h(
      'form',
      { method: 'dialog' },
      h('h2', { id: 'reset-title' }, t('progress.resetTitle')),
      h('p', {}, t('progress.resetBody')),
      h(
        'div',
        { class: 'button-row' },
        h('button', { class: 'btn btn-secondary', value: 'cancel', autofocus: true }, t('progress.resetCancel')),
        h('button', { class: 'btn btn-danger', value: 'confirm' }, t('progress.resetConfirm')),
      ),
    ),
  );
  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'confirm') return;
    ctx.session = null;
    ctx.summary = null;
    ctx.updateProgress(emptyProgress());
    ctx.rerender();
    // Mensaje tras re-render: se busca el nuevo nodo de estado.
    queueMicrotask(() => {
      const toast = document.querySelector('.toast');
      if (toast) toast.textContent = t('progress.resetDone');
    });
  });

  const el = h(
    'section',
    { class: 'screen progress' },
    h('h1', { tabindex: '-1' }, t('progress.title')),
    h('p', { class: 'muted' }, t('progress.intro')),
    !ctx.store.persistent && h('p', { class: 'notice notice-warn' }, t('progress.memoryOnly')),
    h(
      'p',
      { class: 'progress-summary' },
      h('strong', {}, t('progress.seen', { seen, total: species.length })),
      ' · ',
      t('progress.mastered', { n: mastered }),
    ),
    h(
      'ul',
      { class: 'species-list' },
      rows.map(({ s, card, level }) => {
        const label = t(`progress.level${level}` as MessageKey);
        return h(
          'li',
          { class: `species-row level-${level}` },
          h(
            'div',
            { class: 'species-row-main' },
            speciesLabel(s, lang),
            card && h('span', { class: 'muted small' }, t('progress.record', { correct: card.correct, wrong: card.wrong })),
          ),
          h(
            'div',
            { class: 'mastery' },
            h(
              'span',
              { class: 'pips', role: 'img', 'aria-label': t('progress.levelAria', { level, label }) },
              Array.from({ length: MAX_BOX }, (_, n) => h('span', { class: n < level ? 'pip on' : 'pip' })),
            ),
            h('span', { class: 'mastery-label', 'aria-hidden': 'true' }, label),
          ),
        );
      }),
    ),
    h('button', { type: 'button', class: 'btn btn-danger-outline', onclick: () => dialog.showModal() }, t('progress.reset')),
    status,
    dialog,
  );
  return { el };
}
