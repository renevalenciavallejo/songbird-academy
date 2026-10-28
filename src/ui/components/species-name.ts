import type { Lang } from '../../i18n';
import type { Species } from '../../types';
import { speciesName } from '../context';
import { h } from '../dom';

/** Nombre común en el idioma activo + nombre científico como dato secundario. */
export function speciesLabel(s: Species, lang: Lang, cls = 'species-label'): HTMLElement {
  return h(
    'span',
    { class: cls },
    h('span', { class: 'common-name' }, speciesName(s, lang)),
    h('span', { class: 'sci-name', lang: 'la' }, s.scientificName),
  );
}
