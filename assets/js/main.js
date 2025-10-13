import { createContext } from './context.js';
import { loadRuns, loadSettings } from './data/storage.js';
import { initNavigation } from './ui/navigation.js';
import { initRuns } from './ui/runs.js';
import { initSettings } from './ui/settings.js';
import { initDashboard } from './ui/dashboard.js';

function bootstrap() {
  const context = createContext();
  context.state.settings = loadSettings();
  context.state.runs = loadRuns();

  const dashboard = initDashboard(context);
  initNavigation(context);
  initRuns(context, dashboard);
  initSettings(context, dashboard);
  dashboard.renderAll();
}

document.addEventListener('DOMContentLoaded', bootstrap);
