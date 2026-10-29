/**
 * Accounts and teams (cloud mode only): the sign-in screen, the session, the workspace switcher,
 * the Team dialog (members, invite links, new workspace, leave) and log out.
 * In local mode `initAccount()` returns at once and the app behaves as before.
 */
import { KEYS, PROJECT_COLORS, setTeam } from '../config.js';
import { cloudEnabled } from '../backend/env.js';
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  currentUser,
  listMembers,
  listWorkspaces,
  loadDoc,
  onAuthChange,
  removeMember,
  sendReset,
  setPassword,
  signIn,
  signOut,
  signUp,
} from '../backend/cloud.js';
import { startSync, stopSync } from '../backend/sync.js';
import { on } from '../store/events.js';
import { readPref, writePref } from '../store/storage.js';
import { render, replaceAll } from '../store/store.js';
import { $, closeDlg, el, icon, openDlg } from '../utils/dom.js';
import { clean, initials } from '../utils/text.js';
import { avatar } from '../views/shared.js';
import { closeNav } from './layout.js';
import { toast } from './toast.js';

const MIN_PASSWORD = 8;

let user = null; // { id, name, email }
let workspaceId = null;
let workspaces = [];
let members = [];
let recovering = false;
let syncState = 'synced';

const colorFor = (id) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
};

const myRole = () => (members.find((m) => m.id === user?.id) || {}).role;
const currentWorkspace = () => workspaces.find((w) => w.id === workspaceId);

// ---------- sign-in screen ----------

function input(id, label, type, attrs = {}) {
  return el(
    'label',
    { class: 'prop block' },
    el('span', { class: 'prop-label', text: label }),
    el('input', { id, name: id, class: 'field', type, required: true, ...attrs })
  );
}

const linkBtn = (text, mode) =>
  el('button', { type: 'button', class: 'link', 'data-auth': mode, text });

const SCREENS = {
  loading: (msg) => [
    el('h1', { id: 'authTitle', class: 'auth-title', text: 'TaskFlow' }),
    el('p', { class: 'muted', text: msg || 'Loading…' }),
  ],
  signin: () => [
    el('h1', { id: 'authTitle', class: 'auth-title', text: 'Sign in' }),
    readPref(KEYS.invite)
      ? el('p', { class: 'auth-note', text: 'Sign in or create an account to join your team.' })
      : null,
    el(
      'form',
      { class: 'auth-form', 'data-form': 'signin', novalidate: true },
      input('authEmail', 'Email', 'email', { autocomplete: 'email' }),
      input('authPassword', 'Password', 'password', { autocomplete: 'current-password' }),
      el('p', { id: 'authError', class: 'form-error', role: 'alert' }),
      el('button', { class: 'btn btn-primary auth-submit', type: 'submit', text: 'Sign in' })
    ),
    el(
      'div',
      { class: 'auth-links' },
      linkBtn('Forgot your password?', 'reset'),
      linkBtn('Create an account', 'signup')
    ),
  ],
  signup: () => [
    el('h1', { id: 'authTitle', class: 'auth-title', text: 'Create your account' }),
    el(
      'form',
      { class: 'auth-form', 'data-form': 'signup', novalidate: true },
      input('authName', 'Your name', 'text', { autocomplete: 'name', maxlength: '60' }),
      input('authEmail', 'Email', 'email', { autocomplete: 'email' }),
      input('authPassword', 'Password', 'password', {
        autocomplete: 'new-password',
        minlength: String(MIN_PASSWORD),
        'aria-describedby': 'authPwRule',
      }),
      el('p', { id: 'authPwRule', class: 'muted', text: `At least ${MIN_PASSWORD} characters.` }),
      el('p', { id: 'authError', class: 'form-error', role: 'alert' }),
      el('button', { class: 'btn btn-primary auth-submit', type: 'submit', text: 'Create account' })
    ),
    el('div', { class: 'auth-links' }, linkBtn('I already have an account', 'signin')),
  ],
  reset: () => [
    el('h1', { id: 'authTitle', class: 'auth-title', text: 'Reset your password' }),
    el('p', { class: 'muted', text: 'We will email you a link to choose a new password.' }),
    el(
      'form',
      { class: 'auth-form', 'data-form': 'reset', novalidate: true },
      input('authEmail', 'Email', 'email', { autocomplete: 'email' }),
      el('p', { id: 'authError', class: 'form-error', role: 'alert' }),
      el('button', {
        class: 'btn btn-primary auth-submit',
        type: 'submit',
        text: 'Send reset link',
      })
    ),
    el('div', { class: 'auth-links' }, linkBtn('Back to sign in', 'signin')),
  ],
  sent: (email) => [
    el('h1', { id: 'authTitle', class: 'auth-title', text: 'Check your email' }),
    el('p', { text: `We sent a link to ${email}. Open it on this device to continue.` }),
    el('div', { class: 'auth-links' }, linkBtn('Back to sign in', 'signin')),
  ],
  newpw: () => [
    el('h1', { id: 'authTitle', class: 'auth-title', text: 'Choose a new password' }),
    el(
      'form',
      { class: 'auth-form', 'data-form': 'newpw', novalidate: true },
      input('authPassword', 'New password', 'password', {
        autocomplete: 'new-password',
        minlength: String(MIN_PASSWORD),
        'aria-describedby': 'authPwRule',
      }),
      el('p', { id: 'authPwRule', class: 'muted', text: `At least ${MIN_PASSWORD} characters.` }),
      el('p', { id: 'authError', class: 'form-error', role: 'alert' }),
      el('button', { class: 'btn btn-primary auth-submit', type: 'submit', text: 'Save password' })
    ),
  ],
};

