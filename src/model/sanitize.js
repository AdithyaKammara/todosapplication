/**
 * Sanitising + migration. EVERYTHING that enters the app from outside (localStorage, an imported
 * backup, older app versions) goes through these functions, so the rest of the code can trust the
 * shape of the data.
 */
import {
  INBOX,
  ME,
  MAX_DESC,
  MAX_SUBS,
  MAX_TAGS,
  MAX_TITLE,
  PRIORITIES,
  PROJECT_COLORS,
  STATUS_IDS,
  TAG_RE,
} from '../config.js';
import { isValidISO } from '../utils/dates.js';
import { clean, uid, validId } from '../utils/text.js';
import { member } from './meta.js';

export function cleanTags(list) {
  const out = [];
  for (const raw of list || []) {
    const g = String(raw).replace(/^#/, '').trim().toLowerCase();
    if (TAG_RE.test(g) && !out.includes(g) && out.length < MAX_TAGS) out.push(g);
  }
  return out;
}

/** Returns a safe task object, or null when there is no usable title. Also upgrades v1 shapes. */
export function sanitizeTask(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = clean(raw.title ?? raw.text, MAX_TITLE);
  if (!title) return null;
  const done = raw.done === true || raw.isChecked === true || raw.completed === true;
  const status = STATUS_IDS.includes(raw.status) ? raw.status : done ? 'done' : 'todo';
  return {
    id: validId(raw.id) ? raw.id : uid(),
    title,
    description: String(raw.description || '').slice(0, MAX_DESC),
    status,
    priority: PRIORITIES.includes(raw.priority) ? raw.priority : 'medium',
    due: isValidISO(raw.due) ? raw.due : '',
    assignee: member(raw.assignee) ? raw.assignee : '',
    project: validId(raw.project) ? raw.project : INBOX,
    tags: cleanTags(Array.isArray(raw.tags) ? raw.tags : []),
    subtasks: (Array.isArray(raw.subtasks) ? raw.subtasks : [])
      .slice(0, MAX_SUBS)
      .map((s) => ({
        id: validId(s && s.id) ? s.id : uid(),
        text: clean(s && s.text, 120),
        done: !!(s && s.done),
      }))
      .filter((s) => s.text),
    comments: (Array.isArray(raw.comments) ? raw.comments : [])
      .slice(-50)
      .map((c) => ({
        id: validId(c && c.id) ? c.id : uid(),
        // keep authors who are no longer in the team, so their comments are not re-attributed
        author: validId(c && c.author) ? c.author : ME,
        text: String((c && c.text) || '')
          .trim()
          .slice(0, 500),
        at: Number.isFinite(c && c.at) ? c.at : Date.now(),
      }))
      .filter((c) => c.text),
    log: (Array.isArray(raw.log) ? raw.log : [])
      .slice(-50)
      .map((l) => ({
        at: Number.isFinite(l && l.at) ? l.at : Date.now(),
        text: clean(l && l.text, 140),
      }))
      .filter((l) => l.text),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    completedAt: status === 'done' && Number.isFinite(raw.completedAt) ? raw.completedAt : null,
  };
}

/** Normalises a whole `{ projects, tasks }` document: dedupes ids, guarantees an Inbox project. */
export function normalize(data) {
  const d = data && typeof data === 'object' ? data : {};
  const seenP = new Set();
  const projects = (Array.isArray(d.projects) ? d.projects : [])
    .map((p) => ({
      id: validId(p && p.id) ? p.id : '',
      name: clean(p && p.name, 40),
      color: /^#[0-9a-f]{6}$/i.test((p && p.color) || '') ? p.color : PROJECT_COLORS[0],
    }))
    .filter((p) => p.id && p.name && !seenP.has(p.id) && seenP.add(p.id));
  if (!projects.some((p) => p.id === INBOX)) {
    projects.unshift({ id: INBOX, name: 'Inbox', color: '#8a8478' });
  }
  const seen = new Set();
  const tasks = (Array.isArray(d.tasks) ? d.tasks : [])
    .map(sanitizeTask)
    .filter(Boolean)
    .map((t) => {
      if (seen.has(t.id)) t.id = uid();
      seen.add(t.id);
      if (!projects.some((p) => p.id === t.project)) t.project = INBOX;
      return t;
    });
  return { projects, tasks };
}
