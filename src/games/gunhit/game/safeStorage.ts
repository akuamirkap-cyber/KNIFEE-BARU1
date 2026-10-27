/**
 * Storage that can never take the game down.
 *
 * The hub is shown inside the preview's cross-origin iframe, and a browser with
 * third-party storage blocked does not hand back `null` for `localStorage` —
 * touching the property itself throws `SecurityError`. Slide 1 reads its coins,
 * weapon, collection and quests from storage inside the very first render, so a
 * single throw there unmounted the whole React tree: the page came up blank with
 * nothing but `SecurityError: Access is denied for this document` in the console.
 *
 * `createSafeStorage()` answers the same three calls and falls back to memory, so
 * the game still plays; progress simply does not survive a reload in that mode.
 * The fallback also keeps the session consistent when storage exists but rejects
 * a write (quota, private mode).
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** How the real `localStorage` is reached; injectable so the fallback is testable. */
export type StorageSource = () => Storage | null;

function defaultSource(): Storage | null {
  return (globalThis as { localStorage?: Storage }).localStorage ?? null;
}

/**
 * A `localStorage`-shaped object that never throws.
 *
 * Every read is answered from memory first and then from the browser's store,
 * so a value written while storage was refused is still readable in the same
 * session.
 */
export function createSafeStorage(source: StorageSource = defaultSource): KeyValueStore {
  const memory = new Map<string, string>();
  let real: Storage | null = null;
  // Reading one key is what actually proves the origin may use storage: in the
  // blocked case the *getter* throws, not `getItem`.
  try {
    real = source();
    real?.getItem('gunhit_storage_probe');
  } catch {
    real = null;
  }

  if (!real) {
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key)! : null),
      setItem: (key, value) => { memory.set(key, String(value)); },
      removeItem: (key) => { memory.delete(key); },
    };
  }

  const store = real;
  return {
    getItem: (key) => {
      try {
        const live = store.getItem(key);
        return live ?? (memory.has(key) ? memory.get(key)! : null);
      } catch {
        return memory.has(key) ? memory.get(key)! : null;
      }
    },
    setItem: (key, value) => {
      memory.set(key, String(value));
      try {
        store.setItem(key, String(value));
      } catch {
        /* quota / private mode: the session keeps the value in memory */
      }
    },
    removeItem: (key) => {
      memory.delete(key);
      try {
        store.removeItem(key);
      } catch {
        /* nothing to undo when storage refuses the call */
      }
    },
  };
}

/** The store slide 1 uses for every one of its saved values. */
export const storage: KeyValueStore = createSafeStorage();
