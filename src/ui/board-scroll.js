/** Lets mouse users pan the board sideways by dragging its background (touch users just swipe). */
import { $ } from '../utils/dom.js';

const INTERACTIVE = '.task-card, button, select, input, textarea, a';

export function initBoardScroll() {
  const view = $('#view');
  let board = null;
  let startX = 0;
  let startLeft = 0;

  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const b = e.target.closest('.board');
    if (!b || e.target.closest(INTERACTIVE) || b.scrollWidth <= b.clientWidth) return;
    board = b;
    startX = e.clientX;
    startLeft = b.scrollLeft;
    b.classList.add('panning');
  });

  window.addEventListener('pointermove', (e) => {
    if (board) board.scrollLeft = startLeft - (e.clientX - startX);
  });

  const stop = () => {
    if (board) board.classList.remove('panning');
    board = null;
  };
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}
