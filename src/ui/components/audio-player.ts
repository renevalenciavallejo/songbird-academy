import type { I18n } from '../../i18n';
import type { Recording } from '../../types';
import { h, icon, ICONS } from '../dom';

type PlayerState = 'idle' | 'loading' | 'playing' | 'error';

/** Tiempo máximo esperando que empiece el audio antes de ofrecer saltar. */
const LOAD_TIMEOUT_MS = 15_000;

export interface AudioPlayer {
  el: HTMLElement;
  restart(): void;
  destroy(): void;
}

export interface AudioPlayerOptions {
  /** Se llama al pulsar "Saltar pregunta" tras un error. */
  onSkip: () => void;
  /** Si es false (pregunta ya respondida) no se ofrece saltar. */
  canSkip: () => boolean;
}

/**
 * Botón grande de reproducir/pausar. Sin autoplay: el audio solo se pide al
 * primer toque (preload="none"), lo que además ahorra datos en el celular.
 */
export function createAudioPlayer(i18n: I18n, recording: Recording, opts: AudioPlayerOptions): AudioPlayer {
  const { t } = i18n;
  const audio = new Audio();
  audio.preload = 'none';
  let state: PlayerState = 'idle';
  let loadTimer: number | undefined;

  const button = h('button', { type: 'button', class: 'play-button', onclick: () => toggle() });
  const status = h('p', { class: 'player-status', role: 'status', 'aria-live': 'polite' });
  const errorBox = h('div', { class: 'player-error', hidden: true });
  const el = h('div', { class: 'player', 'data-state': state }, h('div', { class: 'play-wrap' }, button), status, errorBox);

  function setState(next: PlayerState) {
    state = next;
    el.dataset.state = next;
    const playing = next === 'playing';
    button.replaceChildren(icon(playing ? ICONS.pause : ICONS.play, 44));
    button.setAttribute('aria-label', playing ? t('audio.pause') : t('audio.play'));
    status.textContent = next === 'loading' ? t('audio.loading') : '';
    window.clearTimeout(loadTimer);
    if (next === 'loading') loadTimer = window.setTimeout(() => state === 'loading' && fail(), LOAD_TIMEOUT_MS);
    renderError();
  }

  function renderError() {
    if (state !== 'error') {
      errorBox.hidden = true;
      errorBox.replaceChildren();
      return;
    }
    errorBox.hidden = false;
    errorBox.replaceChildren(
      h('p', { role: 'alert' }, t('audio.error')),
      h(
        'div',
        { class: 'button-row' },
        h('button', { type: 'button', class: 'btn btn-secondary', onclick: retry }, t('audio.retry')),
        opts.canSkip() && h('button', { type: 'button', class: 'btn btn-primary', onclick: opts.onSkip }, t('audio.skip')),
      ),
    );
  }

  function fail() {
    audio.pause();
    setState('error');
  }

  function play() {
    if (!audio.src) audio.src = recording.audioUrl;
    setState('loading');
    audio.play().catch((err: DOMException) => {
      // AbortError: se pausó/cambió la fuente antes de empezar; no es un fallo real.
      if (err?.name !== 'AbortError') fail();
    });
  }

  function toggle() {
    if (state === 'playing' || state === 'loading') {
      audio.pause();
      setState('idle');
    } else {
      play();
    }
  }

  function retry() {
    audio.removeAttribute('src');
    audio.load();
    play();
  }

  audio.addEventListener('playing', () => setState('playing'));
  audio.addEventListener('waiting', () => state === 'playing' && setState('loading'));
  audio.addEventListener('pause', () => state !== 'error' && setState('idle'));
  audio.addEventListener('ended', () => setState('idle'));
  audio.addEventListener('error', () => audio.src && fail());

  setState('idle');

  return {
    el,
    restart() {
      if (state === 'error') return retry();
      audio.currentTime = 0;
      if (state !== 'playing') play();
    },
    destroy() {
      window.clearTimeout(loadTimer);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}
