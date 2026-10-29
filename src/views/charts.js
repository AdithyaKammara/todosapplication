/** Hand-built SVG charts (no chart library). */
import { STATUSES } from '../config.js';
import { fmtDate, fromISO } from '../utils/dates.js';
import { svgEl } from '../utils/dom.js';

export function donutChart(counts, total) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const svg = svgEl('svg', {
    viewBox: '0 0 120 120',
    class: 'donut',
    role: 'img',
    'aria-label':
      'Status breakdown: ' + STATUSES.map((s) => `${counts[s.id]} ${s.label}`).join(', '),
  });
  svg.append(svgEl('circle', { cx: 60, cy: 60, r: R, class: 'donut-track' }));

  let offset = 0;
  STATUSES.forEach((s) => {
    const n = counts[s.id];
    if (!n) return;
    const len = (n / total) * C;
    svg.append(
      svgEl('circle', {
        cx: 60,
        cy: 60,
        r: R,
        class: `donut-seg st-${s.id}`,
        transform: 'rotate(-90 60 60)',
        'stroke-dasharray': `${len} ${C - len}`,
        'stroke-dashoffset': -offset,
      })
    );
    offset += len;
  });

  svg.append(
    svgEl('text', { x: 60, y: 62, 'text-anchor': 'middle', class: 'donut-num' }, String(total))
  );
  svg.append(
    svgEl(
      'text',
      { x: 60, y: 76, 'text-anchor': 'middle', class: 'donut-sub' },
      total === 1 ? 'task' : 'tasks'
    )
  );
  return svg;
}

/** Bar chart of tasks completed per day, with a y-axis and gridlines. `trend` comes from completionTrend(). */
export function trendChart({ days, counts }) {
  const n = days.length;
  const max = Math.max(2, ...counts);
  const tickStep = Math.max(1, Math.ceil(max / 4));
  const top = Math.ceil(max / tickStep) * tickStep;
  const W = 600;
  const H = 220;
  const L = 30;
  const R = 8;
  const T = 10;
  const B = 30;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const slot = plotW / n;
  const barW = Math.min(26, slot * 0.58);
  const labelEvery = n <= 14 ? 1 : n <= 21 ? 2 : 3;
  const total = counts.reduce((a, b) => a + b, 0);
  const shortDate = (iso) =>
    fromISO(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'trend',
    role: 'img',
    'aria-label': `${total} task${total === 1 ? '' : 's'} completed in the last ${n} days`,
  });

  for (let v = 0; v <= top; v += tickStep) {
    const y = T + plotH - (v / top) * plotH;
    svg.append(svgEl('line', { x1: L, x2: W - R, y1: y, y2: y, class: 'grid' }));
    svg.append(
      svgEl('text', { x: L - 8, y: y + 3.5, 'text-anchor': 'end', class: 'axis' }, String(v))
    );
  }

  counts.forEach((c, i) => {
    const h = Math.max((c / top) * plotH, 3);
    const x = L + i * slot + (slot - barW) / 2;
    const rect = svgEl('rect', {
      x,
      y: T + plotH - h,
      width: barW,
      height: h,
      rx: 3,
      class: `bar-col${c ? '' : ' zero'}`,
    });
    rect.append(svgEl('title', {}, `${c} completed · ${fmtDate(days[i])}`));
    svg.append(rect);
    if ((n - 1 - i) % labelEvery === 0) {
      svg.append(
        svgEl(
          'text',
          { x: x + barW / 2, y: H - 10, 'text-anchor': 'middle', class: 'axis' },
          shortDate(days[i])
        )
      );
    }
  });
  return svg;
}
