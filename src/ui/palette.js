/** Command palette (Ctrl/Cmd + K): jump to screens, run actions, or search tasks. */
import { exportCSV, exportJSON } from '../features/data.js';
import { seedData } from '../features/seed.js';
import { statusLabel } from '../model/meta.js';
import { redo, store, undo } from '../store/store.js';
import { $, closeDlg, el, openDlg } from '../utils/dom.js';
import { openHelp, openNext, openSettings } from './dialogs.js';
import { openDrawer } from './drawer.js';
import { go, setProject } from './nav-actions.js';
import { togglePomo } from './pomodoro.js';
import { focusQuickAdd } from './quick-add.js';
import { toggleDensity, toggleTheme } from './theme.js';

let items = [];
let index = 0;

function buildCommands() {
  const cmds = [
    { label: 'Go to Dashboard', hint: 'View', run: () => go('dashboard') },
    { label: 'Go to My tasks', hint: 'View', run: () => go('mine') },
    { label: 'Go to All tasks', hint: 'View', run: () => go('list') },
    { label: 'Go to Board', hint: 'View', run: () => go('board') },
    { label: 'Go to Calendar', hint: 'View', run: () => go('calendar') },
    { label: 'Create new task', hint: 'Focus quick add', run: focusQuickAdd },
    { label: 'Start / Pause 25m Focus Timer', hint: 'Shortcut: F', run: togglePomo },
    { label: 'What should I do next?', hint: 'Suggestion', run: openNext },
    { label: 'Keyboard Shortcuts Cheat-Sheet', hint: 'Shortcut: ?', run: openHelp },
    { label: 'Undo', hint: 'Ctrl Z', run: undo },
    { label: 'Redo', hint: 'Ctrl Shift Z', run: redo },
    { label: 'Toggle light / dark theme', hint: 'Appearance', run: toggleTheme },
    { label: 'Toggle compact density', hint: 'Appearance', run: toggleDensity },
    { label: 'Export JSON backup', hint: 'Data', run: exportJSON },
    { label: 'Export CSV', hint: 'Data', run: exportCSV },
    { label: 'Add sample data', hint: 'Data', run: seedData },
    { label: 'Open settings', hint: 'App', run: openSettings },
  ];
  store.state.projects.forEach((p) =>
    cmds.push({ label: `Open project: ${p.name}`, hint: 'Project', run: () => setProject(p.id) })
  );
  store.state.tasks.forEach((t) =>
    cmds.push({
      label: t.title,
      hint: `Task · ${statusLabel(t.status)}`,
      run: () => openDrawer(t.id),
    })
  );
  return cmds;
}

function renderPalette() {
  const words = $('#paletteInput').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  items = buildCommands()
    .filter((c) => words.every((w) => c.label.toLowerCase().includes(w)))
    .slice(0, 9);
  index = Math.min(index, Math.max(items.length - 1, 0));
  $('#paletteList').replaceChildren(
    ...(items.length
      ? items.map((c, i) =>
          el(
            'li',
            {
              id: `pi-${i}`,
              role: 'option',
              class: 'p-item',
              'aria-selected': String(i === index),
              'data-i': i,
            },
            el('span', { text: c.label }),
            el('span', { class: 'muted', text: c.hint || '' })
          )
        )
      : [el('li', { class: 'p-empty', text: 'No matches' })])
  );
  $('#paletteInput').setAttribute('aria-activedescendant', items.length ? `pi-${index}` : '');
}

export function openPalette() {
  $('#paletteInput').value = '';
  index = 0;
  renderPalette();
  openDlg($('#palette'));
  $('#paletteInput').focus();
}

function runItem(i) {
  const c = items[i];
  if (!c) return;
  closeDlg($('#palette'));
  c.run();
}

export function initPalette() {
  const input = $('#paletteInput');

  input.addEventListener('input', () => {
    index = 0;
    renderPalette();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      index = (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      renderPalette();
      const cur = $(`#pi-${index}`);
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(index);
    }
  });

  $('#paletteList').addEventListener('click', (e) => {
    const li = e.target.closest('[data-i]');
    if (li) runItem(Number(li.dataset.i));
  });

  $('#paletteBtn').addEventListener('click', openPalette);
}
