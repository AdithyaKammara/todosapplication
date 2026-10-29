/** Click / change / drag-and-drop handling for whatever is shown inside #view (event delegation). */
import { seedData } from '../features/seed.js';
import { filteredTasks } from '../model/selectors.js';
import { setStatus } from '../store/actions.js';
import { store } from '../store/store.js';
import { $, $$ } from '../utils/dom.js';
import { renderBulk, renderView } from '../views/render.js';
import { openDrawer } from './drawer.js';
import { clearFilters, go, setProject } from './nav-actions.js';

export function initViewEvents() {
  const view = $('#view');
  const { ui } = store;

  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const holder = b.closest('[data-id]');
    const id = holder && holder.dataset.id;
    switch (b.dataset.action) {
      case 'open':
        openDrawer(id);
        break;
      case 'project':
        setProject(b.dataset.project);
        break;
      case 'goto':
        go(b.dataset.view);
        break;
      case 'seed':
        seedData();
        break;
      case 'clear-filters':
        clearFilters();
        break;
      case 'more':
        ui.calExpanded = ui.calExpanded === b.dataset.day ? '' : b.dataset.day;
        renderView();
        break;
      default:
        break;
    }
  });

  view.addEventListener('change', (e) => {
    const a = e.target.dataset.action;
    if (!a) return;
    const holder = e.target.closest('[data-id]');
    const id = holder && holder.dataset.id;
    if (a === 'trend-range') {
      ui.trendDays = [7, 14, 30].includes(Number(e.target.value)) ? Number(e.target.value) : 14;
      renderView();
      $('[data-action="trend-range"]')?.focus();
    } else if (a === 'status') {
      setStatus(id, e.target.value);
      const again = $(`[data-id="${id}"] [data-action="status"]`);
      if (again) again.focus();
    } else if (a === 'select') {
      if (e.target.checked) ui.selected.add(id);
      else ui.selected.delete(id);
      holder.classList.toggle('selected', e.target.checked);
      const head = $('[data-action="select-all"]');
      if (head) head.checked = filteredTasks(store.state, ui).every((t) => ui.selected.has(t.id));
      renderBulk();
    } else if (a === 'select-all') {
      filteredTasks(store.state, ui).forEach((t) => {
        if (e.target.checked) ui.selected.add(t.id);
        else ui.selected.delete(t.id);
      });
      renderView();
      renderBulk();
    }
  });

  // Board drag-and-drop (mouse). Keyboard and touch users change status with the dropdown on each card.
  const clearDropMarks = () => $$('.drag-over').forEach((n) => n.classList.remove('drag-over'));

  view.addEventListener('dragstart', (e) => {
    const li = e.target.closest('li.task-card');
    if (!li) return;
    ui.dragId = li.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ui.dragId);
    li.classList.add('dragging');
  });
  view.addEventListener('dragend', () => {
    ui.dragId = null;
    clearDropMarks();
    $$('.dragging').forEach((n) => n.classList.remove('dragging'));
  });
  view.addEventListener('dragover', (e) => {
    const zone = e.target.closest('.dropzone');
    if (!zone || !ui.dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  view.addEventListener('dragleave', (e) => {
    const zone = e.target.closest('.dropzone');
    if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
  });
  view.addEventListener('drop', (e) => {
    const zone = e.target.closest('.dropzone');
    if (!zone || !ui.dragId) return;
    e.preventDefault();
    const id = ui.dragId;
    ui.dragId = null;
    clearDropMarks();
    setStatus(id, zone.dataset.status);
  });
}
