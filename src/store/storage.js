/**
 * Persistence layer. This is the ONLY module that reads or writes task data in localStorage.
 * `load()` and `save()` are deliberately small so they can later be replaced with fetch() calls to
 * the Node + PostgreSQL API without touching any other file.
 */
import { KEYS } from '../config.js';
import { normalize } from '../model/sanitize.js';

export const storage = {
  /** Loads the newest data it can find, migrating v3 -> v2 -> v1 shapes on the way. */
  load() {
    for (const key of [KEYS.data, KEYS.v3, KEYS.v2, KEYS.v1]) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed)
          ? parsed
          : parsed.tasks || parsed.todos || parsed.items || [];
        const next = normalize({
          tasks: list,
          projects: Array.isArray(parsed) ? [] : parsed.projects,
        });
        if (key === KEYS.data || next.tasks.length) return next;
      } catch {
        /* unreadable data: try the next key */
      }
    }
    return normalize({});
  },

  /** Returns true when the data was saved, false when storage is full or blocked. */
  save(data) {
    try {
      localStorage.setItem(KEYS.data, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};

/** Small UI preferences (theme, density, last view). Never throws. */
export function readPref(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore: preferences are optional */
  }
}
