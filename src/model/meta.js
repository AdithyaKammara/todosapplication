/** Lookups for the fixed reference data (team members, statuses). */
import { STATUSES, TEAM } from '../config.js';

export const member = (id) => TEAM.find((m) => m.id === id);

export const nameOf = (id) => (member(id) || { name: 'Unassigned' }).name;

export const statusLabel = (id) => (STATUSES.find((s) => s.id === id) || {}).label || id;
