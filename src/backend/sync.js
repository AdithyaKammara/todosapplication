/**
 * Live sync of the open workspace with Supabase.
 *
 * Outgoing: after every save the store emits 'saved'; we diff the document against what the server
 * last confirmed and upsert or delete only those rows. Writes run one at a time, in order.
 * Incoming: a realtime channel delivers teammates' inserts, updates and deletes, which are applied
 * with `applyRemote()` (no undo step, not echoed back). Our own writes carry this tab's id in
 * `updated_by`, so their echoes are ignored. Conflicts resolve per task: the last write wins.
 */
import { applyRow, diffDoc, index } from '../model/diff.js';
import { member } from '../model/meta.js';
import { emit, on } from '../store/events.js';
import { applyRemote, store } from '../store/store.js';
import { uid } from '../utils/text.js';
import { loadDoc, sb } from './cloud.js';

const TAB_ID = 'tab-' + uid();
const TABLES = ['projects', 'tasks'];
const RETRY_MS = 5000;

let workspaceId = null;
let synced = { projects: new Map(), tasks: new Map() };
let channel = null;
let refreshMembers = async () => {};
let queue = Promise.resolve();
let pending = 0;
let failed = false;
let retryTimer = 0;
let wasSubscribed = false;

/** 'synced' | 'saving' | 'offline'. The sidebar shows it next to the account. */
function setStatus() {
  emit('sync', failed ? 'offline' : pending ? 'saving' : 'synced');
}

const snapshotOf = (state) => ({ projects: index(state.projects), tasks: index(state.tasks) });

async function write(table, upserts, deletes) {
  const client = await sb();
  if (upserts.length) {
    const at = new Date().toISOString();
    const rows = upserts.map((row) => ({
      workspace_id: workspaceId,
      id: row.id,
      data: row,
      updated_by: TAB_ID,
      updated_at: at,
    }));
    const { error } = await client.from(table).upsert(rows);
    if (error) throw error;
  }
  if (deletes.length) {
    const { error } = await client
      .from(table)
      .delete()
      .eq('workspace_id', workspaceId)
      .in('id', deletes);
    if (error) throw error;
  }
}

/** Queue the difference between `state` and the last synced snapshot. */
function flush(state) {
  if (!workspaceId) return;
  const d = diffDoc(synced, state);
  const jobs = TABLES.map((table) => ({
    table,
    upserts: d[table].upserts.map((id) => JSON.parse(d.next[table].get(id))),
    deletes: d[table].deletes,
    before: synced[table],
  })).filter((j) => j.upserts.length || j.deletes.length);
  if (!jobs.length) return;
  synced = d.next;
  const ws = workspaceId;
  pending++;
  setStatus();
  queue = queue
    .then(async () => {
      if (ws !== workspaceId) return; // switched workspace while queued
      for (const j of jobs) await write(j.table, j.upserts, j.deletes);
      failed = false;
    })
    .catch(() => {
      if (ws !== workspaceId) return;
      // forget what we assumed was saved so the next flush sends these rows again
      for (const j of jobs) {
        for (const row of j.upserts) synced[j.table].delete(row.id);
        for (const id of j.deletes) synced[j.table].set(id, j.before.get(id) || '');
      }
      failed = true;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => flush(store.state), RETRY_MS);
    })
    .finally(() => {
      pending--;
      setStatus();
    });
}

// remote events are applied strictly in arrival order, even when one waits for the member list
let inbox = Promise.resolve();
const receive = (table, payload) => {
  inbox = inbox.then(() => onRemote(table, payload)).catch(() => {});
};

async function onRemote(table, payload) {
  if (payload.eventType === 'DELETE') {
    const old = payload.old || {};
    if (old.workspace_id !== workspaceId || !old.id) return;
    synced[table].delete(old.id);
    applyRemote((state) => {
      state[table] = applyRow(state[table], old.id, null);
    });
    return;
  }
  const row = payload.new || {};
  if (row.workspace_id !== workspaceId || row.updated_by === TAB_ID || !row.id) return;
  // assigned to someone who joined a moment ago: load them first, or sanitising drops the assignee
  const who = row.data && row.data.assignee;
  if (table === 'tasks' && who && !member(who)) await refreshMembers();
  if (row.workspace_id !== workspaceId) return;
  applyRemote((state) => {
    state[table] = applyRow(state[table], row.id, { ...row.data, id: row.id });
  });
  // record what the store kept after sanitising, so the next local save does not resend it
  const kept = store.state[table].find((r) => r.id === row.id);
  if (kept) synced[table].set(row.id, JSON.stringify(kept));
}

/** Pull the whole workspace again, after a dropped connection may have missed events. */
async function catchUp() {
  const ws = workspaceId;
  await queue;
  const doc = await loadDoc(ws);
  if (ws !== workspaceId) return;
  applyRemote((state) => {
    state.projects = doc.projects;
    state.tasks = doc.tasks;
  });
  synced = snapshotOf(store.state);
}

/**
 * Start syncing `id`, whose current document is already in the store. `onMembers` is called when
 * someone joins or leaves, so the caller can refresh the team.
 */
export async function startSync(id, onMembers) {
  await stopSync();
  workspaceId = id;
  refreshMembers = onMembers;
  synced = snapshotOf(store.state);
  failed = false;
  wasSubscribed = false;
  setStatus();

  const client = await sb();
  const filter = `workspace_id=eq.${id}`;
  channel = client.channel(`ws-${id}`);
  for (const table of TABLES) {
    for (const event of ['INSERT', 'UPDATE']) {
      channel.on('postgres_changes', { event, schema: 'public', table, filter }, (p) =>
        receive(table, p)
      );
    }
    // delete events cannot be filtered on the server; onRemote checks the workspace instead
    channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (p) =>
      receive(table, p)
    );
  }
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'workspace_members' },
    (p) => {
      const r = p.new && p.new.workspace_id ? p.new : p.old || {};
      if (r.workspace_id === workspaceId) onMembers();
    }
  );
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (wasSubscribed) catchUp().catch(() => {});
      wasSubscribed = true;
      failed = false;
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      failed = true;
    }
    setStatus();
  });
}

export async function stopSync() {
  clearTimeout(retryTimer);
  await queue.catch(() => {});
  workspaceId = null;
  if (channel) {
    const client = await sb();
    await client.removeChannel(channel);
    channel = null;
  }
}

on('saved', (state) => flush(state));
