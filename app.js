(() => {
  const STORAGE_KEY = 'running-smart-runs';
  const SETTINGS_KEY = 'running-smart-goals';
  const DEFAULT_MAX_HR = Math.round(207 - 0.7 * 30);

  const runForm = document.getElementById('runForm');
  const runDate = document.getElementById('runDate');
  const runDistance = document.getElementById('runDistance');
  const runTime = document.getElementById('runTime');
  const runAvgHr = document.getElementById('runAvgHr');
  const runMaxHr = document.getElementById('runMaxHr');
  const formFeedback = document.getElementById('formFeedback');
  const formWarning = document.getElementById('formWarning');
  const submitButton = document.getElementById('submitButton');
  const backupButton = document.getElementById('backupButton');
  const backupCsvButton = document.getElementById('backupCsvButton');
  const restoreButton = document.getElementById('restoreButton');
  const clearButton = document.getElementById('clearButton');
  const importFile = document.getElementById('importFile');
  const runsBody = document.getElementById('runsBody');
  const emptyState = document.getElementById('emptyState');
  const toast = document.getElementById('toast');
  const viewButtons = Array.from(document.querySelectorAll('.nav-link[data-view]'));
  const views = new Map(viewButtons.map((button) => [button.dataset.view, document.getElementById(button.dataset.view)]));
  const viewShortcuts = document.querySelectorAll('[data-target]');
  const heroTime = document.getElementById('heroTime');
  const heroDistance = document.getElementById('heroDistance');
  const heroAllTimePace = document.getElementById('heroAllTimePace');
  const heroAvgPace = document.getElementById('heroAvgPace');
  const heroAvgHr = document.getElementById('heroAvgHr');
  const heroCaption = document.getElementById('heroCaption');
  const kpiGrid = document.getElementById('kpiGrid');
  const chartBars = document.getElementById('chartBars');
  const chartLabels = document.getElementById('chartLabels');
  const hrLineCanvas12 = document.getElementById('hrLineChart12');
  const hrLineEmpty12 = document.getElementById('hrLineEmpty12');
  const hrLineCanvasAll = document.getElementById('hrLineChartAll');
  const hrLineEmptyAll = document.getElementById('hrLineEmptyAll');
  const settingsForm = document.getElementById('settingsForm');
  const goalWeeklyKm = document.getElementById('goalWeeklyKm');
  const goalMonthlyKm = document.getElementById('goalMonthlyKm');
  const goalPace = document.getElementById('goalPace');
  const goalMaxHr = document.getElementById('goalMaxHr');
  const settingsFeedback = document.getElementById('settingsFeedback');
  const settingsReset = document.getElementById('settingsReset');
  const zonesList = document.getElementById('zonesList');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const GAUGE_RADIUS = 40;
  const GAUGE_START = 135;
  const GAUGE_END = 45;
  const GAUGE_RANGE = GAUGE_END - GAUGE_START + 360;
  const GAUGE_LENGTH = 2 * Math.PI * GAUGE_RADIUS * (GAUGE_RANGE / 360);

  const defaultSettings = {
    weeklyGoalKm: 30,
    monthlyGoalKm: 120,
    targetPaceSecPerKm: 330,
    maxHrUser: DEFAULT_MAX_HR,
    zones: computeZones(DEFAULT_MAX_HR),
  };

  let runs = [];
  let editId = null;
  let settings = { ...defaultSettings };
  let hrLineChart12;
  let hrLineChartAll;

  initialiseDate();
  submitButton?.setAttribute('aria-label', 'Nieuwe run opslaan');

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.view));
  });

  viewShortcuts.forEach((shortcut) => {
    shortcut.addEventListener('click', () => {
      const { target } = shortcut.dataset;
      if (target) showView(target);
    });
  });

  if (runForm) {
    runForm.addEventListener('submit', handleRunSubmit);
    runForm.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        resetForm();
      }
    });
  }

  runsBody?.addEventListener('click', handleRunAction);
  backupButton?.addEventListener('click', exportJsonBackup);
  backupCsvButton?.addEventListener('click', exportCsvBackup);
  restoreButton?.addEventListener('click', () => {
    if (!importFile) return;
    importFile.value = '';
    importFile.click();
  });
  importFile?.addEventListener('change', handleImport);
  clearButton?.addEventListener('click', clearRuns);

  settingsForm?.addEventListener('submit', handleSettingsSubmit);
  settingsReset?.addEventListener('click', () => {
    settings = { ...defaultSettings };
    saveSettings();
    applySettingsToForm();
    updateZonesPreview();
    renderAll();
    updateSettingsFeedback('Standaardinstellingen hersteld.', true);
  });

  goalMaxHr?.addEventListener('input', () => {
    const maxHrValue = parseHeartRate(goalMaxHr.value, { required: false, lower: 100, upper: 240 });
    updateZonesPreview(Number.isFinite(maxHrValue) ? maxHrValue : settings.maxHrUser);
  });

  loadSettings();
  applySettingsToForm();
  updateZonesPreview();
  loadRuns();
  renderAll();

  function initialiseDate() {
    if (!runDate) return;
    const local = new Date();
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    runDate.value = local.toISOString().slice(0, 10);
  }

  function showView(viewId) {
    if (!views.has(viewId)) return;
    views.forEach((section, id) => {
      section?.classList.toggle('active', id === viewId);
    });
    viewButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.view === viewId);
    });
    scrollToTop();
  }

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleRunSubmit(event) {
    event.preventDefault();
    if (!runDate || !runDistance || !runTime || !runAvgHr) return;

    const dateValue = runDate.value;
    const distanceValue = parseDistance(runDistance.value);
    const durationValue = parseTime(runTime.value);
    const avgHrValue = parseHeartRate(runAvgHr.value, { required: true, lower: 30, upper: 240 });
    const maxHrValue = runMaxHr
      ? parseHeartRate(runMaxHr.value, { required: false, lower: 30, upper: 260, minComparedTo: avgHrValue })
      : null;

    clearFormFeedback();

    const invalidFields = [];

    if (!dateValue) {
      invalidFields.push('datum');
      setFieldValidity(runDate, false);
    } else {
      setFieldValidity(runDate, true);
    }

    if (distanceValue === null) {
      invalidFields.push('afstand');
      setFieldValidity(runDistance, false);
    } else {
      setFieldValidity(runDistance, true);
    }

    if (durationValue === null) {
      invalidFields.push('tijd');
      setFieldValidity(runTime, false);
    } else {
      setFieldValidity(runTime, true);
    }

    if (avgHrValue === null) {
      invalidFields.push('gemiddelde hartslag');
      setFieldValidity(runAvgHr, false);
    } else {
      setFieldValidity(runAvgHr, true);
    }

    if (maxHrValue === false) {
      invalidFields.push('maximale hartslag');
      setFieldValidity(runMaxHr, false);
    } else {
      setFieldValidity(runMaxHr, true);
    }

    if (invalidFields.length > 0) {
      showFormError(`Controleer ${invalidFields.join(', ')}.`);
      return;
    }

    const pace = distanceValue > 0 ? durationValue / distanceValue : null;
    if (!Number.isFinite(pace)) {
      showFormError('Kon tempo niet berekenen. Controleer de afstand en tijd.');
      return;
    }

    const unrealistic = pace < 165 || pace > 900;
    if (unrealistic) {
      showFormWarning('⚠️ Waarschijnlijk onrealistische tempo-waarde, controleer je invoer.');
    }

    if (durationValue < 60 || durationValue > 86400) {
      setFieldValidity(runTime, false);
      showFormError('Tijd moet tussen 00:01:00 en 24:00:00 liggen.');
      return;
    }

    if (distanceValue <= 0 || distanceValue >= 200) {
      setFieldValidity(runDistance, false);
      showFormError('Afstand moet groter dan 0 en kleiner dan 200 km zijn.');
      return;
    }

    if (maxHrValue !== null && avgHrValue !== null && maxHrValue < avgHrValue) {
      showFormError('Max. hartslag moet gelijk aan of hoger dan je gemiddelde hartslag zijn.');
      setFieldValidity(runMaxHr, false);
      return;
    }

    const runData = {
      id: editId || uid(),
      date: dateValue,
      distanceKm: Number(distanceValue.toFixed(2)),
      durationSec: durationValue,
      paceSecPerKm: Math.round(pace),
      avgHr: avgHrValue,
      maxHr: maxHrValue === null ? null : maxHrValue,
      notes: '',
    };

    if (editId) {
      runs = runs.map((run) => (run.id === editId ? runData : run));
      showToast('Run bijgewerkt');
    } else {
      runs.push(runData);
      showToast('Run opgeslagen');
    }

    runs.sort((a, b) => b.date.localeCompare(a.date));
    renderAll();
    resetForm();
  }

  function handleRunAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    const run = runs.find((item) => item.id === id);
    if (!run) return;

    if (action === 'edit') {
      editId = id;
      showView('logView');
      runDate.value = run.date;
      runDistance.value = run.distanceKm.toFixed(2).replace('.', ',');
      runTime.value = formatDuration(run.durationSec);
      runAvgHr.value = Number.isFinite(run.avgHr) ? String(run.avgHr) : '';
      if (runMaxHr) {
        runMaxHr.value = Number.isFinite(run.maxHr) ? String(run.maxHr) : '';
      }
      submitButton.textContent = 'Run bijwerken';
      submitButton.setAttribute('aria-label', 'Bestaande run bijwerken');
      formFeedback.textContent = 'Bewerken: pas velden aan en sla op of druk op Esc om te annuleren.';
      setFieldValidity(runDistance, true);
      setFieldValidity(runTime, true);
      setFieldValidity(runAvgHr, true);
      setFieldValidity(runMaxHr, true);
      runDistance.focus();
    }

    if (action === 'delete') {
      if (confirm('Weet je zeker dat je deze run wilt verwijderen?')) {
        runs = runs.filter((item) => item.id !== id);
        renderAll();
        if (editId === id) {
          resetForm();
        }
        showToast('Run verwijderd');
      }
    }
  }

  function exportJsonBackup() {
    const blob = new Blob([JSON.stringify(runs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `running-smart-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportCsvBackup() {
    if (!runs.length) {
      showToast('Geen runs om te exporteren');
      return;
    }
    const header = 'date,distanceKm,durationSec,paceSecPerKm,avgHr,maxHr\n';
    const rows = runs
      .map((run) => [
        run.date,
        run.distanceKm.toFixed(2),
        Math.round(run.durationSec),
        Math.round(run.paceSecPerKm),
        Number.isFinite(run.avgHr) ? run.avgHr : '',
        Number.isFinite(run.maxHr) ? run.maxHr : '',
      ].join(','))
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `running-smart-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV-export klaar');
  }

  function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const parsed = JSON.parse(target.result);
        if (!Array.isArray(parsed)) {
          alert('Ongeldig bestand: verwacht een JSON-lijst.');
          return;
        }
        const importedRuns = parsed.map(sanitiseRun).filter(Boolean);
        if (!importedRuns.length) {
          alert('Geen geldige runs gevonden.');
          return;
        }
        runs = mergeRuns(runs, importedRuns);
        renderAll();
        resetForm();
        showToast('Runs geïmporteerd');
      } catch (error) {
        console.error(error);
        alert('Kon het bestand niet lezen. Controleer de inhoud.');
      }
    };
    reader.readAsText(file);
  }

  function clearRuns() {
    if (confirm('Weet je zeker dat je alle runs wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      runs = [];
      renderAll();
      resetForm();
      showToast('Alle runs verwijderd');
    }
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();
    if (!goalWeeklyKm || !goalMonthlyKm || !goalPace) return;

    const weekly = parseGoalDistance(goalWeeklyKm.value);
    const monthly = parseGoalDistance(goalMonthlyKm.value);
    const pace = parseGoalPace(goalPace.value);
    const maxHrValue = goalMaxHr
      ? parseHeartRate(goalMaxHr.value, { required: false, lower: 100, upper: 240 })
      : null;

    const invalid = [];
    if (weekly === false) invalid.push('weekdoel');
    if (monthly === false) invalid.push('maanddoel');
    if (pace === false) invalid.push('streeftempo');
    if (maxHrValue === false) invalid.push('maximale hartslag');

    if (invalid.length) {
      updateSettingsFeedback(`Controleer ${invalid.join(', ')}.`);
      return;
    }

    const safeMaxHr = Number.isFinite(maxHrValue) ? Number(maxHrValue) : settings.maxHrUser;

    settings = {
      weeklyGoalKm: Number.isFinite(weekly) ? Number(weekly) : 0,
      monthlyGoalKm: Number.isFinite(monthly) ? Number(monthly) : 0,
      targetPaceSecPerKm: Number.isFinite(pace) ? Number(pace) : 0,
      maxHrUser: Number.isFinite(safeMaxHr) ? safeMaxHr : null,
      zones: computeZones(Number.isFinite(safeMaxHr) ? safeMaxHr : settings.maxHrUser),
    };

    saveSettings();
    applySettingsToForm();
    updateZonesPreview();
    renderAll();
    updateSettingsFeedback('Instellingen opgeslagen ✔️', true);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      toast.classList.remove('visible');
    }, 2200);
  }

  function resetForm() {
    runForm?.reset();
    initialiseDate();
    editId = null;
    if (submitButton) {
      submitButton.textContent = 'Run opslaan';
      submitButton.setAttribute('aria-label', 'Nieuwe run opslaan');
    }
    clearFormFeedback();
    if (runAvgHr) runAvgHr.value = '';
    if (runMaxHr) runMaxHr.value = '';
  }

  function clearFormFeedback() {
    if (formFeedback) {
      formFeedback.textContent = '';
    }
    if (formWarning) {
      formWarning.textContent = '';
    }
  }

  function showFormError(message) {
    if (!formFeedback) return;
    formFeedback.textContent = message;
  }

  function showFormWarning(message) {
    if (!formWarning) return;
    formWarning.textContent = message;
  }

  function setFieldValidity(field, isValid) {
    field?.setAttribute('aria-invalid', String(!isValid));
  }

  function parseDistance(value) {
    if (typeof value !== 'string') return null;
    const normalised = value.trim().replace(',', '.');
    if (!normalised) return null;
    const parsed = Number(normalised);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  function parseTime(value) {
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

  function parseHeartRate(value, { required = false, lower = 30, upper = 240, minComparedTo } = {}) {
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

  function parseGoalDistance(value) {
    if (value === undefined || value === null || value === '') return 0;
    const normalised = String(value).trim().replace(',', '.');
    if (!normalised) return 0;
    const parsed = Number(normalised);
    if (!Number.isFinite(parsed) || parsed < 0) return false;
    return parsed;
  }

  function parseGoalPace(value) {
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

  function mergeRuns(existing, incoming) {
    const map = new Map(existing.map((run) => [run.id, run]));
    incoming.forEach((run) => {
      map.set(run.id, run);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }

  function sanitiseRun(raw) {
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

  function loadRuns() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      runs = parsed.map(sanitiseRun).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('Kon runs niet laden', error);
      runs = [];
    }
  }

  function saveRuns() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }

  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== 'object') return;
      const weekly = Number(parsed.weeklyGoalKm ?? parsed.weeklyKm);
      const monthly = Number(parsed.monthlyGoalKm ?? parsed.monthlyKm);
      const pace = Number(parsed.targetPaceSecPerKm ?? parsed.paceSeconds);
      const maxHr = Number(parsed.maxHrUser);
      const zones = parsed.zones && typeof parsed.zones === 'object' ? parsed.zones : computeZones(Number.isFinite(maxHr) ? maxHr : DEFAULT_MAX_HR);
      settings = {
        weeklyGoalKm: Number.isFinite(weekly) && weekly >= 0 ? weekly : defaultSettings.weeklyGoalKm,
        monthlyGoalKm: Number.isFinite(monthly) && monthly >= 0 ? monthly : defaultSettings.monthlyGoalKm,
        targetPaceSecPerKm: Number.isFinite(pace) && pace > 0 ? pace : defaultSettings.targetPaceSecPerKm,
        maxHrUser: Number.isFinite(maxHr) && maxHr > 0 ? Math.round(maxHr) : null,
        zones,
      };
    } catch (error) {
      console.error('Kon instellingen niet laden', error);
      settings = { ...defaultSettings };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function applySettingsToForm() {
    if (!settingsForm) return;
    goalWeeklyKm.value = settings.weeklyGoalKm ? String(settings.weeklyGoalKm) : '';
    goalMonthlyKm.value = settings.monthlyGoalKm ? String(settings.monthlyGoalKm) : '';
    goalPace.value = settings.targetPaceSecPerKm ? formatGoalPace(settings.targetPaceSecPerKm) : '';
    goalMaxHr.value = settings.maxHrUser ? String(settings.maxHrUser) : '';
    updateSettingsFeedback('', false);
  }

  function updateSettingsFeedback(message, success = false) {
    if (!settingsFeedback) return;
    settingsFeedback.textContent = message;
    settingsFeedback.classList.toggle('success', success);
  }

  function updateZonesPreview(customMax) {
    if (!zonesList) return;
    const max = Number.isFinite(customMax) ? customMax : settings.maxHrUser;
    zonesList.innerHTML = '';
    if (!Number.isFinite(max) || max <= 0) {
      zonesList.innerHTML = '<li>Voer je maximale hartslag in om zones te tonen.</li>';
      return;
    }
    const zones = computeZones(max);
    Object.entries(zones).forEach(([zone, [min, maxVal]]) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${zone.toUpperCase()}:</strong> ${Math.round(min * max)}–${Math.round(maxVal * max)} bpm`;
      zonesList.appendChild(li);
    });
  }

  function computeZones() {
    return {
      z1: [0.5, 0.6],
      z2: [0.6, 0.7],
      z3: [0.7, 0.8],
      z4: [0.8, 0.9],
      z5: [0.9, 1.0],
    };
  }

  function renderAll() {
    saveRuns();
    const stats = computeStats();
    renderHero(stats);
    renderKPIs(stats);
    renderWeeklyChart(stats);
    renderRuns();
    renderCharts(stats);
  }

  function computeStats() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(now.getDate() - 83);

    let kmWeek = 0;
    let kmMonth = 0;
    let totalDistance30 = 0;
    let totalSeconds30 = 0;
    let totalDistance7 = 0;
    let totalSeconds7 = 0;
    let totalDistanceAll = 0;
    let totalSecondsAll = 0;
    let bestWeekDistance = 0;
    let bestMonthDistance = 0;
    let prFive = null;
    let totalAvgHr30 = 0;
    let countAvgHr30 = 0;
    let totalAvgHr7 = 0;
    let countAvgHr7 = 0;
    let totalAvgHrAll = 0;
    let countAvgHrAll = 0;
    let recoverySum = 0;
    let recoveryCount = 0;

    const weeklyTotals = new Map();
    const monthlyTotals = new Map();

    runs.forEach((run) => {
      const date = new Date(run.date + 'T00:00:00');
      const weekStart = startOfWeek(date);
      const weekKey = weekStart.toISOString().slice(0, 10);
      const weekTotal = (weeklyTotals.get(weekKey) || 0) + run.distanceKm;
      weeklyTotals.set(weekKey, weekTotal);
      if (weekTotal > bestWeekDistance) {
        bestWeekDistance = weekTotal;
      }

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthTotal = (monthlyTotals.get(monthKey) || 0) + run.distanceKm;
      monthlyTotals.set(monthKey, monthTotal);
      if (monthTotal > bestMonthDistance) {
        bestMonthDistance = monthTotal;
      }

      if (isSameWeek(date, now)) {
        kmWeek += run.distanceKm;
      }

      if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
        kmMonth += run.distanceKm;
      }

      totalDistanceAll += run.distanceKm;
      totalSecondsAll += run.durationSec;

      if (run.distanceKm >= 5) {
        const pace = run.paceSecPerKm;
        if (Number.isFinite(pace) && pace > 0) {
          const timeForFive = pace * 5;
          if (!prFive || timeForFive < prFive) {
            prFive = timeForFive;
          }
        }
      }

      if (Number.isFinite(run.avgHr)) {
        totalAvgHrAll += run.avgHr;
        countAvgHrAll += 1;
      }

      if (date >= thirtyDaysAgo && date <= now) {
        totalDistance30 += run.distanceKm;
        totalSeconds30 += run.durationSec;
        if (Number.isFinite(run.avgHr)) {
          totalAvgHr30 += run.avgHr;
          countAvgHr30 += 1;
        }
        if (Number.isFinite(run.avgHr) && Number.isFinite(run.maxHr)) {
          recoverySum += run.maxHr - run.avgHr;
          recoveryCount += 1;
        }
      }

      if (date >= sevenDaysAgo && date <= now) {
        totalDistance7 += run.distanceKm;
        totalSeconds7 += run.durationSec;
        if (Number.isFinite(run.avgHr)) {
          totalAvgHr7 += run.avgHr;
          countAvgHr7 += 1;
        }
      }
    });

    const avgHr30 = countAvgHr30 ? totalAvgHr30 / countAvgHr30 : null;
    const avgHr7 = countAvgHr7 ? totalAvgHr7 / countAvgHr7 : null;
    const avgHrAll = countAvgHrAll ? totalAvgHrAll / countAvgHrAll : null;
    const recovery = recoveryCount ? recoverySum / recoveryCount : null;

    const hrData7 = runs.filter((run) => {
      const date = new Date(run.date + 'T00:00:00');
      return date >= sevenDaysAgo && date <= now && Number.isFinite(run.avgHr);
    });
    const hrData30 = runs.filter((run) => {
      const date = new Date(run.date + 'T00:00:00');
      return date >= thirtyDaysAgo && date <= now && Number.isFinite(run.avgHr);
    });
    const hrData12Weeks = runs.filter((run) => {
      const date = new Date(run.date + 'T00:00:00');
      return date >= twelveWeeksAgo && date <= now && Number.isFinite(run.avgHr);
    });
    const hrDataAll = runs.filter((run) => Number.isFinite(run.avgHr));

    return {
      kmWeek,
      kmMonth,
      avgPace30: totalDistance30 > 0 ? totalSeconds30 / totalDistance30 : null,
      avgPace7: totalDistance7 > 0 ? totalSeconds7 / totalDistance7 : null,
      overallPace: totalDistanceAll > 0 ? totalSecondsAll / totalDistanceAll : null,
      totalDistanceAll,
      totalRuns: runs.length,
      bestWeekDistance,
      bestMonthDistance,
      pr5k: prFive,
      avgHr30,
      avgHr7,
      avgHrAll,
      recovery,
      weeklyTotals,
      hrData7,
      hrData30,
      hrData12Weeks,
      hrDataAll,
    };
  }

  function renderHero(stats) {
    if (!runs.length) {
      heroTime.textContent = '0,00';
      heroDistance.textContent = '0,00';
      heroAllTimePace.textContent = '—';
      heroAvgPace.textContent = '—';
      if (heroAvgHr) heroAvgHr.textContent = '—';
    heroCaption.textContent = 'Voer je eerste run in om de chronograaf te starten.';
      return;
    }
    const latest = runs[0];
    heroTime.textContent = formatHours(latest.durationSec / 3600);
    heroDistance.textContent = latest.distanceKm.toFixed(2).replace('.', ',');
    heroAllTimePace.textContent = stats.overallPace ? formatPaceShort(stats.overallPace) : '—';
    heroAvgPace.textContent = stats.avgPace30 ? formatPaceShort(stats.avgPace30) : '—';
    if (heroAvgHr) {
      heroAvgHr.textContent = stats.avgHr30 ? `${Math.round(stats.avgHr30)} bpm` : '—';
    }
    heroCaption.textContent = `Laatste run · ${formatDate(latest.date)} · ${formatDuration(latest.durationSec)} (${latest.distanceKm.toFixed(2)} km)`;
  }

  function renderKPIs(stats) {
    if (!kpiGrid) return;
    const weekGoal = settings.weeklyGoalKm || stats.bestWeekDistance || 20;
    const monthGoal = settings.monthlyGoalKm || stats.bestMonthDistance || 80;
    const paceGoal = settings.targetPaceSecPerKm || null;

    const hasOverallPace = Number.isFinite(stats.overallPace) && stats.overallPace > 0;
    const has30Pace = Number.isFinite(stats.avgPace30) && stats.avgPace30 > 0;
    const has7Pace = Number.isFinite(stats.avgPace7) && stats.avgPace7 > 0;

    const cards = [];

    cards.push({
      type: 'gauge',
      label: 'Kilometers deze week',
      valueText: formatKmValue(stats.kmWeek),
      unitText: 'km',
      detail: settings.weeklyGoalKm ? `Doel ${formatKmValue(settings.weeklyGoalKm)} km` : `Richtwaarde ${formatKmValue(weekGoal)} km`,
      helper: stats.kmWeek >= weekGoal ? 'Doel gehaald! 🎉' : `${formatKmValue(Math.max(weekGoal - stats.kmWeek, 0))} km te gaan`,
      progress: clamp(stats.kmWeek / weekGoal, 0, 1),
      ariaLabel: `Kilometers deze week ${formatKmValue(stats.kmWeek)} van ${formatKmValue(weekGoal)}`,
    });

    cards.push({
      type: 'gauge',
      label: 'Kilometers deze maand',
      valueText: formatKmValue(stats.kmMonth),
      unitText: 'km',
      detail: settings.monthlyGoalKm ? `Doel ${formatKmValue(settings.monthlyGoalKm)} km` : `Richtwaarde ${formatKmValue(monthGoal)} km`,
      helper: stats.kmMonth >= monthGoal ? 'Je ligt op schema.' : `${formatKmValue(Math.max(monthGoal - stats.kmMonth, 0))} km resterend`,
      progress: clamp(stats.kmMonth / monthGoal, 0, 1),
      ariaLabel: `Kilometers deze maand ${formatKmValue(stats.kmMonth)} van ${formatKmValue(monthGoal)}`,
    });

    cards.push({
      type: 'gauge',
      label: 'Tempo per km (altijd)',
      valueText: hasOverallPace ? formatPaceShort(stats.overallPace) : '—',
      unitText: hasOverallPace ? 'min/km' : '',
      detail: paceGoal ? `Doel ${formatPaceShort(paceGoal)}` : `Runs totaal: ${stats.totalRuns}`,
      helper: hasOverallPace ? `Gebaseerd op ${stats.totalRuns} runs.` : 'Voeg runs toe om tempo te berekenen.',
      progress: hasOverallPace ? gaugeProgressFromPace(stats.overallPace) : 0,
      marker: paceGoal ? gaugeProgressFromPace(paceGoal) : null,
      ariaLabel: hasOverallPace ? `Gemiddeld tempo ${formatPaceShort(stats.overallPace)}` : 'Geen tempo beschikbaar',
    });

    cards.push({
      type: 'gauge',
      label: 'Tempo per km (30 dagen)',
      valueText: has30Pace ? formatPaceShort(stats.avgPace30) : '—',
      unitText: has30Pace ? 'min/km' : '',
      detail: paceGoal ? `Doel ${formatPaceShort(paceGoal)}` : '',
      helper: has30Pace ? 'Gebaseerd op je laatste 30 dagen.' : 'Nog onvoldoende data.',
      progress: has30Pace ? gaugeProgressFromPace(stats.avgPace30) : 0,
      marker: paceGoal ? gaugeProgressFromPace(paceGoal) : null,
      ariaLabel: has30Pace ? `Tempo laatste 30 dagen ${formatPaceShort(stats.avgPace30)}` : 'Geen tempo (30 dagen)',
    });

    cards.push({
      type: 'gauge',
      label: 'Tempo per km (7 dagen)',
      valueText: has7Pace ? formatPaceShort(stats.avgPace7) : '—',
      unitText: has7Pace ? 'min/km' : '',
      detail: has30Pace ? `30 dagen ${formatPaceShort(stats.avgPace30)}` : '',
      helper: has7Pace ? 'Focus op je laatste trainingsweek.' : 'Nog onvoldoende data.',
      progress: has7Pace ? gaugeProgressFromPace(stats.avgPace7) : 0,
      marker: paceGoal ? gaugeProgressFromPace(paceGoal) : null,
      ariaLabel: has7Pace ? `Tempo laatste week ${formatPaceShort(stats.avgPace7)}` : 'Geen tempo (7 dagen)',
    });

    const hasAvgHrAll = Number.isFinite(stats.avgHrAll) && stats.avgHrAll > 0;
    const hasAvgHr30 = Number.isFinite(stats.avgHr30) && stats.avgHr30 > 0;
    const hasAvgHr7 = Number.isFinite(stats.avgHr7) && stats.avgHr7 > 0;
    const hrMarker = getHrGaugeMarker();

    cards.push({
      type: 'gauge',
      label: 'Gem. hartslag (altijd)',
      valueText: hasAvgHrAll ? String(Math.round(stats.avgHrAll)) : '—',
      unitText: hasAvgHrAll ? 'bpm' : '',
      detail: hasAvgHrAll ? formatHrGaugeDetail(stats.hrDataAll.length) : '',
      helper: hasAvgHrAll ? describeHrZone(stats.avgHrAll) : 'Voer runs met hartslag in om trends te tonen.',
      progress: hasAvgHrAll ? gaugeProgressFromHr(stats.avgHrAll) : 0,
      marker: hrMarker,
      tone: 'green',
      ariaLabel: hasAvgHrAll
        ? `Gemiddelde hartslag over alle runs ${Math.round(stats.avgHrAll)} slagen per minuut`
        : 'Geen hartslagdata beschikbaar',
    });

    cards.push({
      type: 'gauge',
      label: 'Gem. hartslag (30 dagen)',
      valueText: hasAvgHr30 ? String(Math.round(stats.avgHr30)) : '—',
      unitText: hasAvgHr30 ? 'bpm' : '',
      detail: hasAvgHr30 ? formatHrGaugeDetail(stats.hrData30.length) : '',
      helper: hasAvgHr30 ? describeHrZone(stats.avgHr30) : 'Nog onvoldoende runs met hartslag in de laatste 30 dagen.',
      progress: hasAvgHr30 ? gaugeProgressFromHr(stats.avgHr30) : 0,
      marker: hrMarker,
      tone: 'green',
      ariaLabel: hasAvgHr30
        ? `Gemiddelde hartslag laatste 30 dagen ${Math.round(stats.avgHr30)} slagen per minuut`
        : 'Geen hartslagdata voor de laatste 30 dagen',
    });

    cards.push({
      type: 'gauge',
      label: 'Gem. hartslag (7 dagen)',
      valueText: hasAvgHr7 ? String(Math.round(stats.avgHr7)) : '—',
      unitText: hasAvgHr7 ? 'bpm' : '',
      detail: hasAvgHr7 ? formatHrGaugeDetail(stats.hrData7.length) : '',
      helper: hasAvgHr7 ? describeHrZone(stats.avgHr7) : 'Nog geen runs met hartslag in de laatste week.',
      progress: hasAvgHr7 ? gaugeProgressFromHr(stats.avgHr7) : 0,
      marker: hrMarker,
      tone: 'green',
      ariaLabel: hasAvgHr7
        ? `Gemiddelde hartslag laatste 7 dagen ${Math.round(stats.avgHr7)} slagen per minuut`
        : 'Geen hartslagdata voor de laatste 7 dagen',
    });

    cards.push({
      type: 'plain',
      label: 'HR herstel-indicator',
      valueText: stats.recovery ? `${Math.round(stats.recovery)} bpm verschil` : '—',
      helper: stats.recovery ? 'Gemiddeld verschil tussen max. en gem. hartslag (30 dagen).' : 'Voeg runs met max. hartslag toe voor dit inzicht.',
    });

    cards.push({
      type: 'plain',
      label: 'PR 5 km',
      valueText: stats.pr5k ? formatDuration(Math.round(stats.pr5k)) : '—',
      helper: stats.pr5k ? 'Beste tijd gebaseerd op runs van ≥ 5 km.' : 'Loop 5 km om een PR vast te leggen.',
    });

    kpiGrid.innerHTML = '';
    cards.forEach((card) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'kpi-card';
      wrapper.setAttribute('role', 'listitem');
      if (card.tone) {
        wrapper.dataset.theme = card.tone;
      }
      if (card.ariaLabel) {
        wrapper.setAttribute('aria-label', card.ariaLabel);
      }

      const header = document.createElement('div');
      header.className = 'kpi-header';
      const label = document.createElement('span');
      label.className = 'kpi-label';
      label.textContent = card.label;
      header.appendChild(label);
      wrapper.appendChild(header);

      const valueRow = document.createElement('div');
      valueRow.className = 'kpi-value-row';
      const value = document.createElement('span');
      value.className = 'kpi-value';
      value.textContent = card.valueText;
      valueRow.appendChild(value);
      if (card.unitText) {
        const unit = document.createElement('span');
        unit.className = 'kpi-unit';
        unit.textContent = card.unitText;
        valueRow.appendChild(unit);
      }
      wrapper.appendChild(valueRow);

      if (card.detail) {
        const detail = document.createElement('p');
        detail.className = 'kpi-detail';
        detail.textContent = card.detail;
        wrapper.appendChild(detail);
      }

      if (card.type === 'gauge') {
        const gauge = createGaugeSvg(card.progress, card.marker);
        gauge.setAttribute('aria-hidden', 'true');
        wrapper.appendChild(gauge);
      }

      if (card.helper) {
        const helper = document.createElement('p');
        helper.className = 'kpi-helper';
        helper.textContent = card.helper;
        wrapper.appendChild(helper);
      }

      if (card.deltaText) {
        const delta = document.createElement('p');
        delta.className = 'kpi-delta';
        delta.textContent = card.deltaText;
        wrapper.appendChild(delta);
      }

      kpiGrid.appendChild(wrapper);
    });
  }

  function renderWeeklyChart(stats) {
    if (!chartBars || !chartLabels) return;
    chartBars.innerHTML = '';
    chartLabels.innerHTML = '';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentWeekStart = startOfWeek(now);
    const bars = [];
    let maxKm = 0;

    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(currentWeekStart);
      start.setDate(start.getDate() - i * 7);
      const key = start.toISOString().slice(0, 10);
      const value = stats.weeklyTotals.get(key) || 0;
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const label = `${start.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })} – ${end.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })}`;
      bars.push({ value, label });
      if (value > maxKm) {
        maxKm = value;
      }
    }

    const safeMax = maxKm > 0 ? maxKm : 1;
    bars.forEach(({ value, label }) => {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${Math.max(6, (value / safeMax) * 100)}%`;
      bar.dataset.value = value.toFixed(1).replace('.', ',');
      bar.setAttribute('role', 'listitem');
      bar.setAttribute('aria-label', `${label}: ${value.toFixed(1)} kilometer`);
      chartBars.appendChild(bar);
      const span = document.createElement('span');
      span.innerHTML = label.replace(' – ', '<br>–<br>');
      chartLabels.appendChild(span);
    });
  }

  function renderRuns() {
    if (!runsBody) return;
    runsBody.innerHTML = '';
    if (!runs.length) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    runs.forEach((run) => {
      const tr = document.createElement('tr');
      if (!Number.isFinite(run.avgHr)) {
        tr.classList.add('run-missing-hr');
      }
      tr.innerHTML = `
        <td>${formatDate(run.date)}</td>
        <td>${formatDistance(run.distanceKm)}</td>
        <td>${formatDuration(run.durationSec)}</td>
        <td>${formatPace(run.paceSecPerKm)}</td>
        <td>${formatHeartRateCell(run.avgHr)}</td>
        <td>${formatHeartRateCell(run.maxHr, true)}</td>
        <td>
          <div class="actions">
            <button type="button" class="icon-button" data-action="edit" data-id="${run.id}" aria-label="Bewerk run ${formatDate(run.date)}">✏️</button>
            <button type="button" class="icon-button" data-action="delete" data-id="${run.id}" aria-label="Verwijder run ${formatDate(run.date)}">🗑️</button>
          </div>
        </td>
      `;
      runsBody.appendChild(tr);
    });
  }

  function renderCharts(stats) {
    const chartsLib = window.RunningSmartCharts;
    if (!chartsLib || !chartsLib.renderHrLineChart) return;

    if (hrLineChart12) {
      hrLineChart12.destroy();
      hrLineChart12 = undefined;
    }
    if (hrLineChartAll) {
      hrLineChartAll.destroy();
      hrLineChartAll = undefined;
    }

    if (hrLineCanvas12) {
      if (stats.hrData12Weeks && stats.hrData12Weeks.length) {
        hrLineEmpty12?.setAttribute('hidden', '');
        hrLineChart12 = chartsLib.renderHrLineChart(hrLineCanvas12, stats.hrData12Weeks);
      } else {
        hrLineEmpty12?.removeAttribute('hidden');
      }
    }

    if (hrLineCanvasAll) {
      if (stats.hrDataAll && stats.hrDataAll.length) {
        hrLineEmptyAll?.setAttribute('hidden', '');
        hrLineChartAll = chartsLib.renderHrLineChart(hrLineCanvasAll, stats.hrDataAll);
      } else {
        hrLineEmptyAll?.removeAttribute('hidden');
      }
    }
  }

  function formatHeartRateCell(value, isMax = false) {
    if (!Number.isFinite(value)) {
      const label = isMax ? 'Max. hartslag nog invullen' : 'Gem. hartslag ontbreekt';
      return `<span class="hr-pill missing" title="${label}">♡</span>`;
    }
    return `<span class="hr-pill" title="${isMax ? 'Maximale hartslag' : 'Gemiddelde hartslag'}">${value} bpm</span>`;
  }

  function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDistance(distance) {
    return `${distance.toFixed(2).replace('.', ',')} km`;
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

  function formatPaceShort(secondsPerKm) {
    const pace = formatPace(secondsPerKm);
    return pace === '—' ? pace : pace.replace(' min/km', '');
  }

  function formatHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return '0,00';
    const value = hours >= 10 ? hours.toFixed(1) : hours.toFixed(2);
    return value.replace('.', ',');
  }

  function formatKmValue(value) {
    return value.toFixed(1).replace('.', ',');
  }

  function formatGoalPace(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function startOfWeek(date) {
    const temp = new Date(date);
    const day = temp.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    temp.setDate(temp.getDate() + diff);
    temp.setHours(0, 0, 0, 0);
    return temp;
  }

  function isSameWeek(dateA, dateB) {
    const startA = startOfWeek(dateA);
    const startB = startOfWeek(dateB);
    return startA.getTime() === startB.getTime();
  }

  function createGaugeSvg(progressValue, markerProgress) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.classList.add('gauge-svg');

    const arcPath = describeArc(60, 60, GAUGE_RADIUS, GAUGE_START, GAUGE_END + 360);

    const track = document.createElementNS(SVG_NS, 'path');
    track.setAttribute('d', arcPath);
    track.classList.add('gauge-track');
    svg.appendChild(track);

    const fill = document.createElementNS(SVG_NS, 'path');
    fill.setAttribute('d', arcPath);
    fill.classList.add('gauge-fill');
    fill.setAttribute('stroke-dasharray', GAUGE_LENGTH.toFixed(2));
    const safeProgress = clamp(Number(progressValue) || 0, 0, 1);
    fill.setAttribute('stroke-dashoffset', (GAUGE_LENGTH * (1 - safeProgress)).toFixed(2));
    svg.appendChild(fill);

    for (let i = 0; i <= 6; i += 1) {
      const ratio = i / 6;
      const angle = GAUGE_START + ratio * GAUGE_RANGE;
      const isMajor = i % 3 === 0;
      const outer = polarToCartesian(60, 60, GAUGE_RADIUS + 4, angle);
      const inner = polarToCartesian(60, 60, GAUGE_RADIUS - (isMajor ? 16 : 10), angle);
      const tick = document.createElementNS(SVG_NS, 'line');
      tick.setAttribute('x1', inner.x.toFixed(2));
      tick.setAttribute('y1', inner.y.toFixed(2));
      tick.setAttribute('x2', outer.x.toFixed(2));
      tick.setAttribute('y2', outer.y.toFixed(2));
      tick.classList.add('gauge-tick');
      if (isMajor) {
        tick.classList.add('major');
      }
      svg.appendChild(tick);
    }

    if (typeof markerProgress === 'number' && Number.isFinite(markerProgress)) {
      const safeMarker = clamp(markerProgress, 0, 1);
      const markerAngle = GAUGE_START + safeMarker * GAUGE_RANGE;
      const outer = polarToCartesian(60, 60, GAUGE_RADIUS + 2, markerAngle);
      const inner = polarToCartesian(60, 60, GAUGE_RADIUS - 18, markerAngle);
      const marker = document.createElementNS(SVG_NS, 'line');
      marker.setAttribute('x1', inner.x.toFixed(2));
      marker.setAttribute('y1', inner.y.toFixed(2));
      marker.setAttribute('x2', outer.x.toFixed(2));
      marker.setAttribute('y2', outer.y.toFixed(2));
      marker.classList.add('gauge-marker');
      svg.appendChild(marker);
    }

    return svg;
  }

  function polarToCartesian(cx, cy, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleInRadians),
      y: cy + radius * Math.sin(angleInRadians),
    };
  }

  function describeArc(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  function gaugeProgressFromPace(paceSeconds) {
    if (!Number.isFinite(paceSeconds) || paceSeconds <= 0) return 0;
    const min = 165; // 02:45
    const max = 900; // 15:00
    const clamped = clamp((paceSeconds - min) / (max - min), 0, 1);
    return 1 - clamped;
  }

  function gaugeProgressFromHr(avgHr) {
    if (!Number.isFinite(avgHr) || avgHr <= 0) return 0;
    const maxHr = Number.isFinite(settings.maxHrUser) && settings.maxHrUser > 0 ? settings.maxHrUser : 200;
    return clamp(avgHr / maxHr, 0, 1);
  }

  function getHrGaugeMarker() {
    if (!settings || !settings.zones) return null;
    const zone = settings.zones.z3;
    if (!zone) return null;
    return clamp(zone[1], 0, 1);
  }

  function formatHrGaugeDetail(count) {
    if (!Number.isFinite(count) || count <= 0) return '';
    return count === 1 ? 'Gebaseerd op 1 run.' : `Gebaseerd op ${count} runs.`;
  }

  function describeHrZone(avgHr) {
    if (!Number.isFinite(avgHr) || avgHr <= 0) return '';
    const maxHr = Number.isFinite(settings.maxHrUser) && settings.maxHrUser > 0 ? settings.maxHrUser : null;
    if (!maxHr) {
      return 'Tip: stel je maximale hartslag in voor zone-informatie.';
    }
    const zones = settings.zones || computeZones();
    const ratio = avgHr / maxHr;
    const ordered = ['z1', 'z2', 'z3', 'z4', 'z5'];
    let foundKey = null;
    let range = null;
    for (const key of ordered) {
      const zone = zones[key];
      if (!zone) continue;
      const [min, max] = zone;
      if (ratio >= min && ratio <= max + 0.0001) {
        foundKey = key;
        range = zone;
        break;
      }
    }
    if (!foundKey && zones.z5) {
      foundKey = 'z5';
      range = zones.z5;
    }
    if (!range) {
      return `Gemeten: ${Math.round(avgHr)} bpm`;
    }
    const lower = Math.round(range[0] * maxHr);
    const upper = Math.round(range[1] * maxHr);
    return `Zone ${foundKey.toUpperCase()} · ${lower}–${upper} bpm`;
  }

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
})();
