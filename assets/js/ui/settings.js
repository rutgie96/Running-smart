import { parseGoalDistance, parseGoalPace, parseHeartRate } from '../utils/parsers.js';
import { formatGoalPace } from '../utils/formatters.js';
import { computeZones, zoneBoundaries } from '../utils/zones.js';
import { defaultSettings } from '../data/defaults.js';
import { saveSettings } from '../data/storage.js';

export function initSettings(context, dashboard) {
  const { elements, state } = context;
  applySettingsToForm(context);
  updateZonesPreview(context);

  elements.goalMaxHr?.addEventListener('input', () => {
    const maxHrValue = parseHeartRate(elements.goalMaxHr.value, { required: false, lower: 100, upper: 240 });
    const fallback = Number.isFinite(maxHrValue) ? maxHrValue : state.settings.maxHrUser;
    updateZonesPreview(context, fallback);
  });

  elements.settingsForm?.addEventListener('submit', (event) => handleSettingsSubmit(event, context, dashboard));
  elements.settingsReset?.addEventListener('click', () => {
    state.settings = { ...defaultSettings };
    saveSettings(state.settings);
    applySettingsToForm(context);
    updateZonesPreview(context);
    dashboard.renderAll();
    updateSettingsFeedback(context, 'Standaardinstellingen hersteld.', true);
  });

  return {
    applySettingsToForm: () => applySettingsToForm(context),
  };
}

function handleSettingsSubmit(event, context, dashboard) {
  event.preventDefault();
  const { elements, state } = context;
  if (!elements.goalWeeklyKm || !elements.goalMonthlyKm || !elements.goalPace) return;

  const weekly = parseGoalDistance(elements.goalWeeklyKm.value);
  const monthly = parseGoalDistance(elements.goalMonthlyKm.value);
  const pace = parseGoalPace(elements.goalPace.value);
  const maxHrValue = elements.goalMaxHr
    ? parseHeartRate(elements.goalMaxHr.value, { required: false, lower: 100, upper: 240 })
    : null;

  const invalid = [];
  if (weekly === false) invalid.push('weekdoel');
  if (monthly === false) invalid.push('maanddoel');
  if (pace === false) invalid.push('streeftempo');
  if (maxHrValue === false) invalid.push('maximale hartslag');

  if (invalid.length) {
    updateSettingsFeedback(context, `Controleer ${invalid.join(', ')}.`);
    return;
  }

  const safeMaxHr = Number.isFinite(maxHrValue) ? Number(maxHrValue) : state.settings.maxHrUser;

  state.settings = {
    weeklyGoalKm: Number.isFinite(weekly) ? Number(weekly) : 0,
    monthlyGoalKm: Number.isFinite(monthly) ? Number(monthly) : 0,
    targetPaceSecPerKm: Number.isFinite(pace) ? Number(pace) : 0,
    maxHrUser: Number.isFinite(safeMaxHr) ? safeMaxHr : null,
    zones: computeZones(),
  };

  saveSettings(state.settings);
  applySettingsToForm(context);
  updateZonesPreview(context);
  dashboard.renderAll();
  updateSettingsFeedback(context, 'Instellingen opgeslagen ✔️', true);
}

function applySettingsToForm(context) {
  const { elements, state } = context;
  if (!elements.settingsForm) return;
  elements.goalWeeklyKm.value = state.settings.weeklyGoalKm ? String(state.settings.weeklyGoalKm) : '';
  elements.goalMonthlyKm.value = state.settings.monthlyGoalKm ? String(state.settings.monthlyGoalKm) : '';
  elements.goalPace.value = state.settings.targetPaceSecPerKm ? formatGoalPace(state.settings.targetPaceSecPerKm) : '';
  elements.goalMaxHr.value = state.settings.maxHrUser ? String(state.settings.maxHrUser) : '';
  updateSettingsFeedback(context, '', false);
}

function updateSettingsFeedback(context, message, success = false) {
  const { elements } = context;
  if (!elements.settingsFeedback) return;
  elements.settingsFeedback.textContent = message;
  elements.settingsFeedback.classList.toggle('success', Boolean(success));
}

function updateZonesPreview(context, customMax) {
  const { elements, state } = context;
  if (!elements.zonesList) return;
  const max = Number.isFinite(customMax) ? customMax : state.settings.maxHrUser;
  elements.zonesList.innerHTML = '';
  if (!Number.isFinite(max) || max <= 0) {
    elements.zonesList.innerHTML = '<li>Voer je maximale hartslag in om zones te tonen.</li>';
    return;
  }
  const boundaries = zoneBoundaries(max);
  Object.entries(boundaries).forEach(([zone, [min, maxVal]]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${zone.toUpperCase()}:</strong> ${min}–${maxVal} bpm`;
    elements.zonesList.appendChild(li);
  });
}
