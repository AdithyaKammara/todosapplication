/**
 * Everything that talks to Supabase: the client, accounts, workspaces, members and invites.
 * Only loaded when src/backend/env.js is filled in. Every call throws an Error with a readable
 * message, so the UI can show it next to the form that caused it.
 */
import { SUPABASE_ANON_KEY, SUPABASE_JS, SUPABASE_URL } from './env.js';

let client = null;

/** The Supabase client, created on first use from the pinned CDN build. */
export async function sb() {
  if (!client) {
    const { createClient } = await import(SUPABASE_JS);
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** The page address without query or hash: where confirmation and reset emails send people back. */
export const appUrl = () => location.origin + location.pathname;

function check({ data, error }) {
  if (!error) return data;
  const msg = error.message || '';
  if (/failed to fetch|network|load failed/i.test(msg)) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  throw new Error(msg || 'Something went wrong. Please try again.');
}

// ---------- accounts ----------

/** Returns true when the account still has to be confirmed from the email Supabase sends. */
export async function signUp(name, email, password) {
  const data = check(
    await (
      await sb()
    ).auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: appUrl() },
    })
  );
  return !data.session;
}

export async function signIn(email, password) {
  check(await (await sb()).auth.signInWithPassword({ email, password }));
}

export async function signOut() {
  check(await (await sb()).auth.signOut());
}

export async function sendReset(email) {
  check(await (await sb()).auth.resetPasswordForEmail(email, { redirectTo: appUrl() }));
}

export async function setPassword(password) {
  check(await (await sb()).auth.updateUser({ password }));
}

/** The signed-in user, or null. */
export async function currentUser() {
  const data = check(await (await sb()).auth.getSession());
  return data.session ? data.session.user : null;
}

/** Calls `fn(event, session)` on sign-in, sign-out, token refresh and password recovery. */
export async function onAuthChange(fn) {
  (await sb()).auth.onAuthStateChange((event, session) => {
    // run outside Supabase's auth lock, as its docs advise, so our own queries do not deadlock
    setTimeout(() => fn(event, session), 0);
  });
}

// ---------- workspaces ----------

export async function listWorkspaces() {
  return check(
    await (
      await sb()
    )
      .from('workspaces')
      .select('id, name, owner, created_at')
      .order('created_at', { ascending: true })
  );
}

export async function createWorkspace(name) {
  // the id is made here: the owner's membership row is added by a trigger, after the insert
  const id = crypto.randomUUID();
  check(await (await sb()).from('workspaces').insert({ id, name }));
  return id;
}

/** Members of a workspace as `[{ id, name, email, role }]`, owner first. */
export async function listMembers(workspaceId) {
  const client = await sb();
  const rows = check(
    await client
      .from('workspace_members')
      .select('user_id, role, joined_at')
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true })
  );
  const ids = rows.map((r) => r.user_id);
  const profiles = ids.length
    ? check(await client.from('profiles').select('id, name, email').in('id', ids))
    : [];
  return rows
    .map((r) => {
      const p = profiles.find((x) => x.id === r.user_id) || {};
      return {
        id: r.user_id,
        name: p.name || p.email || 'Member',
        email: p.email || '',
        role: r.role,
      };
    })
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
}

export async function removeMember(workspaceId, userId) {
  check(
    await (
      await sb()
    )
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
  );
}

/** Creates a 7-day invite and returns the link to share. */
export async function createInvite(workspaceId) {
  const row = check(
    await (
      await sb()
    )
      .from('workspace_invites')
      .insert({ workspace_id: workspaceId })
      .select('token')
      .single()
  );
  return `${appUrl()}?invite=${row.token}`;
}

/** Joins the workspace behind an invite token and returns its id. */
export async function acceptInvite(token) {
  return check(await (await sb()).rpc('accept_invite', { invite_token: token }));
}

/** The workspace's projects and tasks as a plain `{ projects, tasks }` document. */
export async function loadDoc(workspaceId) {
  const client = await sb();
  const [projects, tasks] = await Promise.all([
    client.from('projects').select('id, data').eq('workspace_id', workspaceId),
    client.from('tasks').select('id, data').eq('workspace_id', workspaceId),
  ]);
  const rows = (res) => check(res).map((r) => ({ ...r.data, id: r.id }));
  return { projects: rows(projects), tasks: rows(tasks) };
}
