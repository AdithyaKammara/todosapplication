/** The "N selected" bar on the list screen: move, assign, delete. */
import { STATUS_IDS } from '../config.js';
import { member, nameOf, statusLabel } from '../model/meta.js';
import { bulkDelete, bulkUpdate, log } from '../store/actions.js';
import { store } from '../store/store.js';
import { $ } from '../utils/dom.js';
import { renderBulk, renderView } from '../views/render.js';

export function initBulk() {
  $('#bulkStatus').addEventListener('change', (e) => {
    const v = e.target.value;
    e.target.value = '';
    if (!STATUS_IDS.includes(v)) return;
    bulkUpdate((t) => {
      if (t.status === v) return;
      log(t, `Status changed: ${statusLabel(t.status)} → ${statusLabel(v)}`);
      t.status = v;
      t.completedAt = v === 'done' ? Date.now() : null;
    });
  });

  $('#bulkAssign').addEventListener('change', (e) => {
    const v = e.target.value;
    e.target.value = '';
    if (!v) return;
    const to = v === '_none' ? '' : v;
    if (to && !member(to)) return;
    bulkUpdate((t) => {
      if (t.assignee === to) return;
      log(t, `Assignee changed: ${nameOf(t.assignee)} → ${nameOf(to)}`);
      t.assignee = to;
    });
  });

  $('#bulkDelete').addEventListener('click', bulkDelete);

  $('#bulkClear').addEventListener('click', () => {
    store.ui.selected.clear();
    renderView();
    renderBulk();
  });
}
