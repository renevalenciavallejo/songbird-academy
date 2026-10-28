import { LANGS } from '../../i18n';
import type { AppContext, Route } from '../context';
import { h } from '../dom';

export function header(ctx: AppContext, route: Route): HTMLElement {
  const { t } = ctx.i18n;
  const link = (target: Route, label: string) =>
    h('a', { href: `#/${target === 'home' ? '' : target}`, 'aria-current': route === target ? 'page' : undefined }, label);

  const langSwitch = h(
    'div',
    { class: 'lang-switch', role: 'group', 'aria-label': t('lang.label') },
    LANGS.map((lang) =>
      h(
        'button',
        {
          type: 'button',
          lang,
          'data-lang': lang,
          'aria-pressed': String(ctx.i18n.lang === lang),
          'aria-label': t(`lang.${lang}`),
          onclick: () => ctx.i18n.setLang(lang),
        },
        lang.toUpperCase(),
      ),
    ),
  );

  return h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'header-row' },
      h(
        'a',
        { class: 'brand', href: '#/' },
        h('img', { src: `${import.meta.env.BASE_URL}favicon.svg`, alt: '', width: 32, height: 32 }),
        h('span', {}, t('app.name')),
      ),
      langSwitch,
    ),
    h(
      'nav',
      { class: 'main-nav', 'aria-label': t('nav.main') },
      link('home', t('nav.home')),
      link('progress', t('nav.progress')),
      link('about', t('nav.about')),
    ),
  );
}
