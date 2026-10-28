// Funciones puras del pipeline de catálogo (sin red ni disco) para poder probarlas.

export const MIN_RECORDINGS = 3;
export const MAX_RECORDINGS = 5;

/** Recuadro Valle del Cauca + Cauca: lat_min, lon_min, lat_max, lon_max. */
export const REGION_BOX = '0.9,-78.0,5.1,-75.6';

/** Convierte URLs que empiezan por `//` (protocol-relative) en `https://`. */
export function normalizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice('http://'.length)}`;
  return trimmed;
}

/**
 * Consultas a Xeno-canto por nivel de prioridad: región → Colombia → global.
 * `name` es el nombre científico tal como lo conoce Xeno-canto.
 */
export function buildQueries(name) {
  const [gen, ...rest] = name.trim().split(/\s+/);
  const base = `gen:${gen} sp:${rest.join(' ')} q:">C" len:"<60"`;
  return [
    { tier: 'region', query: `${base} box:${REGION_BOX}` },
    { tier: 'colombia', query: `${base} cnt:colombia` },
    { tier: 'global', query: base },
  ];
}

/** Clasifica el campo `type` de Xeno-canto (texto libre) en song / call / other. */
export function soundCategory(type) {
  const t = String(type ?? '').toLowerCase();
  if (t.includes('song')) return 'song';
  if (t.includes('call')) return 'call';
  return 'other';
}

/** Formato del audio según la extensión de `file-name` (p. ej. "mp3", "wav"). */
export function audioFormat(rec) {
  const m = /\.([a-z0-9]+)$/i.exec(String(rec?.['file-name'] ?? ''));
  return m ? m[1].toLowerCase() : '';
}

const QUALITY_RANK = { A: 0, B: 1, C: 2, D: 3, E: 4 };
const TIER_RANK = { region: 0, colombia: 1, global: 2 };

// Orden de preferencia: región > formato MP3 (los WAV pesan varios MB en el
// celular) > calidad > id. Dentro de la misma zona, un MP3 de calidad B gana a
// un WAV de calidad A; los WAV solo entran si no hay suficientes MP3.
function rankOf(rec) {
  return [TIER_RANK[rec.tier] ?? 9, audioFormat(rec) === 'mp3' ? 0 : 1, QUALITY_RANK[rec.q] ?? 9];
}

function compareRecs(a, b) {
  const ra = rankOf(a);
  const rb = rankOf(b);
  return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2] || Number(a.id) - Number(b.id);
}

/** Grabaciones con identificación dudosa: nunca entran al catálogo. */
export function isUsable(rec) {
  return !/uncertain/i.test(String(rec?.type ?? ''));
}

/** Canto o llamado: lo que sirve para un quiz de identificación por sonido. */
export function isVocal(rec) {
  return isUsable(rec) && soundCategory(rec.type) !== 'other';
}

/**
 * Elige hasta `max` grabaciones: primero por región, luego MP3 antes que WAV,
 * luego calidad (A > B),
 * con al menos un canto y un llamado si existen. Las grabaciones sin tipo o de
 * otros sonidos (alas, tamborileo...) solo se usan si no hay MIN_RECORDINGS
 * vocales; las marcadas como "uncertain" se descartan siempre.
 * Cada grabación de entrada debe traer `tier` (region|colombia|global).
 */
export function selectRecordings(recs, max = MAX_RECORDINGS) {
  const seen = new Set();
  const sorted = recs
    .filter((r) => r && r.id && r.file && isUsable(r) && !seen.has(r.id) && seen.add(r.id))
    .sort(compareRecs);
  const vocal = sorted.filter(isVocal);

  const picked = [];
  // Primera pasada: la mejor grabación de canto y la mejor de llamado.
  for (const category of ['song', 'call']) {
    const best = vocal.find((r) => soundCategory(r.type) === category);
    if (best && picked.length < max) picked.push(best);
  }
  // Segunda pasada: completar con las mejores vocales restantes.
  for (const r of vocal) {
    if (picked.length >= max) break;
    if (!picked.includes(r)) picked.push(r);
  }
  // Último recurso: otros sonidos, solo hasta alcanzar el mínimo.
  for (const r of sorted) {
    if (picked.length >= Math.min(max, MIN_RECORDINGS)) break;
    if (!picked.includes(r)) picked.push(r);
  }
  return picked.sort(compareRecs);
}

/**
 * Junta los resultados por nivel según la regla: si la región tiene menos de
 * MIN_RECORDINGS grabaciones vocales (canto/llamado), se amplía a Colombia; si
 * aún no alcanza, a todo el mundo.
 * `fetchTier(tier)` devuelve las grabaciones de ese nivel.
 */
export async function collectByTier(queries, fetchTier) {
  const pool = [];
  const ids = new Set();
  for (const { tier, query } of queries) {
    const recs = await fetchTier(query);
    for (const r of recs) {
      if (!ids.has(r.id)) {
        ids.add(r.id);
        pool.push({ ...r, tier });
      }
    }
    if (pool.filter(isVocal).length >= MIN_RECORDINGS) break;
  }
  return pool;
}

/** Convierte una grabación de la API v3 al formato del catálogo. */
export function toCatalogRecording(rec) {
  const xcId = String(rec.id);
  return {
    xcId,
    audioUrl: normalizeUrl(rec.file),
    xcUrl: normalizeUrl(rec.url) || `https://xeno-canto.org/${xcId}`,
    type: rec.type ?? '',
    quality: rec.q ?? '',
    locality: rec.loc ?? '',
    country: rec.cnt ?? '',
    rec: rec.rec ?? '',
    lic: normalizeUrl(rec.lic),
  };
}
