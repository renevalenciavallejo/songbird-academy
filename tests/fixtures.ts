import type { Recording, Species } from '../src/types';

export function rec(xcId: string, extra: Partial<Recording> = {}): Recording {
  return {
    xcId,
    audioUrl: `https://xeno-canto.org/${xcId}/download`,
    xcUrl: `https://xeno-canto.org/${xcId}`,
    type: 'song',
    quality: 'A',
    locality: 'Cali',
    country: 'Colombia',
    rec: 'Tester',
    lic: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    ...extra,
  };
}

export function sp(id: string, family = 'Fam', nRecs = 3): Species {
  return {
    id,
    scientificName: `Genus ${id}`,
    nameEs: `es-${id}`,
    nameEn: `en-${id}`,
    family,
    recordings: Array.from({ length: nRecs }, (_, i) => rec(`${id}-${i}`)),
  };
}

/** Catálogo de prueba: 12 especies en 4 familias. */
export function catalogFixture(): Species[] {
  const families = ['Tyrannidae', 'Thraupidae', 'Turdidae', 'Columbidae'];
  return Array.from({ length: 12 }, (_, i) => sp(`s${i}`, families[i % 4]));
}
