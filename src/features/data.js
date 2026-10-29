/** Import / export: JSON backup (restore) and CSV (for spreadsheets). */
import { SORTS, projectOf } from '../model/selectors.js';
import { member, statusLabel } from '../model/meta.js';
import { normalize } from '../model/sanitize.js';
import { replaceState } from '../store/actions.js';
import { store } from '../store/store.js';
import { toast } from '../ui/toast.js';
import { toCsv } from '../utils/csv.js';
import { todayISO } from '../utils/dates.js';
import { $, closeDlg, download } from '../utils/dom.js';

export function exportJSON() {
  const payload = {
    app: 'taskflow',
    version: 5,
    exportedAt: new Date().toISOString(),
    projects: store.state.projects,
    tasks: store.state.tasks,
  };
  download(
    `taskflow-backup-${todayISO()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export function exportCSV() {
  const { state } = store;
  if (!state.tasks.length) {
    toast('Nothing to export yet.');
    return;
  }
  const rows = [
    [
      'Title',
      'Project',
      'Status',
      'Priority',
      'Assignee',
      'Due',
      'Tags',
      'Subtasks done',
      'Subtasks total',
      'Created',
    ],
  ];
  state.tasks
    .slice()
    .sort(SORTS.due)
    .forEach((t) =>
      rows.push([
        t.title,
        projectOf(state, t).name,
        statusLabel(t.status),
        t.priority,
        (member(t.assignee) || { name: '' }).name,
        t.due,
        t.tags.join(' '),
        t.subtasks.filter((s) => s.done).length,
        t.subtasks.length,
        new Date(t.createdAt).toISOString(),
      ])
    );
  download(`taskflow-${todayISO()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
}

/** Wire up the hidden file input used by "Import JSON". */
export function initImport() {
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5e6) {
      toast('That file is too large to import.');
      return;
    }
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.tasks)) throw new Error('Not a TaskFlow backup');
      const next = normalize(data);
      closeDlg($('#settingsDlg'));
      replaceState(
        next,
        `Imported ${next.tasks.length} task${next.tasks.length === 1 ? '' : 's'} (replaced current data)`
      );
    } catch {
      toast('That file is not a valid TaskFlow backup.');
    }
  });
}
