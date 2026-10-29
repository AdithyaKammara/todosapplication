/** The task detail panel (a right-hand <dialog>): fields, subtasks, comments and activity log. */
import { ME, MAX_DESC, MAX_SUBS, MAX_TITLE, PRIORITIES, STATUSES, TEAM } from '../config.js';
import { member, nameOf } from '../model/meta.js';
import { cleanTags } from '../model/sanitize.js';
import { byId } from '../model/selectors.js';
import { deleteTask, setStatus, updateTask } from '../store/actions.js';
import { on } from '../store/events.js';
import { store } from '../store/store.js';
import { avatar } from '../views/shared.js';
import { ago, fmtDate, isValidISO } from '../utils/dates.js';
import { $, closeDlg, el, icon, openDlg } from '../utils/dom.js';
import { cap, clean, truncate, uid } from '../utils/text.js';

const drawer = () => $('#drawer');

const propField = (label, control) =>
  el('label', { class: 'prop' }, el('span', { class: 'prop-label', text: label }), control);

const selectEl = (field, options, value) =>
  el(
    'select',
    { class: 'field', 'data-field': field },
    options.map(([v, l]) => el('option', { value: v, text: l, selected: v === value }))
  );

function subtasksNodes(t) {
  const n = t.subtasks.length;
  const done = t.subtasks.filter((s) => s.done).length;
  return [
    el('h3', {}, 'Subtasks', el('span', { class: 'count', text: n ? `${done}/${n}` : '0' })),
    n
      ? el(
          'div',
          { class: 'bar', 'aria-hidden': 'true' },
          el('i', { style: `width:${Math.round((done / n) * 100)}%` })
        )
      : null,
    n
      ? el(
          'ul',
          { class: 'sub-list' },
          t.subtasks.map((s) =>
            el(
              'li',
              { class: s.done ? 'done' : '' },
              el(
                'label',
                { class: 'sub-item' },
                el('input', {
                  type: 'checkbox',
                  class: 'check',
                  'data-sub-toggle': s.id,
                  checked: s.done,
                }),
                el('span', { text: s.text })
              ),
              el(
                'button',
                {
                  type: 'button',
                  class: 'icon-btn sm',
                  'data-sub-del': s.id,
                  'aria-label': `Delete subtask "${s.text}"`,
                },
                icon('close', 14)
              )
            )
          )
        )
      : null,
    el(
      'form',
      { class: 'inline-form', 'data-form': 'sub' },
      el('input', {
        class: 'field',
        name: 'text',
        type: 'text',
        maxlength: 120,
        autocomplete: 'off',
        placeholder: 'Add a subtask',
        'aria-label': 'New subtask',
      }),
      el('button', { class: 'btn', type: 'submit', text: 'Add' })
    ),
  ];
}

function commentsNodes(t) {
  return [
    el('h3', {}, 'Comments', el('span', { class: 'count', text: String(t.comments.length) })),
    t.comments.length
      ? el(
          'ul',
          { class: 'comments' },
          t.comments.map((c) => {
            const m = member(c.author) || TEAM[0];
            return el(
              'li',
              {},
              avatar(m.id),
              el(
                'div',
                {},
                el(
                  'p',
                  { class: 'c-head' },
                  el('strong', { text: m.name }),
                  el('span', { class: 'muted', text: ` · ${ago(c.at)}` })
                ),
                el('p', { class: 'c-text', text: c.text })
              )
            );
          })
        )
      : null,
    el(
      'form',
      { class: 'inline-form', 'data-form': 'comment' },
      el('input', {
        class: 'field',
        name: 'text',
        type: 'text',
        maxlength: 500,
        autocomplete: 'off',
        placeholder: 'Write a comment…',
        'aria-label': 'New comment',
      }),
      el('button', { class: 'btn btn-primary', type: 'submit', text: 'Post' })
    ),
  ];
}

