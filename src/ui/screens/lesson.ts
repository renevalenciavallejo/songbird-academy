import { licenseLabel } from '../../core/license';
import { XP_PER_CORRECT } from '../../core/xp';
import { recordAnswer } from '../../state/progress';
import { createAudioPlayer } from '../components/audio-player';
import { speciesLabel } from '../components/species-name';
import type { AppContext, Screen } from '../context';
import { h, icon, ICONS } from '../dom';

export function lessonScreen(ctx: AppContext): Screen {
  const { t } = ctx.i18n;
  const lang = ctx.i18n.lang;
  const session = ctx.session!;
  const i = session.index;
  const q = session.questions[i];
  const total = session.questions.length;
  const isLast = i === total - 1;

  const player = createAudioPlayer(ctx.i18n, q.recording, {
    onSkip: () => {
      session.results[i] = 'skipped';
      session.chosen[i] = null;
      advance();
    },
    canSkip: () => session.results[i] === undefined,
  });

  const optionButtons = q.options.map((opt, n) =>
    h(
      'button',
      { type: 'button', class: 'option', 'data-id': opt.id, onclick: () => answer(opt.id) },
      h('span', { class: 'option-key', 'aria-hidden': 'true' }, String(n + 1)),
      speciesLabel(opt, lang),
      h('span', { class: 'option-mark', 'aria-hidden': 'true' }),
    ),
  );
  const feedback = h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });

  function answer(id: string) {
    if (session.results[i] !== undefined) return;
    const correct = id === q.species.id;
    session.results[i] = correct ? 'correct' : 'wrong';
    session.chosen[i] = id;
    if (correct) session.xp += XP_PER_CORRECT;
    ctx.updateProgress(recordAnswer(ctx.progress, q.species.id, correct));
    renderAnswered();
  }

  function advance() {
    if (isLast) ctx.finishLesson();
    else {
      session.index++;
      ctx.rerender();
    }
  }

  function renderAnswered() {
    const result = session.results[i];
    if (result !== 'correct' && result !== 'wrong') return;
    const chosen = session.chosen[i];

    for (const btn of optionButtons) {
      const id = btn.dataset.id;
      const isAnswer = id === q.species.id;
      const isChosen = id === chosen;
      btn.disabled = true;
      btn.classList.toggle('is-correct', isAnswer);
      btn.classList.toggle('is-wrong', isChosen && !isAnswer);
      btn.classList.toggle('is-dim', !isAnswer && !isChosen);
      const mark = btn.querySelector('.option-mark')!;
      mark.replaceChildren(isAnswer ? icon(ICONS.check, 22) : isChosen ? icon(ICONS.cross, 22) : '');
      // Para lectores de pantalla: el color no es la única señal.
      const srText = isAnswer ? t('feedback.correctAnswer') : isChosen ? t('feedback.yourAnswer') : '';
      btn.setAttribute('aria-description', srText);
    }

    const ok = result === 'correct';
    const rec = q.recording;
    const place = [rec.locality, rec.country].filter(Boolean).join(', ');
    const nextBtn = h(
      'button',
      { type: 'button', class: 'btn btn-primary btn-lg', onclick: advance },
      isLast ? t('lesson.finish') : t('lesson.next'),
    );

    feedback.className = `feedback ${ok ? 'feedback-ok' : 'feedback-bad'}`;
    feedback.replaceChildren(
      h(
        'p',
        { class: 'feedback-title' },
        icon(ok ? ICONS.check : ICONS.cross, 26),
        h('span', {}, ok ? t('feedback.correct') : t('feedback.wrong')),
        ok && h('span', { class: 'xp-pill' }, t('feedback.xp', { n: XP_PER_CORRECT })),
      ),
      h('p', { class: 'feedback-answer' }, h('span', { class: 'muted' }, t('feedback.answerWas')), ' ', speciesLabel(q.species, lang, 'species-label inline')),
      h(
        'button',
        { type: 'button', class: 'btn btn-ghost', onclick: () => player.restart() },
        icon(ICONS.replay, 20),
        t('audio.replay'),
      ),
      h(
        'p',
        { class: 'credit' },
        h('span', {}, t('credit.recordedBy', { rec: rec.rec || '—' })),
        place && h('span', {}, ` · ${place}`),
        h('br'),
        rec.lic && h('a', { href: rec.lic, target: '_blank', rel: 'noopener noreferrer' }, `${t('credit.license')}: ${licenseLabel(rec.lic)}`),
        rec.lic && ' · ',
        h('a', { href: rec.xcUrl, target: '_blank', rel: 'noopener noreferrer' }, t('credit.viewOnXc', { id: rec.xcId })),
      ),
      nextBtn,
    );
    nextBtn.focus();
  }

  function onKey(e: KeyboardEvent) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable]')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= optionButtons.length && session.results[i] === undefined) {
      e.preventDefault();
      optionButtons[n - 1].click();
    }
  }
  document.addEventListener('keydown', onKey);

  const quit = () => {
    if (window.confirm(t('lesson.quitConfirm'))) {
      ctx.session = null;
      ctx.navigate('home');
    }
  };

  const pct = Math.round((i / total) * 100);
  const el = h(
    'section',
    { class: 'screen lesson' },
    h(
      'div',
      { class: 'lesson-top' },
      h('button', { type: 'button', class: 'icon-button', 'aria-label': t('lesson.quit'), onclick: quit }, icon(ICONS.close, 22)),
      h(
        'div',
        {
          class: 'progress-track',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': total,
          'aria-valuenow': i,
          'aria-label': t('lesson.progress', { current: i + 1, total }),
        },
        h('div', { class: 'progress-fill', style: `width:${pct}%` }),
      ),
      h('span', { class: 'xp-pill' }, `${session.xp} XP`),
    ),
    h('p', { class: 'muted small counter' }, t('lesson.progress', { current: i + 1, total })),
    h('h1', { class: 'prompt', tabindex: '-1' }, t('lesson.prompt')),
    player.el,
    h('div', { class: 'options', role: 'group', 'aria-label': t('lesson.options') }, optionButtons),
    h('p', { class: 'muted small kbd-hint' }, t('lesson.keyboardHint')),
    feedback,
  );

  // Si se vuelve a renderizar (p. ej. cambio de idioma) con la pregunta ya respondida.
  if (session.results[i] === 'correct' || session.results[i] === 'wrong') queueMicrotask(renderAnswered);

  return {
    el,
    cleanup() {
      document.removeEventListener('keydown', onKey);
      player.destroy();
    },
  };
}
