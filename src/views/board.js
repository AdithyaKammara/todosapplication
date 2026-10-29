import { STATUSES } from '../config.js';
import { SORTS, filteredTasks, projectOf } from '../model/selectors.js';
import { store } from '../store/store.js';
import { $, el } from '../utils/dom.js';
import { avatar, dueBadge, projectChip } from './shared.js';

function boardCard(t) {
  const n = t.subtasks.length;
  const d = t.subtasks.filter((s) => s.done).length;
  return el(
    'li',
    {
      class: `card task-card${t.status === 'done' ? ' is-done' : ''}`,
      'data-id': t.id,
      draggable: 'true',
    },
    el('div', { class: 'meta' }, projectChip(projectOf(store.state, t))),
    el('button', { type: 'button', class: 'title-btn', 'data-action': 'open', text: t.title }),
    t.tags.length
      ? el(
          'div',
          { class: 'meta' },
          t.tags.map((g) => el('span', { class: 'tag', text: `#${g}` }))
        )
      : null,
    n
      ? el(
          'div',
          { class: 'sub-line' },
          el(
            'div',
            { class: 'bar', 'aria-hidden': 'true' },
            el('i', { style: `width:${Math.round((d / n) * 100)}%` })
          ),
          el('span', { class: 'muted', text: `${d}/${n}` })
        )
      : null,
    el(
      'div',
      { class: 'card-foot' },
      el('span', { class: `badge p-${t.priority}`, text: t.priority }),
      dueBadge(t),
      el('span', { class: 'spacer' }),
      avatar(t.assignee)
    ),
    el(
      'select',
      {
        class: `field status-select st-${t.status}`,
        'data-action': 'status',
        'aria-label': `Move "${t.title}" to`,
      },
      STATUSES.map((s) => el('option', { value: s.id, text: s.label, selected: s.id === t.status }))
    )
  );
}

export function renderBoard() {
  const tasks = filteredTasks(store.state, store.ui).sort(SORTS.due);
  $('#view').replaceChildren(
    el(
      'div',
      { class: 'board' },
      STATUSES.map((s) => {
        const col = tasks.filter((t) => t.status === s.id);
        return el(
          'section',
          {
            class: 'column dropzone',
            'data-status': s.id,
            'aria-labelledby': `col-${s.id}`,
          },
          el(
            'h2',
            { class: 'col-title', id: `col-${s.id}` },
            el('i', { class: `status-dot st-${s.id}` }),
            s.label,
            el('span', { class: 'count', text: String(col.length) })
          ),
          el(
            'ul',
            { class: 'cards' },
            col.length
              ? col.map(boardCard)
              : el('li', { class: 'drop-hint', text: 'Drop tasks here' })
          )
        );
      })
    )
  );
}
