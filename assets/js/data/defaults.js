import { DEFAULT_MAX_HR } from '../constants.js';
import { computeZones } from '../utils/zones.js';

export const defaultSettings = {
  weeklyGoalKm: 30,
  monthlyGoalKm: 120,
  targetPaceSecPerKm: 330,
  maxHrUser: DEFAULT_MAX_HR,
  zones: computeZones(DEFAULT_MAX_HR),
};
