/** Changing the current screen / project / filters. Shared by the sidebar, palette and dialogs. */
import { ME, KEYS } from '../config.js';
import { writePref } from '../store/storage.js';
import { store } from '../store/store.js';
import { toISO, todayISO, fromISO } from '../utils/dates.js';
import { $ } from '../utils/dom.js';
import { render, renderHead, renderView } from '../views/render.js';
import { closeNav } from './layout.js';

/** Go to a screen. 'mine' is the List screen filtered to the current user. */
export function go(key) {
  const { ui } = store;
  ui.assignee = key === 'mine' ? ME : '';
  ui.view = key === 'mine' ? 'list' : key;
  writePref(KEYS.view, ui.view);
  ui.selected.clear();
  closeNav();
  render();
  window.scrollTo(0, 0);
}

export function setProject(id) {
  store.ui.project = id;
  store.ui.selected.clear();
  closeNav();
  render();
}

export function clearFilters() {
  const { ui } = store;
  ui.search = '';
  ui.assignee = '';
  ui.priority = '';
  ui.quickChip = 'all';
  $('#searchInput').value = '';
  render();
}

/** Move the calendar by +1/-1 month, or back to the current month. */
export function moveCalendar(direction) {
  const { ui } = store;
  if (direction === 'today') {
    ui.calMonth = todayISO().slice(0, 8) + '01';
  } else {
    const d = fromISO(ui.calMonth);
    d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1), 1);
    ui.calMonth = toISO(d);
  }
  ui.calExpanded = '';
  renderHead();
  renderView();
}
