/** Event wiring for the sidebar, page header actions and the filter bar. */
import { store } from '../store/store.js';
import { $ } from '../utils/dom.js';
import { renderFilters, renderView, render } from '../views/render.js';
import { openNext } from './dialogs.js';
import { closeNav, toggleNav } from './layout.js';
import { go, moveCalendar, setProject } from './nav-actions.js';

export function initNavigation() {
  const { ui } = store;

  $('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-go],[data-next]');
    if (!b) return;
    if (b.dataset.next) {
      closeNav();
      openNext();
    } else {
      go(b.dataset.go);
    }
  });

  $('#projectNav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-project]');
    if (b) setProject(b.dataset.project);
  });

  $('#pageActions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cal]');
    if (b) moveCalendar(b.dataset.cal);
  });

  $('#searchInput').addEventListener('input', (e) => {
    ui.search = e.target.value;
    renderView();
  });
  $('#assigneeFilter').addEventListener('change', (e) => {
    ui.assignee = e.target.value;
    render();
  });
  $('#priorityFilter').addEventListener('change', (e) => {
    ui.priority = e.target.value;
    renderView();
  });
  $('#sortSelect').addEventListener('change', (e) => {
    ui.sort = e.target.value;
    renderView();
  });

  const pills = $('#quickPills');
  if (pills) {
    pills.addEventListener('click', (e) => {
      const b = e.target.closest('[data-chip]');
      if (!b) return;
      ui.quickChip = ui.quickChip === b.dataset.chip ? 'all' : b.dataset.chip;
      renderFilters();
      renderView();
    });
  }

  $('#menuBtn').addEventListener('click', toggleNav);
  $('#scrim').addEventListener('click', closeNav);
}
