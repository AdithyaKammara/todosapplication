/** Bottom-of-screen notification with an optional Undo button. */
import { $, el } from '../utils/dom.js';

let timer;

export function hideToast() {
  const node = $('#toast');
  if (node) node.classList.remove('show');
}

export function toast(message, undoFn) {
  const node = $('#toast');
  if (!node) return;
  node.replaceChildren(el('span', { text: message }));
  if (undoFn) {
    const b = el('button', { type: 'button', class: 'toast-btn', text: 'Undo' });
    b.addEventListener('click', () => {
      undoFn();
      hideToast();
    });
    node.append(b);
  }
  node.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(hideToast, undoFn ? 6000 : 3000);
}
