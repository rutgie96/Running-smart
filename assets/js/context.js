import { defaultSettings } from './data/defaults.js';

export function createContext() {
  const elements = {
    runForm: document.getElementById('runForm'),
    runDate: document.getElementById('runDate'),
    runDistance: document.getElementById('runDistance'),
    runTime: document.getElementById('runTime'),
    runAvgHr: document.getElementById('runAvgHr'),
    runMaxHr: document.getElementById('runMaxHr'),
    formFeedback: document.getElementById('formFeedback'),
    formWarning: document.getElementById('formWarning'),
    submitButton: document.getElementById('submitButton'),
    backupButton: document.getElementById('backupButton'),
    backupCsvButton: document.getElementById('backupCsvButton'),
    restoreButton: document.getElementById('restoreButton'),
    clearButton: document.getElementById('clearButton'),
    importFile: document.getElementById('importFile'),
    runsBody: document.getElementById('runsBody'),
    emptyState: document.getElementById('emptyState'),
    toast: document.getElementById('toast'),
    viewButtons: Array.from(document.querySelectorAll('.nav-link[data-view]')),
    views: null,
    viewShortcuts: document.querySelectorAll('[data-target]'),
    heroTime: document.getElementById('heroTime'),
    heroDistance: document.getElementById('heroDistance'),
    heroAllTimePace: document.getElementById('heroAllTimePace'),
    heroAvgPace: document.getElementById('heroAvgPace'),
    heroAvgHr: document.getElementById('heroAvgHr'),
    heroCaption: document.getElementById('heroCaption'),
    kpiGrid: document.getElementById('kpiGrid'),
    chartBars: document.getElementById('chartBars'),
    chartLabels: document.getElementById('chartLabels'),
    hrLineCanvas12: document.getElementById('hrLineChart12'),
    hrLineEmpty12: document.getElementById('hrLineEmpty12'),
    hrLineCanvasAll: document.getElementById('hrLineChartAll'),
    hrLineEmptyAll: document.getElementById('hrLineEmptyAll'),
    settingsForm: document.getElementById('settingsForm'),
    goalWeeklyKm: document.getElementById('goalWeeklyKm'),
    goalMonthlyKm: document.getElementById('goalMonthlyKm'),
    goalPace: document.getElementById('goalPace'),
    goalMaxHr: document.getElementById('goalMaxHr'),
    settingsFeedback: document.getElementById('settingsFeedback'),
    settingsReset: document.getElementById('settingsReset'),
    zonesList: document.getElementById('zonesList'),
  };
  elements.views = new Map(elements.viewButtons.map((button) => [button.dataset.view, document.getElementById(button.dataset.view)]));

  const state = {
    runs: [],
    editId: null,
    settings: { ...defaultSettings },
    charts: {
      hrLine12: null,
      hrLineAll: null,
    },
  };

  return { elements, state };
}
