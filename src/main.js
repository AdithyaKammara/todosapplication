/**
 * TaskFlow entry point: wires the modules together and draws the first screen.
 * Load order: data layer (store) -> views -> UI behaviour.
 */
import { on } from './store/events.js';
import { initImport } from './features/data.js';
import { initAccount } from './ui/account.js';
import { initBoardScroll } from './ui/board-scroll.js';
import { initBulk } from './ui/bulk.js';
import { initDialogs } from './ui/dialogs.js';
import { initDrawer } from './ui/drawer.js';
import { initNavigation } from './ui/navigation.js';
import { initPalette } from './ui/palette.js';
import { initPomodoro } from './ui/pomodoro.js';
import { initQuickAdd } from './ui/quick-add.js';
import { initShortcuts } from './ui/shortcuts.js';
import { initTheme } from './ui/theme.js';
import { initViewEvents } from './ui/view-events.js';
import { initChrome } from './views/chrome.js';
import { render } from './views/render.js';

on('render', render);

initChrome();
initTheme();
initDrawer();
initDialogs();
initNavigation();
initViewEvents();
initBoardScroll();
initBulk();
initPalette();
initPomodoro();
initQuickAdd();
initImport();
initShortcuts();

render();
initAccount();
