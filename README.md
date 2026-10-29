# TaskFlow

A team task manager built with plain HTML, CSS and JavaScript. No framework, no build step.

It has a dashboard, list, kanban board and calendar, plus the details that make a task tool pleasant to use: natural-language quick add, undo/redo, bulk edit, a command palette, keyboard shortcuts and light/dark themes.

**Live demo:** https://adithyakammara.github.io/todosapplication/

![Dashboard in light mode](docs/screenshots/dashboard-light.png)

| Board, dark mode                          | Task drawer                                 | Mobile                                 |
| ----------------------------------------- | ------------------------------------------- | -------------------------------------- |
| ![Board](docs/screenshots/board-dark.png) | ![Drawer](docs/screenshots/task-drawer.png) | ![Mobile](docs/screenshots/mobile.png) |

## Features

- **Dashboard**: a "Start here" table of the three tasks to look at first (ranked by due date, priority, status and progress), four key numbers, a status donut, a completion chart (7, 14 or 30 days), workload, project progress and upcoming tasks. Charts are hand-built SVG.
- **Quick add**: type `Review PR tomorrow @priya #dev !high` and the date, assignee, tag and priority are picked out for you.
- **Views**: list with sorting and filters, drag-and-drop board, month calendar.
- **Task drawer**: status, priority, assignee, due date, tags, description, subtasks, comments and an activity log.
- **Productivity**: undo/redo (50 steps), bulk move/assign/delete, command palette (`Ctrl K`), "What next?" ranking, focus timer.
- **Data**: JSON backup and restore, CSV export (guarded against spreadsheet formula injection), data saved in the browser.
- **Quality**: keyboard accessible, visible focus, reduced-motion support, responsive down to phones, light and dark themes, compact density option.

## Run it

Modules do not load from `file://`, so serve the folder over HTTP:

```bash
npm install     # only needed for tests, linting and formatting
npm start       # serves http://localhost:5173 with a tiny zero-dependency server
```

Or open the folder in VS Code and use the Live Server extension.

## Project structure

```
index.html
css/        tokens, base, layout, components, views, dialogs (+ self-hosted fonts)
src/
  main.js         wires everything together
  config.js       constants (statuses, priorities, demo team, limits)
  model/          pure logic: sanitising data, quick-add parser, selectors
  store/          state, history (undo/redo), storage, actions
  views/          dashboard, list, board, calendar, charts, app chrome
  ui/             drawer, dialogs, palette, shortcuts, bulk edit, theme, toast
  features/       sample data, import/export
  utils/          dates, text, DOM builder, CSV
tests/            unit tests for the pure logic
scripts/serve.mjs static dev server
```

Design choices worth knowing about:

- All user text is rendered with `textContent` through a small `el()` builder, and everything read from storage or an imported file passes through `sanitize` first.
- `store/storage.js` is the only file that touches `localStorage`. It is the seam where a `fetch()` to a real API will go.
- Selectors and the history stack are pure functions, which is why they are easy to unit test.

## Scripts

| Command                           | What it does                                 |
| --------------------------------- | -------------------------------------------- |
| `npm start`                       | Serve the app locally                        |
| `npm test`                        | Run unit tests (Node's built-in test runner) |
| `npm run lint`                    | ESLint                                       |
| `npm run format` / `format:check` | Prettier                                     |
| `npm run check`                   | Lint, format check and tests together        |

GitHub Actions runs `check` on every push (`.github/workflows/ci.yml`) and can publish the app to GitHub Pages (`.github/workflows/pages.yml`; enable Pages with source "GitHub Actions" in the repository settings).

## Honest notes

- The team (five people) is demo data. There are no accounts yet, and data lives only in your browser.
- This is version one of a larger plan.

## Roadmap

1. **Now:** polished frontend, tests, CI, deployed demo.
2. **Next:** Node + Express + PostgreSQL API, authentication, roles and permissions, Docker.
3. **Later:** real-time updates, notifications, audit log, reporting.

## Credits

Font: [Figtree](https://github.com/erikdkennedy/figtree), under the SIL Open Font License (copy in `css/fonts/`). Bricolage Grotesque is still in `css/fonts/` but no longer used.
