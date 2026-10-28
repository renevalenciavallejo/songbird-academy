#!/usr/bin/env node
// Genera public/data/catalog.json consultando la API v3 de Xeno-canto.
// Uso: XENO_CANTO_API_KEY=... node scripts/build-catalog.mjs   (o con un archivo .env)
//
// La key solo se usa aquí, en tu máquina. Nunca se escribe en el catálogo.

import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MIN_RECORDINGS,
  buildQueries,
  collectByTier,
  selectRecordings,
  toCatalogRecording,
} from './lib/catalog-utils.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPECIES_FILE = resolve(ROOT, 'data/species.json');
const OUTPUT_FILE = resolve(ROOT, 'public/data/catalog.json');
const API_URL = 'https://xeno-canto.org/api/3/recordings';
const PAUSE_MS = 1200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadApiKey() {
  const envFile = resolve(ROOT, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const key = process.env.XENO_CANTO_API_KEY?.trim();
  if (!key) {
    console.error(
      'Falta XENO_CANTO_API_KEY. Copia .env.example como .env y pon tu key, ' +
        'o expórtala como variable de entorno.',
    );
    process.exit(1);
  }
  return key;
}

/** Una petición a la vez, con pausa previa y un reintento ante errores. */
async function fetchRecordings(query, key) {
  const url = new URL(API_URL);
  url.searchParams.set('query', query);
  url.searchParams.set('key', key);
  url.searchParams.set('per_page', '100');

  for (let attempt = 1; attempt <= 3; attempt++) {
    await sleep(PAUSE_MS * attempt);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!res.ok || body.error) {
        // Errores de consulta (4xx): no tiene sentido reintentar. No imprimimos la URL (lleva la key).
        throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), { fatal: true });
      }
      return body.recordings ?? [];
    } catch (err) {
      if (err.fatal || attempt === 3) {
        console.warn(`  ⚠ Error consultando «${query}»: ${err.message}`);
        return [];
      }
    }
  }
  return [];
}

async function main() {
  const key = loadApiKey();
  const species = JSON.parse(await readFile(SPECIES_FILE, 'utf8'));
  const included = [];
  const excluded = [];

  console.log(`Consultando Xeno-canto para ${species.length} especies...\n`);

  for (const sp of species) {
    let pool = [];
    for (const name of [sp.scientificName, ...(sp.altNames ?? [])]) {
      pool = await collectByTier(buildQueries(name), (q) => fetchRecordings(q, key));
      if (pool.length > 0) break;
    }
    const selected = selectRecordings(pool);
    const tiers = [...new Set(selected.map((r) => r.tier))].join('+') || '-';
    console.log(
      `${selected.length >= MIN_RECORDINGS ? '✓' : '✗'} ${sp.scientificName.padEnd(28)} ` +
        `${String(selected.length).padStart(2)} grabaciones (${tiers})`,
    );

    if (selected.length < MIN_RECORDINGS) {
      excluded.push({ ...sp, count: selected.length });
      continue;
    }
    const { altNames: _alt, ...speciesData } = sp;
    included.push({ ...speciesData, recordings: selected.map(toCatalogRecording) });
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    source: 'https://xeno-canto.org (API v3)',
    species: included,
  };
  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify(catalog, null, 2) + '\n');

  const total = included.reduce((n, s) => n + s.recordings.length, 0);
  console.log(`\nCatálogo: ${included.length} especies, ${total} grabaciones → public/data/catalog.json`);
  if (excluded.length) {
    console.warn(`\n⚠ ${excluded.length} especie(s) excluidas por tener menos de ${MIN_RECORDINGS} grabaciones:`);
    for (const sp of excluded) console.warn(`  - ${sp.scientificName} (${sp.nameEs}): ${sp.count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
