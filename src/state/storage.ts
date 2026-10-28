// Acceso a localStorage tolerante a fallos: modo privado, cuota llena, cookies
// bloqueadas o entornos sin `window`. Si no está disponible, todo vive en memoria.

export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryBackend(): KeyValueBackend {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

/** Devuelve localStorage si funciona de verdad (lectura y escritura); si no, null. */
export function detectLocalStorage(): KeyValueBackend | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = '__songbird_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

export interface Store {
  read<T>(key: string, fallback: T): T;
  write(key: string, value: unknown): void;
  remove(key: string): void;
  readonly persistent: boolean;
}

/**
 * Crea un almacén JSON. Cada operación va en try/catch y además se refleja en
 * memoria, de modo que si el backend falla a mitad de sesión el juego sigue.
 */
export function createStore(backend: KeyValueBackend | null = detectLocalStorage()): Store {
  const memory = memoryBackend();
  return {
    persistent: backend !== null,
    read<T>(key: string, fallback: T): T {
      let raw: string | null = memory.getItem(key);
      if (raw === null && backend) {
        try {
          raw = backend.getItem(key);
        } catch {
          raw = null;
        }
      }
      if (raw === null) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      const raw = JSON.stringify(value);
      memory.setItem(key, raw);
      try {
        backend?.setItem(key, raw);
      } catch {
        /* sin espacio o bloqueado: seguimos en memoria */
      }
    },
    remove(key) {
      memory.removeItem(key);
      try {
        backend?.removeItem(key);
      } catch {
        /* ignorar */
      }
    },
  };
}
