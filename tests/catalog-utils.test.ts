import { describe, expect, it } from 'vitest';
import { audioFormat, buildQueries, collectByTier, normalizeUrl, selectRecordings, toCatalogRecording } from '../scripts/lib/catalog-utils.mjs';

const r = (id: number, q: string, type: string, tier = 'region', ext = 'mp3') => ({ id: String(id), q, type, tier, file: `//xeno-canto.org/${id}/download`, 'file-name': `XC${id}-x.${ext}` });

describe('pipeline de catálogo', () => {
  it('normaliza URLs protocol-relative', () => {
    expect(normalizeUrl('//xeno-canto.org/1/download')).toBe('https://xeno-canto.org/1/download');
    expect(normalizeUrl('http://a.b')).toBe('https://a.b');
    expect(normalizeUrl('https://a.b')).toBe('https://a.b');
    expect(normalizeUrl(undefined)).toBe('');
  });

  it('construye consultas región → Colombia → global', () => {
    const qs = buildQueries('Pitangus sulphuratus');
    expect(qs.map((q: { tier: string }) => q.tier)).toEqual(['region', 'colombia', 'global']);
    expect(qs[0].query).toBe('gen:Pitangus sp:sulphuratus q:">C" len:"<60" box:0.9,-78.0,5.1,-75.6');
    expect(qs[1].query).toContain('cnt:colombia');
  });

  it('prioriza calidad A y variedad de tipos, máximo 5', () => {
    const recs = [r(1, 'B', 'song'), r(2, 'A', 'song'), r(3, 'A', 'song'), r(4, 'B', 'call'), r(5, 'A', 'song'), r(6, 'A', 'song'), r(7, 'A', 'song')];
    const picked = selectRecordings(recs);
    expect(picked).toHaveLength(5);
    expect(picked.some((x: { type: string }) => x.type === 'call')).toBe(true);
    expect(picked.map((x: { id: string }) => x.id)).not.toContain('1');
  });

  it('descarta "uncertain" y usa otros sonidos solo para llegar al mínimo', () => {
    const picked = selectRecordings([r(1, 'A', 'uncertain'), r(2, 'A', ''), r(3, 'A', 'song'), r(4, 'B', 'call'), r(5, 'B', 'wing whirring')]);
    const ids = picked.map((x: { id: string }) => x.id);
    expect(ids).not.toContain('1');
    expect(ids).toHaveLength(3);
    expect(ids).toEqual(expect.arrayContaining(['3', '4']));
    const full = selectRecordings([r(1, 'A', ''), r(2, 'B', 'song'), r(3, 'B', 'song'), r(4, 'B', 'call'), r(5, 'B', 'call')]);
    expect(full.map((x: { id: string }) => x.id)).not.toContain('1');
  });

  it('amplía si la región solo tiene sonidos no vocales', async () => {
    const calls: string[] = [];
    await collectByTier(buildQueries('Gen sp'), async (q: string) => {
      const tier = q.includes('box:') ? 'region' : q.includes('cnt:') ? 'colombia' : 'global';
      calls.push(tier);
      return tier === 'region' ? [r(1, 'A', ''), r(2, 'A', 'uncertain'), r(3, 'A', 'song')] : [];
    });
    expect(calls).toEqual(['region', 'colombia', 'global']);
  });

  it('detecta el formato por la extensión de file-name', () => {
    expect(audioFormat({ 'file-name': 'XC1-a.MP3' })).toBe('mp3');
    expect(audioFormat({ 'file-name': 'XC1-b.wav' })).toBe('wav');
    expect(audioFormat({})).toBe('');
  });

  it('prefiere MP3 sobre WAV aunque el WAV tenga mejor calidad', () => {
    const recs = [r(1, 'A', 'song', 'region', 'wav'), r(2, 'B', 'song'), r(3, 'B', 'call'), r(4, 'A', 'call', 'region', 'wav'), r(5, 'B', 'song')];
    expect(selectRecordings(recs, 3).map((x: { id: string }) => x.id).sort()).toEqual(['2', '3', '5']);
  });

  it('usa WAV si no hay suficientes MP3, pero la región sigue primero', () => {
    const recs = [r(1, 'A', 'song', 'region', 'wav'), r(2, 'A', 'song', 'colombia'), r(3, 'B', 'call')];
    expect(selectRecordings(recs, 2).map((x: { id: string }) => x.id)).toEqual(['3', '1']);
  });

  it('prefiere grabaciones de la región sobre las de Colombia', () => {
    const picked = selectRecordings([r(1, 'A', 'song', 'colombia'), r(2, 'B', 'song', 'region')], 1);
    expect(picked[0].id).toBe('2');
  });

  it('amplía la búsqueda solo si hay menos de 3 en la región', async () => {
    const calls: string[] = [];
    const data: Record<string, unknown[]> = { region: [r(1, 'A', 'song'), r(2, 'A', 'call')], colombia: [r(2, 'A', 'call'), r(3, 'B', 'song')], global: [r(9, 'A', 'song')] };
    const pool = await collectByTier(buildQueries('Gen sp'), async (q: string) => {
      const tier = q.includes('box:') ? 'region' : q.includes('cnt:') ? 'colombia' : 'global';
      calls.push(tier);
      return data[tier];
    });
    expect(calls).toEqual(['region', 'colombia']);
    expect(pool.map((x: { id: string }) => x.id)).toEqual(['1', '2', '3']);
  });

  it('convierte al formato del catálogo con URLs https', () => {
    const out = toCatalogRecording({ id: 123, file: '//xeno-canto.org/123/download', url: '//xeno-canto.org/123', lic: '//creativecommons.org/licenses/by-nc-sa/4.0/', q: 'A', type: 'song', loc: 'Cali', cnt: 'Colombia', rec: 'Ana' });
    expect(out).toEqual({ xcId: '123', audioUrl: 'https://xeno-canto.org/123/download', xcUrl: 'https://xeno-canto.org/123', type: 'song', quality: 'A', locality: 'Cali', country: 'Colombia', rec: 'Ana', lic: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' });
  });
});
