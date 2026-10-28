import { describe, expect, it } from 'vitest';
import { licenseLabel } from '../src/core/license';

describe('licenseLabel', () => {
  it('convierte URLs de Creative Commons en etiquetas cortas', () => {
    expect(licenseLabel('https://creativecommons.org/licenses/by-nc-sa/4.0/')).toBe('CC BY-NC-SA 4.0');
    expect(licenseLabel('https://creativecommons.org/licenses/by-nc-nd/2.5/')).toBe('CC BY-NC-ND 2.5');
    expect(licenseLabel('https://creativecommons.org/publicdomain/zero/1.0/')).toBe('CC0');
    expect(licenseLabel('')).toBe('Creative Commons');
  });
});
