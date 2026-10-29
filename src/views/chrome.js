/** The app frame: sidebar, page header, filter bar, bulk bar and the undo/redo buttons. */
import { ME, PRIORITIES, QUOTES, STATUSES, TEAM, VIEW_TITLES } from '../config.js';
import { projectTasks } from '../model/selectors.js';
import { history, store } from '../store/store.js';
import { fmtMonth } from '../utils/dates.js';
import { $, $$, el, icon } from '../utils/dom.js';
import { cap } from '../utils/text.js';

function navItem(iconName, label, opts = {}) {
  return el(
    'button',
    {
      type: 'button',
      class: 'nav-item',
      ...(opts.attrs || {}),
      'aria-current': opts.active ? 'page' : null,
    },
    icon(iconName),
    el('span', { class: 'nav-label', text: label }),
    opts.badge ? el('span', { class: 'nav-badge', text: String(opts.badge) }) : null
  );
}

export function renderSidebar() {
  const { state, ui } = store;
  const key = ui.view === 'list' ? (ui.assignee === ME ? 'mine' : 'list') : ui.view;
  const mineOpen = state.tasks.filter((t) => t.assignee === ME && t.status !== 'done').length;

  $('#nav').replaceChildren(
    navItem('dashboard', 'Dashboard', {
      active: key === 'dashboard',
      attrs: { 'data-go': 'dashboard' },
    }),
    navItem('check', 'My tasks', {
      active: key === 'mine',
      badge: mineOpen,
      attrs: { 'data-go': 'mine' },
    }),
    navItem('list', 'All tasks', { active: key === 'list', attrs: { 'data-go': 'list' } }),
    navItem('board', 'Board', { active: key === 'board', attrs: { 'data-go': 'board' } }),
    navItem('calendar', 'Calendar', {
      active: key === 'calendar',
      attrs: { 'data-go': 'calendar' },
    }),
    navItem('spark', 'What next?', { attrs: { 'data-next': '1' } })
  );

  const open = (id) =>
    state.tasks.filter((t) => (!id || t.project === id) && t.status !== 'done').length;
  const projItem = (label, color, id) =>
    el(
      'button',
      {
        type: 'button',
        class: 'nav-item',
        'data-project': id,
        'aria-current': ui.project === id ? 'page' : null,
      },
      el('i', { class: 'dot', style: `background:${color}` }),
      el('span', { class: 'nav-label', text: label }),
      el('span', { class: 'nav-badge', text: String(open(id)) })
    );

  $('#projectNav').replaceChildren(
    projItem('All projects', 'var(--muted)', ''),
    ...state.projects.map((p) => projItem(p.name, p.color, p.id))
  );
}

export function renderHead() {
  const { state, ui } = store;
  const proj = state.projects.find((p) => p.id === ui.project);
  let title = VIEW_TITLES[ui.view];
  if (ui.view === 'list' && ui.assignee === ME) title = 'My tasks';
  document.title = `${title} · TaskFlow`;
  const now = new Date();
  const first = (TEAM.find((m) => m.id === ME)?.name || '').split(' ')[0];
  const hour = now.getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const heading = $('#pageTitle');
  const sub = $('#pageSub');
  const greeting = ui.view === 'dashboard' && !proj;

  if (greeting) {
    heading.replaceChildren(
      first ? `${hello}, ${first}` : hello,
      el(
        'span',
        { class: `greet-icon ${hour < 18 ? 'day' : 'night'}` },
        icon(hour < 18 ? 'sun' : 'moon', 26)
      )
    );
    $('#crumb').textContent = now.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    sub.textContent = 'A clear view of what needs your attention.';
  } else {
    heading.textContent = title;
    $('#crumb').textContent = proj ? proj.name : 'All projects';
    sub.textContent = '';
  }

  const actions = $('#pageActions');
  actions.replaceChildren();
  if (greeting) {
    const dayIndex = Math.floor(now.getTime() / 86400000);
    const [line, follow] = QUOTES[dayIndex % QUOTES.length];
    actions.append(
      el(
        'aside',
        { class: 'quote', 'aria-label': 'Daily reminder' },
        el(
          'div',
          {},
          el('p', { class: 'quote-line', text: `\u201C${line}\u201D` }),
          el('p', { class: 'muted', text: follow })
        )
      )
    );
  }
  if (ui.view === 'calendar') {
    actions.append(
      el(
        'button',
        {
          type: 'button',
          class: 'icon-btn bordered',
          'data-cal': 'prev',
          'aria-label': 'Previous month',
        },
        icon('chevL')
      ),
      el('span', { class: 'cal-title', 'aria-live': 'polite', text: fmtMonth(ui.calMonth) }),
      el(
        'button',
        {
          type: 'button',
          class: 'icon-btn bordered',
          'data-cal': 'next',
          'aria-label': 'Next month',
        },
        icon('chevR')
      ),
      el('button', { type: 'button', class: 'btn', 'data-cal': 'today', text: 'Today' })
    );
  }
}

