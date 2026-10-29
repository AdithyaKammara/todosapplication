/** "Add sample data": three demo projects with realistic tasks, so the app looks alive in a demo. */
import { SEED_MARKER } from '../config.js';
import { sanitizeTask } from '../model/sanitize.js';
import { log } from '../store/actions.js';
import { commit, store } from '../store/store.js';
import { toast } from '../ui/toast.js';
import { DAY_MS, addDays, todayISO } from '../utils/dates.js';
import { pid, uid } from '../utils/text.js';

export function seedData() {
  const { state } = store;
  if (state.tasks.some((t) => t.title === SEED_MARKER)) {
    toast('Sample data is already loaded');
    return;
  }
  const web = { id: pid(), name: 'Website Redesign', color: '#6b5bd2' };
  const app = { id: pid(), name: 'Mobile App', color: '#2f9e7a' };
  const mkt = { id: pid(), name: 'Q4 Launch', color: '#d9822b' };
  state.projects.push(web, app, mkt);
  const t0 = todayISO();

  // [project, title, status, priority, due offset (days), assignee, tags, subtasks, subtasks done]
  const rows = [
    [
      web,
      SEED_MARKER,
      'doing',
      'high',
      2,
      'priya',
      ['design'],
      ['Hero section', 'Pricing block', 'Mobile layout'],
      1,
    ],
    [
      web,
      'Audit accessibility issues',
      'todo',
      'high',
      -2,
      'me',
      ['a11y'],
      ['Keyboard navigation', 'Colour contrast'],
      0,
    ],
    [web, 'Write case-study copy', 'review', 'medium', 4, 'ananya', ['content'], [], 0],
    [web, 'Set up analytics events', 'todo', 'low', 9, 'karthik', ['dev', 'data'], [], 0],
    [
      app,
      'Fix login crash on Android 13',
      'doing',
      'high',
      0,
      'rahul',
      ['bug', 'dev'],
      ['Reproduce', 'Patch', 'Regression test'],
      1,
    ],
    [app, 'Design onboarding flow', 'review', 'medium', 3, 'priya', ['design'], [], 0],
    [
      app,
      'Add offline mode for task list',
      'todo',
      'medium',
      12,
      'me',
      ['dev'],
      ['Cache layer', 'Sync queue'],
      0,
    ],
    [app, 'Release v2.3 to Play Store', 'todo', 'high', 6, 'karthik', ['release'], [], 0],
    [
      mkt,
      'Prepare launch announcement',
      'doing',
      'medium',
      5,
      'ananya',
      ['content', 'launch'],
      [],
      0,
    ],
    [mkt, 'Book webinar speakers', 'todo', 'low', -1, 'me', ['events'], [], 0],
    [mkt, 'Publish pricing page', 'done', 'high', -3, 'me', ['launch'], [], 0],
    [web, 'Migrate blog to new CMS', 'done', 'medium', -5, 'rahul', ['dev'], [], 0],
    [app, 'Update privacy policy', 'done', 'low', -6, 'ananya', ['legal'], [], 0],
  ];

  rows.forEach(([proj, title, status, priority, d, assignee, tags, subs, subsDone], i) => {
    const t = sanitizeTask({
      title,
      status,
      priority,
      due: addDays(t0, d),
      assignee,
      tags,
      project: proj.id,
      subtasks: subs.map((text, k) => ({ text, done: k < subsDone })),
      completedAt: status === 'done' ? Date.now() - (i % 5) * DAY_MS : null,
    });
    if (!t) return;
    log(t, 'Task created');
    if (i === 0) {
      t.description =
        'Collect feedback from design review and lock the homepage layout before development starts.';
      t.comments.push(
        {
          id: uid(),
          author: 'priya',
          text: 'Wireframes are in the shared folder. Please review before Thursday.',
          at: Date.now() - 5 * 3600000,
        },
        {
          id: uid(),
          author: 'me',
          text: 'Looks good. Can we add a pricing block above the fold?',
          at: Date.now() - 2 * 3600000,
        }
      );
    }
    state.tasks.push(t);
  });

  commit();
  toast('Sample data added');
}
