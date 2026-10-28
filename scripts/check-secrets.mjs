#!/usr/bin/env node
// Verifica que la API key de Xeno-canto no aparezca en el repo ni en el build (dist/).
// Busca (1) el valor real de la key si está en el entorno o en .env y
// (2) patrones sospechosos como `key=<token>` o el nombre de la variable en el bundle.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git']);
const SKIP_FILES = new Set(['.env', 'check-secrets.mjs']);
const TEXT_EXT = /\.(m?js|ts|json|html|css|md|toml|ya?ml|txt|svg|map)$|^\.env\.example$|^\.gitignore$/;

const envFile = resolve(ROOT, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
const key = process.env.XENO_CANTO_API_KEY?.trim();

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || SKIP_FILES.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TEXT_EXT.test(name)) yield full;
  }
}

const problems = [];
let scanned = 0;
for (const file of walk(ROOT)) {
  scanned++;
  const rel = relative(ROOT, file);
  const content = readFileSync(file, 'utf8');
  if (key && key.length >= 8 && content.includes(key)) problems.push(`${rel}: contiene el valor de XENO_CANTO_API_KEY`);
  if (/[?&]key=[A-Za-z0-9_-]{16,}/.test(content)) problems.push(`${rel}: contiene un parámetro key=<token>`);
  if (rel.startsWith('dist') && content.includes('XENO_CANTO_API_KEY')) {
    problems.push(`${rel}: el bundle hace referencia a XENO_CANTO_API_KEY`);
  }
}

if (!existsSync(resolve(ROOT, 'dist'))) console.warn('Aviso: no existe dist/. Ejecuta `npm run build` para revisar también el bundle.');
console.log(`Revisados ${scanned} archivos${key ? ' (comparando con la key real del entorno)' : ' (sin key en el entorno: solo patrones)'}.`);

if (problems.length) {
  console.error('✗ Posibles secretos encontrados:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✓ No se encontró ninguna API key en el repo ni en el bundle.');