function logNodes(t) {
  return [
    el('h3', { text: 'Activity' }),
    el(
      'ul',
      { class: 'log' },
      t.log
        .slice()
        .reverse()
        .slice(0, 15)
        .map((l) => el('li', {}, el('span', { text: l.text }), el('span', { text: ago(l.at) })))
    ),
  ];
}

export function buildDrawer(t) {
  const { state } = store;
  return el(
    'div',
    { class: 'drawer-inner' },
    el(
      'header',
      { class: 'drawer-head' },
      el('span', { class: 'muted', text: `Created ${ago(t.createdAt)}` }),
      el(
        'button',
        { type: 'button', class: 'icon-btn', 'data-drawer': 'close', 'aria-label': 'Close panel' },
        icon('close')
      )
    ),
    el(
      'div',
      { class: 'drawer-body' },
      el('input', {
        class: 'd-title',
        'data-field': 'title',
        value: t.title,
        maxlength: MAX_TITLE,
        'aria-label': 'Task title',
      }),
      el(
        'div',
        { class: 'props' },
        propField(
          'Status',
          selectEl(
            'status',
            STATUSES.map((s) => [s.id, s.label]),
            t.status
          )
        ),
        propField(
          'Priority',
          selectEl(
            'priority',
            PRIORITIES.map((p) => [p, cap(p)]),
            t.priority
          )
        ),
        propField(
          'Assignee',
          selectEl('assignee', [['', 'Unassigned'], ...TEAM.map((m) => [m.id, m.name])], t.assignee)
        ),
        propField(
          'Project',
          selectEl(
            'project',
            state.projects.map((p) => [p.id, p.name]),
            t.project
          )
        ),
        propField(
          'Due date',
          el('input', { class: 'field', type: 'date', 'data-field': 'due', value: t.due })
        ),
        propField(
          'Tags',
          el('input', {
            class: 'field',
            type: 'text',
            'data-field': 'tags',
            value: t.tags.map((g) => '#' + g).join(' '),
            placeholder: '#design #q4',
          })
        )
      ),
      el(
        'label',
        { class: 'prop block' },
        el('span', { class: 'prop-label', text: 'Description' }),
        el('textarea', {
          class: 'field',
          'data-field': 'description',
          rows: '4',
          maxlength: MAX_DESC,
          placeholder: 'Add context, links or acceptance criteria…',
          text: t.description,
        })
      ),
      el('section', { class: 'dsec', id: 'd-subs' }, ...subtasksNodes(t)),
      el('section', { class: 'dsec', id: 'd-comments' }, ...commentsNodes(t)),
      el('section', { class: 'dsec', id: 'd-log' }, ...logNodes(t))
    ),
    el(
      'footer',
      { class: 'drawer-foot' },
      el('button', {
        type: 'button',
        class: 'btn danger',
        'data-drawer': 'delete',
        text: 'Delete task',
      })
    )
  );
}

/** Re-render only subtasks / comments / activity, so the field inputs keep focus and text. */
function renderDrawerParts(t) {
  const d = drawer();
  const subs = $('#d-subs', d);
  const com = $('#d-comments', d);
  const lg = $('#d-log', d);
  if (!subs || !com || !lg) return;
  subs.replaceChildren(...subtasksNodes(t));
  com.replaceChildren(...commentsNodes(t));
  lg.replaceChildren(...logNodes(t));
}

export function openDrawer(id) {
  const t = byId(store.state, id);
  if (!t) return;
  store.ui.drawerId = id;
  drawer().replaceChildren(buildDrawer(t));
  openDlg(drawer());
}

/** Rebuild the open drawer after undo/redo or a change from another tab. */
function rebuildDrawer() {
  if (!store.ui.drawerId) return;
  const t = byId(store.state, store.ui.drawerId);
  if (t) drawer().replaceChildren(buildDrawer(t));
  else closeDlg(drawer());
}

