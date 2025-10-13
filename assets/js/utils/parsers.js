export function parseDistance(value) {
  if (typeof value !== 'string') return null;
  const normalised = value.trim().replace(',', '.');
  if (!normalised) return null;
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function parseTime(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) return null;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  if (parts.length === 3) {
    [hours, minutes, seconds] = numbers;
  } else {
    [minutes, seconds] = numbers;
  }
  if (minutes >= 60 || seconds >= 60) return null;
  const total = hours * 3600 + minutes * 60 + seconds;
  return total;
}

export function parseHeartRate(value, { required = false, lower = 30, upper = 240, minComparedTo } = {}) {
  if (value === undefined || value === null) {
    return required ? null : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return required ? null : null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < lower || parsed > upper) {
    return required ? null : false;
  }
  if (typeof minComparedTo === 'number' && Number.isFinite(minComparedTo) && parsed < minComparedTo) {
    return false;
  }
  return Math.round(parsed);
}

export function parseGoalDistance(value) {
  if (value === undefined || value === null || value === '') return 0;
  const normalised = String(value).trim().replace(',', '.');
  if (!normalised) return 0;
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed) || parsed < 0) return false;
  return parsed;
}

export function parseGoalPace(value) {
  if (!value) return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const [minutesStr, secondsStr] = trimmed.split(':');
  if (secondsStr === undefined) return false;
  const minutes = Number(minutesStr);
  const seconds = Number(secondsStr);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60 || minutes < 0 || seconds < 0) {
    return false;
  }
  return minutes * 60 + seconds;
}
