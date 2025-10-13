import { formatDate, formatDuration, formatPace } from './utils/formatters.js';

export function renderHrLineChart(canvas, runs) {
  if (!canvas || !runs || !runs.length || typeof Chart === 'undefined') return null;
  const rootStyles = getComputedStyle(document.documentElement);
  const accent = (rootStyles.getPropertyValue('--accent') || '#e10600').trim();
  const accentSoft = (rootStyles.getPropertyValue('--accent-soft') || 'rgba(225, 6, 0, 0.2)').trim();
  const ink = (rootStyles.getPropertyValue('--accent-ink') || '#f4f7fb').trim();
  const muted = (rootStyles.getPropertyValue('--muted') || '#9097a5').trim();
  const gridColor = 'rgba(255, 255, 255, 0.12)';

  const labels = runs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((run) => ({
      label: formatDate(run.date),
      run,
    }));

  const sortedRuns = labels.map((item) => item.run);
  const data = {
    labels: labels.map((item) => item.label),
    datasets: [
      {
        label: 'Gem. hartslag',
        data: sortedRuns.map((run) => run.avgHr),
        borderColor: accent,
        backgroundColor: accentSoft,
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        meta: sortedRuns,
      },
    ],
  };

  const ctx = canvas.getContext('2d');
  return new Chart(ctx, {
    type: 'line',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: muted,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: muted,
            callback: (value) => `${value} bpm`,
          },
          grid: {
            color: gridColor,
          },
          title: {
            display: true,
            text: 'Hartslag (bpm)',
            color: ink,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(11, 14, 18, 0.9)',
          titleColor: ink,
          bodyColor: ink,
          borderColor: accent,
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const run = context.dataset.meta[context.dataIndex];
              const lines = [
                `Gem. HR: ${Math.round(run.avgHr)} bpm`,
                `Afstand: ${run.distanceKm.toFixed(2)} km`,
                `Tijd: ${formatDuration(run.durationSec)}`,
                `Tempo: ${formatPace(run.paceSecPerKm)}`,
              ];
              if (Number.isFinite(run.maxHr)) {
                lines.push(`Max HR: ${Math.round(run.maxHr)} bpm`);
              }
              return lines;
            },
            title: (items) => {
              const run = items[0].dataset.meta[items[0].dataIndex];
              return formatDate(run.date);
            },
          },
        },
      },
    },
  });
}
