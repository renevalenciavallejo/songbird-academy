import es from './es.json';
import en from './en.json';
import type { Store } from '../state/storage';

export type Lang = 'es' | 'en';
export type MessageKey = keyof typeof es;

export const LANGS: Lang[] = ['es', 'en'];
export const LANG_KEY = 'songbird.lang';
const dictionaries: Record<Lang, Record<string, string>> = { es, en };

/** Cualquier variante es-* → español; el resto → inglés. */
export function languageFromNavigator(navLang: string | undefined | null): Lang {
  return navLang && /^es(-|$)/i.test(navLang) ? 'es' : 'en';
}

/** La elección guardada tiene prioridad sobre el idioma del navegador. */
export function resolveLanguage(stored: unknown, navLang: string | undefined | null): Lang {
  return stored === 'es' || stored === 'en' ? stored : languageFromNavigator(navLang);
}

export function translate(lang: Lang, key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = dictionaries[lang][key] ?? dictionaries.es[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

/** Plural simple (es/en): usa `<base>_one` si n === 1, si no `<base>_other`. */
export function translatePlural(lang: Lang, base: string, n: number, params: Record<string, string | number> = {}): string {
  const key = `${base}_${n === 1 ? 'one' : 'other'}` as MessageKey;
  return translate(lang, key, { n, ...params });
}

export function messageKeys(lang: Lang): string[] {
  return Object.keys(dictionaries[lang]);
}

/** Estado de idioma de la app, con persistencia y suscriptores. */
export function createI18n(store: Store, navLang: string | undefined | null) {
  let lang = resolveLanguage(store.read<unknown>(LANG_KEY, null), navLang);
  const listeners = new Set<(l: Lang) => void>();
  return {
    get lang() {
      return lang;
    },
    t: (key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params),
    tn: (base: string, n: number, params?: Record<string, string | number>) => translatePlural(lang, base, n, params),
    setLang(next: Lang) {
      if (next === lang) return;
      lang = next;
      store.write(LANG_KEY, next);
      listeners.forEach((fn) => fn(next));
    },
    onChange(fn: (l: Lang) => void) {
      listeners.add(fn);
    },
  };
}

export type I18n = ReturnType<typeof createI18n>;
