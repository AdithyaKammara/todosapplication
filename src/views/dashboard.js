/** Dashboard: what to do first, key numbers, charts, workload, project progress and upcoming work. */
import { STATUSES } from '../config.js';
import { member } from '../model/meta.js';
import {
  completionTrend,
  dashboardStats,
  projectOf,
  projectTasks,
  rankNext,
} from '../model/selectors.js';
import { store } from '../store/store.js';
import { diffDays, fmtDate } from '../utils/dates.js';
import { $, el, icon } from '../utils/dom.js';
import { cap } from '../utils/text.js';
import { donutChart, trendChart } from './charts.js';
import { avatar, emptyState } from './shared.js';

/* ---------- small pieces ---------- */

const projectTag = (p) =>
  el(
    'span',
    { class: 'ptag', title: p.name },
    el('i', { class: 'dot', style: `background:${p.color}` }),
    p.name
  );

function person(id) {
  const m = member(id);
  return el(
    'span',
    { class: 'person' },
    avatar(id),
    el('span', { class: m ? 'person-name' : 'person-name muted', text: m ? m.name : 'Unassigned' })
  );
}

function dueInfo(t) {
  if (!t.due) return { text: 'No date', cls: '' };
  const d = diffDays(t.due);
  if (d < 0) return { text: `Overdue · ${-d}d`, cls: 'overdue' };
  if (d === 0) return { text: 'Today', cls: 'today' };
  if (d === 1) return { text: 'Tomorrow', cls: 'soon' };
  return { text: fmtDate(t.due), cls: '' };
}

const dueCell = (t) => {
  const { text, cls } = dueInfo(t);
  return el('span', { class: `due-cell ${cls}` }, icon('calendar', 14), text);
};

const priority = (t) => el('span', { class: `badge p-${t.priority}`, text: t.priority });

const panelHead = (title, sub, ...extra) =>
  el(
    'header',
    { class: 'panel-head' },
    el(
      'div',
      { class: 'panel-titles' },
      el('h2', { text: title }),
      sub ? el('p', { class: 'muted', text: sub }) : null
    ),
    ...extra
  );

const viewAll = (view, label) =>
  el(
    'button',
    { type: 'button', class: 'link', 'data-action': 'goto', 'data-view': view },
    label,
    icon('arrowRight', 14)
  );

/* ---------- start here ---------- */

function startHere() {
  const { state, ui } = store;
  const top = rankNext(state, ui);
  return el(
    'section',
    { class: 'card start', 'aria-labelledby': 'startTitle' },
    el(
      'header',
      { class: 'panel-head' },
      el('span', { class: 'head-icon' }, icon('target', 22)),
      el(
        'div',
        { class: 'panel-titles' },
        el('h2', { id: 'startTitle', text: 'Start here' }),
        el('p', { class: 'muted', text: 'Your top priorities right now' })
      ),
      viewAll('list', 'View all tasks')
    ),
    top.length
      ? el(
          'ol',
          { class: 'start-list' },
          top.map((r, i) =>
            el(
              'li',
              { class: 'start-row', 'data-id': r.t.id },
              el('span', { class: 'rank', text: String(i + 1) }),
              el('button', {
                type: 'button',
                class: 'title-btn',
                'data-action': 'open',
                text: r.t.title,
              }),
              el(
                'div',
                { class: 'row-meta' },
                projectTag(projectOf(state, r.t)),
                priority(r.t),
                dueCell(r.t),
                person(r.t.assignee)
              ),
              el('p', { class: 'why', text: cap(r.why.join(', ') || 'Next in line') }),
              el('button', { type: 'button', class: 'btn sm', 'data-action': 'open', text: 'Open' })
            )
          )
        )
      : el('p', {
          class: 'start-empty muted',
          text: 'Nothing urgent. Add a task or enjoy the quiet.',
        })
  );
}

/* ---------- key numbers ---------- */

function kpi({ tone, iconName, num, label, sub, trend, alert }) {
  return el(
    'div',
    { class: `kpi tone-${tone}${alert ? ' alert' : ''}` },
    el('span', { class: 'tile' }, icon(iconName, 24)),
    el(
      'div',
      { class: 'kpi-body' },
      el(
        'p',
        { class: 'kpi-main' },
        el('strong', { class: 'kpi-num', text: String(num) }),
        el('span', { class: 'kpi-label', text: label })
      ),
      el(
        'p',
        { class: `kpi-sub ${trend || ''}` },
        trend === 'up' ? icon('arrowUp', 14) : trend === 'down' ? icon('arrowDown', 14) : null,
        sub
      )
    )
  );
}