function showAuth(mode, arg) {
  document.body.classList.add('signed-out');
  $('#auth').hidden = false;
  $('#authBody').replaceChildren(...SCREENS[mode](arg).filter(Boolean));
  const first = $('#authBody input');
  if (first) first.focus();
}

function hideAuth() {
  document.body.classList.remove('signed-out');
  $('#auth').hidden = true;
  $('#authBody').replaceChildren();
}

const valueOf = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');

function validate(kind) {
  const email = valueOf('authEmail');
  const pw = $('#authPassword') ? $('#authPassword').value : '';
  if (kind === 'signup' && !valueOf('authName')) return ['authName', 'Enter your name.'];
  if (kind !== 'newpw' && !/^\S+@\S+\.\S+$/.test(email)) {
    return ['authEmail', 'Enter a valid email address.'];
  }
  if (kind === 'signin' && !pw) return ['authPassword', 'Enter your password.'];
  if ((kind === 'signup' || kind === 'newpw') && pw.length < MIN_PASSWORD) {
    return ['authPassword', `Use at least ${MIN_PASSWORD} characters.`];
  }
  return null;
}

async function submitAuth(form) {
  const kind = form.dataset.form;
  const errorEl = $('#authError');
  const bad = validate(kind);
  if (bad) {
    errorEl.textContent = bad[1];
    $('#' + bad[0]).setAttribute('aria-invalid', 'true');
    $('#' + bad[0]).focus();
    return;
  }
  const btn = $('.auth-submit', form);
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Please wait…';
  errorEl.textContent = '';
  try {
    const email = valueOf('authEmail');
    const pw = $('#authPassword') ? $('#authPassword').value : '';
    if (kind === 'signin') await signIn(email, pw);
    else if (kind === 'signup') {
      const mustConfirm = await signUp(clean(valueOf('authName'), 60), email, pw);
      if (mustConfirm) return showAuth('sent', email);
    } else if (kind === 'reset') {
      await sendReset(email);
      return showAuth('sent', email);
    } else if (kind === 'newpw') {
      await setPassword(pw);
      recovering = false;
      toast('Password updated');
      const signedIn = await currentUser();
      if (signedIn) await enter(signedIn);
      return;
    }
    // signin / confirmed signup: onAuthChange takes over from here
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    if (btn.isConnected) {
      btn.disabled = false;
      btn.textContent = label;
    }
  }
}

// ---------- session ----------

async function handleAuth(event, session) {
  if (event === 'PASSWORD_RECOVERY') {
    recovering = true;
    return showAuth('newpw');
  }
  if (recovering) return; // stay on "choose a new password" until it is saved
  if (!session) {
    if (user) await leaveApp();
    return showAuth('signin');
  }
  if (user && session.user.id === user.id) return; // token refresh
  await enter(session.user);
}

