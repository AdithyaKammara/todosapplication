/** Small view pieces used by several screens. */
import { initials } from '../utils/text.js';
import { diffDays, fmtDate } from '../utils/dates.js';
import { el } from '../utils/dom.js';
import { member } from '../model/meta.js';

export function avatar(id) {
  const m = member(id);
  if (!m) {
    return el('span', {
      class: 'avatar none',
      title: 'Unassigned',
      'aria-label': 'Unassigned',
      text: '–',
    });
  }
  return el('span', {
    class: 'avatar',
    style: `background:${m.color}`,
    title: m.name,
    'aria-label': m.name,
    text: initials(m.name),
  });
}

export const projectChip = (p) =>
  el('span', { class: 'proj' }, el('i', { class: 'dot', style: `background:${p.color}` }), p.name);

export function dueBadge(t) {
  if (!t.due) return null;
  const d = diffDays(t.due);
  let label;
  let cls = 'badge due';
  if (t.status === 'done') label = fmtDate(t.due);
  else if (d < 0) {
    label = `Overdue · ${-d}d`;
    cls += ' overdue';
  } else if (d === 0) {
    label = 'Due today';
    cls += ' today';
  } else if (d === 1) label = 'Due tomorrow';
  else label = fmtDate(t.due);
  return el('span', { class: cls, text: label });
}

export function emptyState(filtered) {
  if (filtered) {
    return el(
      'div',
      { class: 'empty' },
      el('h2', { text: 'No tasks match your filters' }),
      el('button', {
        class: 'btn',
        type: 'button',
        'data-action': 'clear-filters',
        text: 'Clear filters',
      })
    );
  }
  return el(
    'div',
    { class: 'empty' },
    el('h2', { text: 'No tasks yet' }),
    el('p', {
      text: 'Use the quick add bar above, press N, or start with sample data to explore the dashboard.',
    }),
    el(
      'div',
      { class: 'set-row' },
      el('button', {
        class: 'btn btn-primary',
        type: 'button',
        'data-action': 'seed',
        text: 'Add sample data',
      })
    )
  );
}
