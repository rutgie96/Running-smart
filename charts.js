(() => {
  function renderHrLineChart(canvas, runs) {
    if (!canvas || !runs || !runs.length || typeof Chart === 'undefined') return null;
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
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.25)',
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
              color: '#4b5563',
              autoSkip: true,
              maxTicksLimit: 8,
            },
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              color: '#4b5563',
              callback: (value) => `${value} bpm`,
            },
            grid: {
              color: 'rgba(148, 163, 184, 0.25)',
            },
            title: {
              display: true,
              text: 'Hartslag (bpm)',
              color: '#0f172a',
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
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

  function formatDate(value) {
    const date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatPace(secondsPerKm) {
    if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '—';
    let minutes = Math.floor(secondsPerKm / 60);
    let seconds = Math.round(secondsPerKm % 60);
    if (seconds === 60) {
      minutes += 1;
      seconds = 0;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} min/km`;
  }

  window.RunningSmartCharts = {
    renderHrLineChart,
  };
})();