async function enter(authUser) {
  user = {
    id: authUser.id,
    email: authUser.email || '',
    name: (authUser.user_metadata && authUser.user_metadata.name) || authUser.email || 'You',
  };
  showAuth('loading', 'Opening your workspace…');
  try {
    let joined = null;
    const invite = readPref(KEYS.invite);
    if (invite) {
      writePref(KEYS.invite, '');
      try {
        joined = await acceptInvite(invite);
      } catch (err) {
        setTimeout(() => toast(err.message), 0);
      }
    }
    workspaces = await listWorkspaces();
    if (!workspaces.length) {
      await createWorkspace(`${user.name.split(' ')[0]}'s workspace`);
      workspaces = await listWorkspaces();
    }
    const saved = readPref(KEYS.workspace);
    const pick = joined || (workspaces.some((w) => w.id === saved) ? saved : workspaces[0].id);
    await openWorkspace(pick);
    hideAuth();
    renderAccount();
    if (joined) toast(`You joined ${currentWorkspace()?.name || 'the workspace'}`);
  } catch (err) {
    user = null;
    showAuth('signin');
    $('#authError').textContent = `Could not open your workspace: ${err.message}`;
  }
}

async function leaveApp() {
  await stopSync();
  user = null;
  workspaceId = null;
  workspaces = [];
  members = [];
  setTeam([], '');
  replaceAll({});
  closeDlg($('#teamDlg'));
}

function applyMembers(list) {
  members = list;
  setTeam(
    list.map((m) => ({ id: m.id, name: m.name, color: colorFor(m.id) })),
    user.id
  );
}

async function openWorkspace(id) {
  const [list, doc] = await Promise.all([listMembers(id), loadDoc(id)]);
  workspaceId = id;
  writePref(KEYS.workspace, id);
  applyMembers(list); // before the document, so assignees are recognised when it is sanitised
  replaceAll(doc);
  await startSync(id, refreshMembers);
  renderWorkspacePick();
  renderTeam();
}

async function refreshMembers() {
  if (!workspaceId) return;
  const list = await listMembers(workspaceId).catch(() => null);
  if (!list) return;
  if (!list.some((m) => m.id === user.id)) {
    toast(`You are no longer a member of ${currentWorkspace()?.name || 'that workspace'}`);
    return switchAfterLeaving();
  }
  applyMembers(list);
  render();
  renderTeam();
}

async function switchAfterLeaving() {
  workspaces = await listWorkspaces();
  if (!workspaces.length) {
    await createWorkspace(`${user.name.split(' ')[0]}'s workspace`);
    workspaces = await listWorkspaces();
  }
  await openWorkspace(workspaces[0].id);
}

// ---------- sidebar: workspace switcher and account ----------

function renderWorkspacePick() {
  const sel = $('#workspaceSelect');
  sel.replaceChildren(
    ...workspaces.map((w) =>
      el('option', { value: w.id, text: w.name, selected: w.id === workspaceId })
    ),
    el('option', { value: '__new', text: 'New workspace…' })
  );
  $('#workspacePick').hidden = false;
}

function renderAccount() {
  if (!user) return;
  const statusText = {
    synced: 'All changes saved',
    saving: 'Saving…',
    offline: 'Offline, retrying',
  };
  $('#account').replaceChildren(
    el('span', {
      class: 'avatar',
      style: `background:${colorFor(user.id)}`,
      'aria-hidden': 'true',
      text: initials(user.name),
    }),
    el(
      'div',
      { class: 'account-text' },
      el('strong', { class: 'account-name', text: user.name }),
      el('span', {
        class: `account-sync ${syncState}`,
        role: 'status',
        text: statusText[syncState],
      })
    ),
    el('button', {
      type: 'button',
      id: 'logoutBtn',
      class: 'icon-btn',
      'aria-label': 'Log out',
      title: 'Log out',
      html: icon('logout').innerHTML,
    })
  );
  $('#account').hidden = false;
  $('#teamBtn').hidden = false;
}

// ---------- Team dialog ----------

function renderTeam() {
  const owner = myRole() === 'owner';
  $('#teamTitle').textContent = `Team · ${currentWorkspace()?.name || ''}`;
  $('#memberList').replaceChildren(
    ...members.map((m) =>
      el(
        'li',
        { class: 'member' },
        avatar(m.id),
        el(
          'div',
          { class: 'member-text' },
          el('strong', { text: m.id === user.id ? `${m.name} (you)` : m.name }),
          el('span', { class: 'muted', text: m.email })
        ),
        m.role === 'owner' ? el('span', { class: 'badge due', text: 'Owner' }) : null,
        owner && m.role !== 'owner'
          ? el('button', {
              type: 'button',
              class: 'btn sm danger',
              'data-remove': m.id,
              'aria-label': `Remove ${m.name}`,
              text: 'Remove',
            })
          : null
      )
    )
  );
  $('#leaveGroup').hidden = owner;
}

