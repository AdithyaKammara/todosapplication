/** Modal dialogs: settings, new project, keyboard help and the "What next?" suggestions. */
import { PROJECT_COLORS } from '../config.js';
import { exportCSV, exportJSON } from '../features/data.js';
import { seedData } from '../features/seed.js';
import { normalize } from '../model/sanitize.js';
import { rankNext } from '../model/selectors.js';
import { replaceState } from '../store/actions.js';
import { persist, store } from '../store/store.js';
import { $, $$, closeDlg, el, openDlg } from '../utils/dom.js';
import { cap, clean, pid } from '../utils/text.js';
import { openDrawer } from './drawer.js';
import { closeNav } from './layout.js';
import { setProject } from './nav-actions.js';
import { setDensity, toggleTheme } from './theme.js';
import { toast } from './toast.js';

export const openSettings = () => openDlg($('#settingsDlg'));
export const openHelp = () => openDlg($('#helpDlg'));

export function openNext() {
  const { state, ui } = store;
  const proj = state.projects.find((p) => p.id === ui.project);
  $('#nextScope').textContent = `Open tasks assigned to you or unassigned, ${
    proj ? 'in ' + proj.name : 'across all projects'
  }. Ranked by due date, priority, status and progress.`;

  const top = rankNext(state, ui);
  $('#nextList').replaceChildren(
    ...(top.length
      ? top.map((r, i) =>
          el(
            'li',
            { class: 'card next-item' },
            el('span', { class: 'next-rank', text: String(i + 1) }),
            el(
              'div',
              {},
              el('strong', { text: r.t.title }),
              el('p', { class: 'muted', text: cap(r.why.join(', ') || 'next in line') })
            ),
            el('button', { type: 'button', class: 'btn', 'data-next-open': r.t.id, text: 'Open' })
          )
        )
      : [
          el('li', {
            class: 'muted',
            text: 'Nothing open to suggest. Add a task or switch to All projects.',
          }),
        ])
  );
  openDlg($('#nextDlg'));
}

function renderSwatches() {
  $('#swatches').replaceChildren(
    ...PROJECT_COLORS.map((c, i) =>
      el(
        'label',
        { class: 'swatch', style: `background:${c}`, title: c },
        el('input', {
          type: 'radio',
          name: 'color',
          value: c,
          checked: i === 0,
          'aria-label': `Colour ${c}`,
        })
      )
    )
  );
}

export function initDialogs() {
  const settingsDlg = $('#settingsDlg');
  const projectDlg = $('#projectDlg');

  // Settings
  $('#settingsBtn').addEventListener('click', () => {
    closeNav();
    openDlg(settingsDlg);
  });
  if ($('#helpBtn')) $('#helpBtn').addEventListener('click', openHelp);

  settingsDlg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-setting]');
    if (!b) return;
    switch (b.dataset.setting) {
      case 'theme':
        toggleTheme();
        break;
      case 'density':
        setDensity(b.dataset.value);
        break;
      case 'export-json':
        exportJSON();
        break;
      case 'import-json':
        $('#importFile').click();
        break;
      case 'export-csv':
        exportCSV();
        break;
      case 'seed':
        closeDlg(settingsDlg);
        seedData();
        break;
      case 'reset':
        // Two-click confirmation: the first click arms the button for 4 seconds.
        if (!b.dataset.armed) {
          b.dataset.armed = '1';
          b.textContent = 'Click again to confirm';
          setTimeout(() => {
            delete b.dataset.armed;
            b.textContent = 'Reset all data';
          }, 4000);
        } else {
          delete b.dataset.armed;
          b.textContent = 'Reset all data';
          closeDlg(settingsDlg);
          replaceState(normalize({}), 'All data cleared');
        }
        break;
      default:
        break;
    }
  });

  // New project
  $('#addProjectBtn').addEventListener('click', () => {
    closeNav();
    $('#projectName').value = '';
    $('#projectError').textContent = '';
    renderSwatches();
    openDlg(projectDlg);
    $('#projectName').focus();
  });
  $('#projectForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = clean($('#projectName').value, 40);
    if (!name) {
      $('#projectError').textContent = 'Give the project a name.';
      $('#projectName').focus();
      return;
    }
    const checked = $('input[name="color"]:checked', projectDlg);
    const p = { id: pid(), name, color: checked ? checked.value : PROJECT_COLORS[0] };
    store.state.projects.push(p);
    closeDlg(projectDlg);
    persist();
    setProject(p.id);
    toast(`Project "${p.name}" created`);
  });
  renderSwatches();

  // "What next?"
  $('#nextBtn').addEventListener('click', openNext);
  $('#nextList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-next-open]');
    if (!b) return;
    closeDlg($('#nextDlg'));
    openDrawer(b.dataset.nextOpen);
  });

  // Close a dialog by clicking its backdrop or any [data-dlg-close] button.
  $$('dialog').forEach((d) =>
    d.addEventListener('click', (e) => {
      if (e.target === d) closeDlg(d);
    })
  );
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dlg-close]');
    if (b) closeDlg(b.closest('dialog'));
  });
}
