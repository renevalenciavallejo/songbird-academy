import type { AppContext, Screen } from '../context';
import { h } from '../dom';

export function aboutScreen(ctx: AppContext): Screen {
  const { t } = ctx.i18n;
  const lang = ctx.i18n.lang;
  const catalog = ctx.catalog.status === 'ready' ? ctx.catalog.catalog : null;
  const recordists = catalog
    ? [...new Set(catalog.species.flatMap((s) => s.recordings.map((r) => r.rec)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, lang),
      )
    : [];

  const section = (title: string, ...body: (HTMLElement | false)[]) => h('section', { class: 'card' }, h('h2', {}, title), ...body);

  const el = h(
    'section',
    { class: 'screen about' },
    h('h1', { tabindex: '-1' }, t('about.title')),
    section(t('about.purposeTitle'), h('p', {}, t('about.purpose')), h('p', { class: 'muted small' }, t('about.disclaimer'))),
    section(
      t('about.xcTitle'),
      h('p', {}, t('about.xc')),
      h('p', {}, h('a', { href: 'https://xeno-canto.org', target: '_blank', rel: 'noopener noreferrer' }, t('about.xcLink'))),
    ),
    section(t('about.licenseTitle'), h('p', {}, t('about.license'))),
    recordists.length > 0 &&
      section(
        t('about.recordistsTitle'),
        h('p', {}, t('about.recordists')),
        h('ul', { class: 'recordists' }, recordists.map((name) => h('li', {}, name))),
      ),
    section(t('about.privacyTitle'), h('p', {}, t('about.privacy'))),
    catalog &&
      h(
        'p',
        { class: 'muted small center' },
        t('about.generated', { date: new Date(catalog.generatedAt).toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', { dateStyle: 'long' }) }),
      ),
  );
  return { el };
}