export function initDrawer() {
  const d = drawer();
  on('drawer:parts', renderDrawerParts);
  on('drawer:rebuild', rebuildDrawer);

  d.addEventListener('close', () => {
    store.ui.drawerId = null;
  });

  d.addEventListener('click', (e) => {
    const b = e.target.closest('[data-drawer],[data-sub-del]');
    if (!b) return;
    if (b.dataset.drawer === 'close') closeDlg(d);
    else if (b.dataset.drawer === 'delete') {
      const id = store.ui.drawerId;
      closeDlg(d);
      deleteTask(id);
    } else if (b.dataset.subDel) {
      const t = byId(store.state, store.ui.drawerId);
      const s = t && t.subtasks.find((x) => x.id === b.dataset.subDel);
      if (s) {
        updateTask(
          t.id,
          { subtasks: t.subtasks.filter((x) => x.id !== s.id) },
          `Subtask removed: ${truncate(s.text, 40)}`
        );
      }
    }
  });

  d.addEventListener('change', (e) => {
    const t = byId(store.state, store.ui.drawerId);
    if (!t) return;

    if (e.target.dataset.subToggle) {
      const s = t.subtasks.find((x) => x.id === e.target.dataset.subToggle);
      if (!s) return;
      s.done = e.target.checked;
      updateTask(t.id, {}, `Subtask ${s.done ? 'completed' : 'reopened'}: ${truncate(s.text, 40)}`);
      const again = d.querySelector(`[data-sub-toggle="${s.id}"]`);
      if (again) again.focus();
      return;
    }

    const f = e.target.dataset.field;
    if (!f) return;
    const v = e.target.value;
    switch (f) {
      case 'title': {
        const title = clean(v, MAX_TITLE);
        if (!title) {
          e.target.value = t.title;
          return;
        }
        if (title !== t.title) updateTask(t.id, { title }, 'Title edited');
        e.target.value = title;
        break;
      }
      case 'description':
        if (v !== t.description) {
          updateTask(t.id, { description: v.slice(0, MAX_DESC) }, 'Description updated');
        }
        break;
      case 'status':
        setStatus(t.id, v);
        break;
      case 'priority':
        if (PRIORITIES.includes(v) && v !== t.priority) {
          updateTask(t.id, { priority: v }, `Priority changed: ${cap(t.priority)} → ${cap(v)}`);
        }
        break;
      case 'assignee': {
        const to = member(v) ? v : '';
        if (to === t.assignee) break;
        updateTask(
          t.id,
          { assignee: to },
          `Assignee changed: ${nameOf(t.assignee)} → ${nameOf(to)}`
        );
        break;
      }
      case 'project': {
        const p = store.state.projects.find((x) => x.id === v);
        if (p && p.id !== t.project)
          updateTask(t.id, { project: p.id }, `Moved to project ${p.name}`);
        break;
      }
      case 'due': {
        const due = isValidISO(v) ? v : '';
        if (due !== t.due) {
          updateTask(t.id, { due }, due ? `Due date set to ${fmtDate(due)}` : 'Due date cleared');
        }
        break;
      }
      case 'tags': {
        const tags = cleanTags(v.split(/[\s,]+/));
        if (tags.join() !== t.tags.join()) updateTask(t.id, { tags }, 'Tags updated');
        e.target.value = tags.map((g) => '#' + g).join(' ');
        break;
      }
      default:
        break;
    }
  });

  d.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.closest('form[data-form]');
    const t = byId(store.state, store.ui.drawerId);
    if (!f || !t) return;
    const input = f.elements.text;
    if (f.dataset.form === 'sub') {
      const text = clean(input.value, 120);
      if (!text || t.subtasks.length >= MAX_SUBS) return;
      t.subtasks.push({ id: uid(), text, done: false });
      updateTask(t.id, {}, `Subtask added: ${truncate(text, 40)}`);
    } else {
      const text = input.value.trim().slice(0, 500);
      if (!text) return;
      t.comments.push({ id: uid(), author: ME, text, at: Date.now() });
      updateTask(t.id, {});
    }
    const again = d.querySelector(`form[data-form="${f.dataset.form}"] input`);
    if (again) again.focus();
  });

  d.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.dataset.field)
      e.target.blur();
  });
}
