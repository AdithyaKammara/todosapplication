/** The top-bar "Add a task…" box with its live "Will add: …" preview. */
import { HINT_DEFAULT, INBOX, MAX_TITLE } from '../config.js';
import { member } from '../model/meta.js';
import { parseQuickAdd } from '../model/parser.js';
import { addTask } from '../store/actions.js';
import { store } from '../store/store.js';
import { fmtDate } from '../utils/dates.js';
import { $ } from '../utils/dom.js';
import { truncate } from '../utils/text.js';
import { toast } from './toast.js';

export const focusQuickAdd = () => $('#quickInput').focus();

function setError(msg) {
  $('#quickError').textContent = msg;
  $('#quickInput').setAttribute('aria-invalid', msg ? 'true' : 'false');
}

export function updateHint() {
  const raw = $('#quickInput').value.trim();
  if (!raw) {
    $('#quickHint').textContent = HINT_DEFAULT;
    return;
  }
  const p = parseQuickAdd(raw);
  const bits = [`"${truncate(p.title || '…', 40)}"`, p.priority];
  if (p.due) bits.push(`due ${fmtDate(p.due)}`);
  if (p.assignee) bits.push(`@${member(p.assignee).name.split(' ')[0]}`);
  p.tags.forEach((g) => bits.push(`#${g}`));
  $('#quickHint').textContent = 'Will add: ' + bits.join(' · ');
}

export function initQuickAdd() {
  const input = $('#quickInput');

  $('#quickForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = parseQuickAdd(input.value);
    if (!p.title) {
      setError('Type a task title first. Dates, tags and @names alone are not a task.');
      input.focus();
      return;
    }
    if (p.title.length > MAX_TITLE) {
      setError(`Keep the title under ${MAX_TITLE} characters.`);
      input.focus();
      return;
    }
    setError('');
    const { state, ui } = store;
    const proj =
      state.projects.find((x) => x.id === ui.project) || state.projects.find((x) => x.id === INBOX);
    addTask({ ...p, assignee: p.assignee || ui.assignee, project: proj.id });
    input.value = '';
    updateHint();
    toast(`Added to ${proj.name}`);
  });

  input.addEventListener('input', () => {
    setError('');
    updateHint();
  });

  updateHint();
}
