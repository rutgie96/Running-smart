export function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDistance(distance) {
  return `${distance.toFixed(2).replace('.', ',')} km`;
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPace(secondsPerKm) {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '—';
  let minutes = Math.floor(secondsPerKm / 60);
  let seconds = Math.round(secondsPerKm % 60);
  if (seconds === 60) {
    minutes += 1;
    seconds = 0;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} min/km`;
}

export function formatPaceShort(secondsPerKm) {
  const pace = formatPace(secondsPerKm);
  return pace === '—' ? pace : pace.replace(' min/km', '');
}

export function formatHours(hours) {
  if (!Number.isFinite(hours) || hours <= 0) return '0,00';
  const value = hours >= 10 ? hours.toFixed(1) : hours.toFixed(2);
  return value.replace('.', ',');
}

export function formatKmValue(value) {
  return value.toFixed(1).replace('.', ',');
}

export function formatGoalPace(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
