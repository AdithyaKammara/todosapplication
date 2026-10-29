/** Picks the right screen for `store.ui.view` and redraws the frame around it. */
import { store } from '../store/store.js';
import { renderBoard } from './board.js';
import { renderCalendar } from './calendar.js';
import {
  renderBulk,
  renderFilters,
  renderHead,
  renderSidebar,
  updateHistoryButtons,
} from './chrome.js';
import { renderDashboard } from './dashboard.js';
import { renderList } from './list.js';

export function renderView() {
  const { view } = store.ui;
  if (view === 'list') renderList();
  else if (view === 'board') renderBoard();
  else if (view === 'calendar') renderCalendar();
  else renderDashboard();
}

export function render() {
  renderSidebar();
  renderHead();
  renderFilters();
  renderView();
  renderBulk();
  updateHistoryButtons();
}

export { renderBulk, renderFilters, renderHead };
