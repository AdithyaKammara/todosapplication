import { STATUSES } from '../config.js';
import { SORTS, filteredTasks, projectOf } from '../model/selectors.js';
import { store } from '../store/store.js';
import { $, el } from '../utils/dom.js';
import { avatar, dueBadge, emptyState, projectChip } from './shared.js';

function taskRow(t) {
  const { state, ui } = store;
  const nSub = t.subtasks.length;
  const dSub = t.subtasks.filter((s) => s.done).length;
  return el(
    'li',
    {
      class: `row status-${t.status}${ui.selected.has(t.id) ? ' selected' : ''}`,
      'data-id': t.id,
    },
    el(
      'label',
      { class: 'sel' },
      el('input', {
        type: 'checkbox',
        'data-action': 'select',
        checked: ui.selected.has(t.id),
        'aria-label': `Select "${t.title}"`,
      })
    ),
    el(
      'div',
      {},
      el('button', { type: 'button', class: 'title-btn', 'data-action': 'open', text: t.title }),
      el(
        'div',
        { class: 'meta' },
        projectChip(projectOf(state, t)),
        nSub ? el('span', { class: 'sub-prog', text: `${dSub}/${nSub} subtasks` }) : null,
        t.tags.map((g) => el('span', { class: 'tag', text: `#${g}` }))
      )
    ),
    el(
      'div',
      { class: 'row-side' },
      avatar(t.assignee),
      el('span', { class: `badge p-${t.priority}`, text: t.priority }),
      dueBadge(t) || el('span', { class: 'muted', text: 'No date' }),
      el(
        'select',
        {
          class: `field status-select st-${t.status}`,
          'data-action': 'status',
          'aria-label': `Status of "${t.title}"`,
        },
        STATUSES.map((s) =>
          el('option', { value: s.id, text: s.label, selected: s.id === t.status })
        )
      )
    )
  );
}

export function renderList() {
  const { state, ui } = store;
  const tasks = filteredTasks(state, ui).sort(SORTS[ui.sort] || SORTS.due);
  if (!tasks.length) {
    $('#view').replaceChildren(emptyState(state.tasks.length > 0));
    return;
  }
  const allSel = tasks.every((t) => ui.selected.has(t.id));
  $('#view').replaceChildren(
    el(
      'div',
      { class: 'card table' },
      el(
        'div',
        { class: 'row head' },
        el(
          'label',
          { class: 'sel' },
          el('input', {
            type: 'checkbox',
            'data-action': 'select-all',
            checked: allSel,
            'aria-label': 'Select all visible tasks',
          })
        ),
        el('span', { text: 'Task' }),
        el('span', { text: 'Who' }),
        el('span', { text: 'Priority' }),
        el('span', { text: 'Due' }),
        el('span', { text: 'Status' })
      ),
      el('ul', {}, tasks.map(taskRow))
    )
  );
}
