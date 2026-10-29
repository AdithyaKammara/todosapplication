/** Global keyboard shortcuts, the undo/redo toolbar buttons and cross-tab sync. */
import { KEYS } from '../config.js';
import { redo, reloadFromStorage, undo } from '../store/store.js';
import { $ } from '../utils/dom.js';
import { openHelp } from './dialogs.js';
import { openPalette } from './palette.js';
import { togglePomo } from './pomodoro.js';
import { focusQuickAdd } from './quick-add.js';

export function initShortcuts() {
  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (mod && key === 'k') {
      e.preventDefault();
      openPalette();
      return;
    }

    const tag = (e.target.tagName || '').toLowerCase();
    const typing = ['input', 'textarea', 'select'].includes(tag);

    if (mod && !e.altKey && (key === 'z' || key === 'y')) {
      if (typing) return; // let text fields keep their own undo
      e.preventDefault();
      if (key === 'y' || e.shiftKey) redo();
      else undo();
      return;
    }

    if (typing || mod || e.altKey || $('dialog[open]')) return;

    if (e.key === '/') {
      e.preventDefault();
      const s = $('#searchInput');
      (s.offsetParent ? s : $('#quickInput')).focus();
    } else if (key === 'n') {
      e.preventDefault();
      focusQuickAdd();
    } else if (key === 'f') {
      e.preventDefault();
      togglePomo();
    } else if (e.key === '?') {
      e.preventDefault();
      openHelp();
    }
  });

  // Another browser tab saved new data.
  window.addEventListener('storage', (e) => {
    if (e.key === KEYS.data) reloadFromStorage();
  });
}
