/**
 * Etiqueta corta de una licencia Creative Commons a partir de su URL, p. ej.
 * "https://creativecommons.org/licenses/by-nc-sa/4.0/" → "CC BY-NC-SA 4.0".
 */
export function licenseLabel(url: string): string {
  const cc = /creativecommons\.org\/licenses\/([a-z-]+)\/(\d+(?:\.\d+)?)/i.exec(url);
  if (cc) return `CC ${cc[1].toUpperCase()} ${cc[2]}`;
  if (/creativecommons\.org\/publicdomain\/zero/i.test(url)) return 'CC0';
  if (/creativecommons\.org\/publicdomain\/mark/i.test(url)) return 'Public Domain Mark';
  return 'Creative Commons';
}
