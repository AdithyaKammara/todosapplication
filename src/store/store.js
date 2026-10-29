/**
 * The single source of truth for app data (`store.state`) and view settings (`store.ui`).
 *
 * Rules of the road:
 *  - mutate `store.state`, then call `commit()` (save + history + re-render), or
 *  - use the helpers in actions.js, which do that for you.
 *  - the data layer never imports views; it announces changes with `emit()`.
 */
import { KEYS, MAX_HISTORY, VIEWS } from '../config.js';
import { normalize } from '../model/sanitize.js';
import { todayISO } from '../utils/dates.js';
import { toast } from '../ui/toast.js';
import { emit } from './events.js';
import { createHistory } from './history.js';
import { readPref, storage } from './storage.js';

const savedView = readPref(KEYS.view);

export const store = {
  state: storage.load(),
  ui: {
    view: VIEWS.includes(savedView) ? savedView : 'dashboard',
    project: '',
    assignee: '',
    priority: '',
    search: '',
    quickChip: 'all', // 'all' | 'today' | 'overdue' | 'unassigned' | '#tag'
    sort: 'due',
    selected: new Set(),
    calMonth: todayISO().slice(0, 8) + '01',
    calExpanded: '',
    trendDays: 14, // dashboard chart range: 7 | 14 | 30
    drawerId: null,
    dragId: null,
  },
};

export const history = createHistory(MAX_HISTORY, JSON.stringify(store.state));

let saveWarned = false;

/** Save to storage and record an undo step. Warns once if the browser refuses to save. */
export function persist() {
  history.record(JSON.stringify(store.state));
  if (storage.save(store.state)) {
    saveWarned = false;
  } else if (!saveWarned) {
    saveWarned = true;
    setTimeout(
      () =>
        toast(
          'Could not save: browser storage is full or blocked. Export a JSON backup from Settings.'
        ),
      0
    );
  }
}

export const render = () => emit('render');

/** Persist + re-render. */
export function commit() {
  persist();
  render();
}

function applySnapshot(snapshot) {
  store.state = normalize(JSON.parse(snapshot));
  history.sync(JSON.stringify(store.state));
  store.ui.selected.clear();
  if (store.ui.project && !store.state.projects.some((p) => p.id === store.ui.project)) {
    store.ui.project = '';
  }
  storage.save(store.state);
  emit('drawer:rebuild');
  render();
}

export function undo() {
  const snap = history.undo();
  if (snap === null) return toast('Nothing to undo');
  applySnapshot(snap);
  toast('Undone');
}

export function redo() {
  const snap = history.redo();
  if (snap === null) return toast('Nothing to redo');
  applySnapshot(snap);
  toast('Redone');
}

/** Another browser tab changed the data: reload it and start a fresh history. */
export function reloadFromStorage() {
  store.state = storage.load();
  history.reset(JSON.stringify(store.state));
  emit('drawer:rebuild');
  render();
}
