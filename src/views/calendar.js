import { SORTS, filteredTasks, projectOf } from '../model/selectors.js';
import { store } from '../store/store.js';
import { addDays, fromISO, todayISO } from '../utils/dates.js';
import { $, el } from '../utils/dom.js';

export function renderCalendar() {
  const { state, ui } = store;
  const first = fromISO(ui.calMonth);
  const startIso = addDays(ui.calMonth, -first.getDay());
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((first.getDay() + daysInMonth) / 7);
  const tasks = filteredTasks(state, ui);

  const byDay = {};
  tasks.forEach((t) => {
    if (t.due) (byDay[t.due] = byDay[t.due] || []).push(t);
  });

  const today = todayISO();
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const iso = addDays(startIso, i);
    const d = fromISO(iso);
    const list = (byDay[iso] || []).sort(SORTS.priority);
    const expanded = ui.calExpanded === iso;
    const shown = expanded ? list : list.slice(0, 3);
    cells.push(
      el(
        'div',
        {
          class: `cal-cell${d.getMonth() === first.getMonth() ? '' : ' out'}${iso === today ? ' today' : ''}`,
        },
        el('span', { class: 'cal-day', text: String(d.getDate()) }),
        shown.map((t) =>
          el('button', {
            type: 'button',
            class: `chip${t.status === 'done' ? ' done' : ''}`,
            'data-action': 'open',
            'data-id': t.id,
            style: `border-left-color:${projectOf(state, t).color}`,
            title: t.title,
            text: t.title,
          })
        ),
        list.length > 3
          ? el('button', {
              type: 'button',
              class: 'cal-more',
              'data-action': 'more',
              'data-day': iso,
              text: expanded ? 'Show less' : `+${list.length - 3} more`,
            })
          : null
      )
    );
  }

  const unscheduled = tasks.filter((t) => !t.due && t.status !== 'done').length;
  $('#view').replaceChildren(
    el(
      'div',
      { class: 'card' },
      el(
        'div',
        { class: 'cal-scroll' },
        el(
          'div',
          { class: 'cal-grid' },
          ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((n) =>
            el('div', { class: 'cal-dow', text: n })
          ),
          cells
        )
      ),
      unscheduled
        ? el('p', {
            class: 'cal-note',
            text: `${unscheduled} open task${unscheduled === 1 ? ' has' : 's have'} no due date and ${unscheduled === 1 ? 'is' : 'are'} not shown here.`,
          })
        : null
    )
  );
}