export function renderFilters() {
  const { state, ui } = store;
  const isDash = ui.view === 'dashboard';
  $('#filters').hidden = isDash;
  $('#sortSelect').hidden = ui.view !== 'list';
  $('#assigneeFilter').value = ui.assignee;
  $('#priorityFilter').value = ui.priority;
  $('#sortSelect').value = ui.sort;

  const pillsEl = $('#quickPills');
  if (!pillsEl) return;
  pillsEl.hidden = isDash;
  if (isDash) return;

  const tags = [...new Set(projectTasks(state, ui).flatMap((t) => t.tags))].slice(0, 6);
  const pills = [
    ['all', 'All'],
    ['today', 'Due Today'],
    ['overdue', 'Overdue'],
    ['unassigned', 'Unassigned'],
    ...tags.map((g) => [`#${g}`, `#${g}`]),
  ];
  pillsEl.replaceChildren(
    ...pills.map(([id, label]) =>
      el('button', {
        type: 'button',
        class: `pill${ui.quickChip === id ? ' active' : ''}`,
        'data-chip': id,
        text: label,
      })
    )
  );
}

export function renderBulk() {
  const { state, ui } = store;
  ui.selected.forEach((id) => {
    if (!state.tasks.some((t) => t.id === id)) ui.selected.delete(id);
  });
  const show = ui.view === 'list' && ui.selected.size > 0;
  $('#bulkBar').hidden = !show;
  if (show) $('#bulkCount').textContent = `${ui.selected.size} selected`;
}

export function updateHistoryButtons() {
  $('#undoBtn').disabled = !history.canUndo;
  $('#redoBtn').disabled = !history.canRedo;
}

/** One-time setup: put icons into the static buttons and fill the <select> options. */
export function initChrome() {
  $('#menuBtn').replaceChildren(icon('menu', 20));
  $('#addProjectBtn').replaceChildren(icon('plus', 16));
  $('#settingsBtn').replaceChildren(
    icon('settings'),
    el('span', { class: 'nav-label', text: 'Settings' })
  );
  $('#paletteBtn').replaceChildren(
    icon('search', 16),
    el('span', { text: 'Search' }),
    el('kbd', { text: 'Ctrl K' })
  );
  $('#nextBtn').replaceChildren(icon('spark', 16), el('span', { text: 'What next?' }));
  $('#undoBtn').replaceChildren(icon('undo', 20));
  $('#redoBtn').replaceChildren(icon('redo', 20));
  if ($('#helpBtn')) $('#helpBtn').replaceChildren(icon('help', 20));
  $$('[data-dlg-close][aria-label]').forEach((b) => b.replaceChildren(icon('close')));

  const opt = (v, l) => el('option', { value: v, text: l });
  $('#assigneeFilter').replaceChildren(
    opt('', 'All assignees'),
    ...TEAM.map((m) => opt(m.id, m.name))
  );
  $('#priorityFilter').replaceChildren(
    opt('', 'Any priority'),
    ...PRIORITIES.map((p) => opt(p, cap(p)))
  );
  $('#sortSelect').replaceChildren(
    opt('due', 'Sort: Due date'),
    opt('priority', 'Sort: Priority'),
    opt('newest', 'Sort: Newest'),
    opt('title', 'Sort: Title')
  );
  $('#bulkStatus').replaceChildren(opt('', 'Move to…'), ...STATUSES.map((s) => opt(s.id, s.label)));
  $('#bulkAssign').replaceChildren(
    opt('', 'Assign to…'),
    opt('_none', 'Unassigned'),
    ...TEAM.map((m) => opt(m.id, m.name))
  );
}