function kpiRow(s) {
  const diff = s.doneWeek.length - s.doneLastWeek.length;
  const weekSub =
    diff === 0
      ? 'Same as last week'
      : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than last week`;
  return el(
    'div',
    { class: 'kpis' },
    kpi({
      tone: 'blue',
      iconName: 'file',
      num: s.open.length,
      label: 'Open tasks',
      sub: s.highOpen ? `${s.highOpen} high priority` : 'None high priority',
    }),
    kpi({
      tone: 'red',
      iconName: 'clock',
      num: s.overdue.length,
      label: 'Overdue',
      alert: s.overdue.length > 0,
      sub: s.overdue.length
        ? `Oldest is ${s.oldestOverdue} day${s.oldestOverdue === 1 ? '' : 's'} late`
        : 'Nothing overdue',
    }),
    kpi({
      tone: 'amber',
      iconName: 'calendar',
      num: s.soon.length,
      label: 'Due in 7 days',
      sub: s.nextDue ? `Next: ${fmtDate(s.nextDue)}` : 'Nothing scheduled',
    }),
    kpi({
      tone: 'green',
      iconName: 'check',
      num: s.doneWeek.length,
      label: 'Completed this week',
      sub: weekSub,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : '',
    })
  );
}

/* ---------- panels ---------- */

const panel = (cls, ...kids) => el('section', { class: `card panel ${cls}` }, ...kids);

function statusPanel(s, total) {
  return panel(
    'span-5',
    panelHead('Task status breakdown'),
    el(
      'div',
      { class: 'donut-wrap' },
      donutChart(s.counts, total),
      el(
        'ul',
        { class: 'legend' },
        STATUSES.map((st) =>
          el(
            'li',
            {},
            el('i', { class: `status-dot st-${st.id}` }),
            el('span', { class: 'legend-label', text: st.label }),
            el('strong', { text: String(s.counts[st.id]) }),
            el('span', {
              class: 'legend-pct muted',
              text: `${Math.round((s.counts[st.id] / total) * 100)}%`,
            })
          )
        )
      )
    )
  );
}

function trendPanel(tasks) {
  const n = store.ui.trendDays;
  const select = el(
    'select',
    { class: 'field sm', 'data-action': 'trend-range', 'aria-label': 'Chart range' },
    [7, 14, 30].map((d) =>
      el('option', { value: String(d), text: `Last ${d} days`, selected: d === n })
    )
  );
  return panel(
    'span-7',
    panelHead(`Completed in the last ${n} days`, '', select),
    el('div', { class: 'trend-wrap' }, trendChart(completionTrend(tasks, new Date(), n)))
  );
}

function workloadPanel(s, cls) {
  const max = Math.max(1, ...s.workload.map((w) => w.n));
  return panel(
    cls,
    panelHead('Workload (open tasks)'),
    el(
      'ul',
      { class: 'wl-list' },
      s.workload.map((w) =>
        el(
          'li',
          { class: 'wl' },
          avatar(w.id),
          el('span', { class: 'wl-name', text: w.name }),
          el(
            'div',
            { class: 'bar', 'aria-hidden': 'true' },
            el('i', { style: `width:${(w.n / max) * 100}%` })
          ),
          el('strong', { text: String(w.n) })
        )
      )
    )
  );
}

function projectsPanel(tasks) {
  const rows = store.state.projects.map((p) => {
    const pt = tasks.filter((t) => t.project === p.id);
    const done = pt.filter((t) => t.status === 'done').length;
    const pct = pt.length ? Math.round((done / pt.length) * 100) : 0;
    return el(
      'li',
      {},
      el(
        'button',
        { type: 'button', class: 'proj-row', 'data-action': 'project', 'data-project': p.id },
        el(
          'span',
          { class: 'proj-name' },
          el('i', { class: 'dot', style: `background:${p.color}` }),
          p.name
        ),
        el('span', { class: 'muted', text: `${done}/${pt.length}` }),
        el(
          'div',
          { class: 'bar', 'aria-hidden': 'true' },
          el('i', { style: `width:${pct}%;background:${p.color}` })
        ),
        el('strong', { text: `${pct}%` })
      )
    );
  });
  return panel('span-5', panelHead('Project progress'), el('ul', { class: 'proj-list' }, rows));
}

function comingUp(s) {
  const { state } = store;
  return el(
    'section',
    { class: 'card panel coming' },
    el(
      'header',
      { class: 'panel-head' },
      el('span', { class: 'head-icon' }, icon('calendar', 22)),
      el(
        'div',
        { class: 'panel-titles' },
        el('h2', { text: 'Coming up' }),
        el('p', { class: 'muted', text: 'Tasks due soon. Stay on track.' })
      ),
      viewAll('calendar', 'View calendar')
    ),
    s.dueList.length
      ? el(
          'ul',
          { class: 'coming-list' },
          s.dueList.map((t) => {
            const { text, cls } = dueInfo(t);
            return el(
              'li',
              { class: 'coming-row', 'data-id': t.id },
              el('span', { class: `due-chip ${cls}`, text }),
              el('button', {
                type: 'button',
                class: 'title-btn',
                'data-action': 'open',
                text: t.title,
              }),
              el(
                'div',
                { class: 'row-meta' },
                projectTag(projectOf(state, t)),
                person(t.assignee),
                priority(t)
              )
            );
          })
        )
      : el('p', {
          class: 'muted',
          text: 'Nothing scheduled. Add due dates to see upcoming work here.',
        })
  );
}

/* ---------- screen ---------- */

export function renderDashboard() {
  const { state, ui } = store;
  const tasks = projectTasks(state, ui);
  if (!tasks.length) {
    $('#view').replaceChildren(emptyState(false));
    return;
  }
  const s = dashboardStats(tasks);
  $('#view').replaceChildren(
    startHere(),
    kpiRow(s),
    el(
      'div',
      { class: 'dash-grid' },
      statusPanel(s, tasks.length),
      trendPanel(tasks),
      workloadPanel(s, ui.project ? 'span-12' : 'span-7'),
      ui.project ? null : projectsPanel(tasks)
    ),
    comingUp(s)
  );
  // On narrow screens the chart scrolls sideways; start at the right so today is visible.
  const trend = $('.trend-wrap');
  if (trend) trend.scrollLeft = trend.scrollWidth;
}