function openTeam(focusNew) {
  closeNav();
  renderTeam();
  $('#inviteOut').hidden = true;
  $('#inviteError').textContent = '';
  $('#newWorkspaceError').textContent = '';
  openDlg($('#teamDlg'));
  if (focusNew) $('#newWorkspaceName').focus();
}

function initTeamDialog() {
  const dlg = $('#teamDlg');
  $('#teamBtn').replaceChildren(icon('users'), el('span', { class: 'nav-label', text: 'Team' }));
  $('#teamBtn').addEventListener('click', () => openTeam(false));

  $('#workspaceSelect').addEventListener('change', async (e) => {
    const id = e.target.value;
    if (id === '__new') {
      e.target.value = workspaceId;
      return openTeam(true);
    }
    try {
      await openWorkspace(id);
      closeNav();
    } catch (err) {
      toast(`Could not open workspace: ${err.message}`);
      e.target.value = workspaceId;
    }
  });

  $('#account').addEventListener('click', async (e) => {
    if (!e.target.closest('#logoutBtn')) return;
    try {
      await signOut();
    } catch (err) {
      toast(err.message);
    }
  });

  $('#inviteBtn').addEventListener('click', async () => {
    const btn = $('#inviteBtn');
    btn.disabled = true;
    $('#inviteError').textContent = '';
    try {
      $('#inviteLink').value = await createInvite(workspaceId);
      $('#inviteOut').hidden = false;
      $('#inviteLink').select();
    } catch (err) {
      $('#inviteError').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('#inviteCopy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#inviteLink').value);
      toast('Invite link copied');
    } catch {
      $('#inviteLink').select();
      toast('Press Ctrl+C to copy the link');
    }
  });

  $('#memberList').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-remove]');
    if (!b) return;
    if (!b.dataset.armed) {
      b.dataset.armed = '1';
      b.textContent = 'Confirm';
      setTimeout(() => {
        if (b.isConnected) {
          delete b.dataset.armed;
          b.textContent = 'Remove';
        }
      }, 4000);
      return;
    }
    try {
      await removeMember(workspaceId, b.dataset.remove);
      await refreshMembers();
      toast('Member removed');
    } catch (err) {
      toast(err.message);
    }
  });

  $('#newWorkspaceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = clean($('#newWorkspaceName').value, 60);
    if (!name) {
      $('#newWorkspaceError').textContent = 'Give the workspace a name.';
      return $('#newWorkspaceName').focus();
    }
    try {
      const id = await createWorkspace(name);
      workspaces = await listWorkspaces();
      await openWorkspace(id);
      $('#newWorkspaceName').value = '';
      closeDlg(dlg);
      toast(`Created ${name}`);
    } catch (err) {
      $('#newWorkspaceError').textContent = err.message;
    }
  });

  $('#leaveBtn').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (!b.dataset.armed) {
      b.dataset.armed = '1';
      b.textContent = 'Click again to leave';
      setTimeout(() => {
        delete b.dataset.armed;
        b.textContent = 'Leave this workspace';
      }, 4000);
      return;
    }
    try {
      const name = currentWorkspace()?.name;
      await removeMember(workspaceId, user.id);
      closeDlg(dlg);
      await switchAfterLeaving();
      toast(`You left ${name}`);
    } catch (err) {
      toast(err.message);
    }
  });
}

// ---------- start ----------

/** Remember an invite token from the URL (it survives the email confirmation round trip). */
function captureInvite() {
  const params = new URLSearchParams(location.search);
  const token = params.get('invite');
  if (!token) return;
  if (/^[a-f0-9]{16,64}$/i.test(token)) writePref(KEYS.invite, token);
  params.delete('invite');
  const q = params.toString();
  history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
}

export async function initAccount() {
  if (!cloudEnabled()) return;
  document.body.classList.add('cloud');
  captureInvite();
  showAuth('loading');
  initTeamDialog();

  $('#authBody').addEventListener('submit', (e) => {
    e.preventDefault();
    submitAuth(e.target);
  });
  $('#authBody').addEventListener('click', (e) => {
    const b = e.target.closest('[data-auth]');
    if (b) showAuth(b.dataset.auth);
  });
  $('#authBody').addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

  on('sync', (state) => {
    syncState = state;
    renderAccount();
  });

  try {
    await onAuthChange(handleAuth);
  } catch {
    showAuth('signin');
    $('#authError').textContent =
      'Could not reach the TaskFlow server. Check your connection and reload the page.';
  }
}
