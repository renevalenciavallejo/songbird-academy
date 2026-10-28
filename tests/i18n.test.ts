import { describe, expect, it } from 'vitest';
import { createI18n, languageFromNavigator, LANG_KEY, messageKeys, resolveLanguage, translate, translatePlural } from '../src/i18n';
import { createStore, memoryBackend } from '../src/state/storage';

describe('i18n', () => {
  it('detecta español para cualquier variante es-*', () => {
    for (const l of ['es', 'es-CO', 'es-419', 'ES-mx']) expect(languageFromNavigator(l)).toBe('es');
    for (const l of ['en-US', 'pt-BR', 'fr', 'est', '', undefined]) expect(languageFromNavigator(l)).toBe('en');
  });

  it('la elección guardada tiene prioridad', () => {
    expect(resolveLanguage('en', 'es-CO')).toBe('en');
    expect(resolveLanguage('xx', 'es-CO')).toBe('es');
  });

  it('ambos idiomas tienen exactamente las mismas claves y ningún texto vacío', () => {
    expect(messageKeys('en').sort()).toEqual(messageKeys('es').sort());
    for (const k of messageKeys('en')) expect(translate('en', k as never).trim()).not.toBe('');
  });

  it('interpola parámetros y plurales', () => {
    expect(translate('es', 'lesson.progress', { current: 2, total: 10 })).toBe('Pregunta 2 de 10');
    expect(translatePlural('es', 'home.days', 1)).toBe('1 día');
    expect(translatePlural('en', 'home.days', 3)).toBe('3 days');
  });

  it('persiste el cambio de idioma y notifica', () => {
    const backend = memoryBackend();
    const i18n = createI18n(createStore(backend), 'es-CO');
    let notified = '';
    i18n.onChange((l) => (notified = l));
    i18n.setLang('en');
    expect(notified).toBe('en');
    expect(JSON.parse(backend.getItem(LANG_KEY)!)).toBe('en');
    expect(createI18n(createStore(backend), 'es-CO').lang).toBe('en');
  });
});
