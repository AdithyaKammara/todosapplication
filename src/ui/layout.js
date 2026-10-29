/** Mobile sidebar open/close. */
import { $ } from '../utils/dom.js';

export function closeNav() {
  document.body.classList.remove('nav-open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
}

export function toggleNav() {
  const open = document.body.classList.toggle('nav-open');
  $('#menuBtn').setAttribute('aria-expanded', String(open));
}
