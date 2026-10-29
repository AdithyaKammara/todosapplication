/** Task operations. Each one changes `store.state`, then saves and re-renders. */
import { STATUS_IDS } from '../config.js';
import { statusLabel } from '../model/meta.js';
import { normalize, sanitizeTask } from '../model/sanitize.js';
import { byId } from '../model/selectors.js';
import { toast } from '../ui/toast.js';
import { truncate } from '../utils/text.js';
import { emit } from './events.js';
import { commit, persist, render, store } from './store.js';

/** Append an entry to a task's activity log (keeps the newest 50). */
export function log(task, text) {
  task.log.push({ at: Date.now(), text });
  if (task.log.length > 50) task.log.shift();
}

/** Apply a patch to one task, optionally write an activity-log note, save and re-render. */
export function updateTask(id, patch, note) {
  const t = byId(store.state, id);
  if (!t) return;
  Object.assign(t, patch);
  if (note) log(t, note);
  persist();
  render();
  if (store.ui.drawerId === id) emit('drawer:parts', t);
}

export function addTask(fields) {
  const t = sanitizeTask({ ...fields, status: 'todo' });
  if (!t) return null;
  log(t, 'Task created');
  store.state.tasks.push(t);
  commit();
  return t;
}

export function setStatus(id, status) {
  const t = byId(store.state, id);
  if (!t || t.status === status || !STATUS_IDS.includes(status)) return;
  updateTask(
    id,
    { status, completedAt: status === 'done' ? Date.now() : null },
    `Status changed: ${statusLabel(t.status)} → ${statusLabel(status)}`
  );
}

export function deleteTask(id) {
  const { state, ui } = store;
  const i = state.tasks.findIndex((t) => t.id === id);
  if (i < 0) return;
  const [removed] = state.tasks.splice(i, 1);
  ui.selected.delete(id);
  commit();
  toast(`Deleted "${truncate(removed.title, 30)}"`, () => {
    store.state.tasks.splice(Math.min(i, store.state.tasks.length), 0, removed);
    commit();
  });
}

/** Run `fn` on every selected task, then save once. */
export function bulkUpdate(fn) {
  store.state.tasks.filter((t) => store.ui.selected.has(t.id)).forEach(fn);
  commit();
}

export function bulkDelete() {
  const { state, ui } = store;
  const removed = state.tasks.filter((t) => ui.selected.has(t.id));
  if (!removed.length) return;
  store.state.tasks = state.tasks.filter((t) => !ui.selected.has(t.id));
  ui.selected.clear();
  commit();
  toast(`Deleted ${removed.length} task${removed.length === 1 ? '' : 's'}`, () => {
    store.state.tasks.push(...removed);
    commit();
  });
}

/** Replace ALL data (import / reset) with a one-click undo. */
export function replaceState(next, message) {
  const prev = JSON.stringify(store.state);
  store.state = next;
  store.ui.selected.clear();
  store.ui.project = '';
  commit();
  toast(message, () => {
    store.state = normalize(JSON.parse(prev));
    commit();
  });
}
