import { STORAGE_KEYS } from '../constants.js';
import { computeZones } from '../utils/zones.js';
import { defaultSettings } from './defaults.js';
import { uid } from '../utils/id.js';

export function sanitiseRun(raw) {
  if (!raw || !raw.date) return null;
  const distance = Number(raw.distanceKm ?? raw.distance ?? 0);
  const duration = Number(raw.durationSec ?? raw.time ?? 0);
  if (!Number.isFinite(distance) || distance <= 0) return null;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const pace = Number(raw.paceSecPerKm);
  const avgHrRaw = raw.avgHr;
  const maxHrRaw = raw.maxHr;
  return {
    id: raw.id || uid(),
    date: raw.date,
    distanceKm: Number(distance.toFixed(2)),
    durationSec: Math.round(duration),
    paceSecPerKm: Number.isFinite(pace) && pace > 0 ? Math.round(pace) : Math.round(duration / distance),
    avgHr: Number.isFinite(Number(avgHrRaw)) ? Math.round(Number(avgHrRaw)) : null,
    maxHr: Number.isFinite(Number(maxHrRaw)) ? Math.round(Number(maxHrRaw)) : null,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
}

export function mergeRuns(existing, incoming) {
  const map = new Map(existing.map((run) => [run.id, run]));
  incoming.forEach((run) => {
    map.set(run.id, run);
  });
  return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
}

export function loadRuns() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.runs);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitiseRun).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Kon runs niet laden', error);
    return [];
  }
}

export function saveRuns(runs) {
  localStorage.setItem(STORAGE_KEYS.runs, JSON.stringify(runs));
}

export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.settings);
    if (!stored) return { ...defaultSettings };
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return { ...defaultSettings };
    const weekly = Number(parsed.weeklyGoalKm ?? parsed.weeklyKm);
    const monthly = Number(parsed.monthlyGoalKm ?? parsed.monthlyKm);
    const pace = Number(parsed.targetPaceSecPerKm ?? parsed.paceSeconds);
    const maxHr = Number(parsed.maxHrUser);
    const zones = parsed.zones && typeof parsed.zones === 'object'
      ? parsed.zones
      : computeZones();
    return {
      weeklyGoalKm: Number.isFinite(weekly) && weekly >= 0 ? weekly : defaultSettings.weeklyGoalKm,
      monthlyGoalKm: Number.isFinite(monthly) && monthly >= 0 ? monthly : defaultSettings.monthlyGoalKm,
      targetPaceSecPerKm: Number.isFinite(pace) && pace > 0 ? pace : defaultSettings.targetPaceSecPerKm,
      maxHrUser: Number.isFinite(maxHr) && maxHr > 0 ? Math.round(maxHr) : null,
      zones,
    };
  } catch (error) {
    console.error('Kon instellingen niet laden', error);
    return { ...defaultSettings };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}
