/** 25-minute focus timer. Click to start/pause, right-click to reset. */
import { pad } from '../utils/dates.js';
import { $ } from '../utils/dom.js';
import { toast } from './toast.js';

const FOCUS_SECONDS = 25 * 60;
const pomo = { seconds: FOCUS_SECONDS, timer: null };

export function updatePomoUI() {
  const time = $('#pomoTime');
  if (!time) return;
  time.textContent = `${pad(Math.floor(pomo.seconds / 60))}:${pad(pomo.seconds % 60)}`;
  $('#pomoBtn').classList.toggle('running', !!pomo.timer);
}

export function togglePomo() {
  if (!$('#pomoBtn')) return;
  if (pomo.timer) {
    clearInterval(pomo.timer);
    pomo.timer = null;
    toast('Focus timer paused');
  } else {
    pomo.timer = setInterval(() => {
      if (pomo.seconds > 0) {
        pomo.seconds--;
        updatePomoUI();
      } else {
        clearInterval(pomo.timer);
        pomo.timer = null;
        pomo.seconds = FOCUS_SECONDS;
        updatePomoUI();
        toast('Focus session complete! Take a 5-minute break.');
      }
    }, 1000);
    toast('25-minute Focus Timer started');
  }
  updatePomoUI();
}

export function initPomodoro() {
  const btn = $('#pomoBtn');
  if (btn) {
    btn.addEventListener('click', togglePomo);
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      clearInterval(pomo.timer);
      pomo.timer = null;
      pomo.seconds = FOCUS_SECONDS;
      updatePomoUI();
      toast('Focus timer reset to 25:00');
    });
  }
  updatePomoUI();
}
