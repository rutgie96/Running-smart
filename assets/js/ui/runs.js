import { parseDistance, parseTime, parseHeartRate } from '../utils/parsers.js';
import { formatDate, formatDistance, formatDuration, formatPace } from '../utils/formatters.js';
import { mergeRuns, sanitiseRun } from '../data/storage.js';
import { showToast } from './toast.js';
import { showView } from './navigation.js';
import { uid } from '../utils/id.js';

export function initRuns(context, dashboard) {
  const { elements } = context;
  initialiseDate(elements.runDate);
  elements.submitButton?.setAttribute('aria-label', 'Nieuwe run opslaan');


  if (elements.runForm) {
    elements.runForm.addEventListener('submit', (event) => handleRunSubmit(event, context, dashboard));
    elements.runForm.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        resetForm(context);
      }
    });
  }

  elements.runsBody?.addEventListener('click', (event) => handleRunAction(event, context, dashboard));
  elements.backupButton?.addEventListener('click', () => exportJsonBackup(context));
  elements.backupCsvButton?.addEventListener('click', () => exportCsvBackup(context));
  elements.restoreButton?.addEventListener('click', () => {
    if (!elements.importFile) return;
    elements.importFile.value = '';
    elements.importFile.click();
  });
  elements.importFile?.addEventListener('change', (event) => handleImport(event, context, dashboard));
  elements.clearButton?.addEventListener('click', () => clearRuns(context, dashboard));

  return {
    renderRuns: () => renderRuns(context),
    resetForm: () => resetForm(context),
  };
}

function handleRunSubmit(event, context, dashboard) {
  event.preventDefault();
  const { elements, state } = context;
  const { runDate, runDistance, runTime, runAvgHr, runMaxHr } = elements;
  if (!runDate || !runDistance || !runTime || !runAvgHr) return;

  const dateValue = runDate.value;
  const distanceValue = parseDistance(runDistance.value);
  const durationValue = parseTime(runTime.value);
  const avgHrValue = parseHeartRate(runAvgHr.value, { required: true, lower: 30, upper: 240 });
  const maxHrValue = runMaxHr
    ? parseHeartRate(runMaxHr.value, { required: false, lower: 30, upper: 260, minComparedTo: avgHrValue })
    : null;

  clearFormFeedback(elements);

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
    showFormError(elements, `Controleer ${invalidFields.join(', ')}.`);
    return;
  }

  const pace = distanceValue > 0 ? durationValue / distanceValue : null;
  if (!Number.isFinite(pace)) {
    showFormError(elements, 'Kon tempo niet berekenen. Controleer de afstand en tijd.');
    return;
  }

  const unrealistic = pace < 165 || pace > 900;
  if (unrealistic) {
    showFormWarning(elements, '⚠️ Waarschijnlijk onrealistische tempo-waarde, controleer je invoer.');
  }

  if (durationValue < 60 || durationValue > 86400) {
    setFieldValidity(runTime, false);
    showFormError(elements, 'Tijd moet tussen 00:01:00 en 24:00:00 liggen.');
    return;
  }

  if (distanceValue <= 0 || distanceValue >= 200) {
    setFieldValidity(runDistance, false);
    showFormError(elements, 'Afstand moet groter dan 0 en kleiner dan 200 km zijn.');
    return;
  }

  if (maxHrValue !== null && avgHrValue !== null && maxHrValue < avgHrValue) {
    showFormError(elements, 'Max. hartslag moet gelijk aan of hoger dan je gemiddelde hartslag zijn.');
    setFieldValidity(runMaxHr, false);
    return;
  }

  const runData = {
    id: state.editId || uid(),
    date: dateValue,
    distanceKm: Number(distanceValue.toFixed(2)),
    durationSec: durationValue,
    paceSecPerKm: Math.round(pace),
    avgHr: avgHrValue,
    maxHr: maxHrValue === null ? null : maxHrValue,
    notes: '',
  };

  if (state.editId) {
    state.runs = state.runs.map((run) => (run.id === state.editId ? runData : run));
    showToast(elements.toast, 'Run bijgewerkt');
  } else {
    state.runs.push(runData);
    showToast(elements.toast, 'Run opgeslagen');
  }

  state.runs.sort((a, b) => b.date.localeCompare(a.date));
  state.editId = null;
  dashboard.renderAll();
  resetForm(context);
}

function handleRunAction(event, context, dashboard) {
  const { elements, state } = context;
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  const run = state.runs.find((item) => item.id === id);
  if (!run) return;

  if (action === 'edit') {
    state.editId = id;
    showView(context, 'logView');
    if (elements.runDate) elements.runDate.value = run.date;
    if (elements.runDistance) elements.runDistance.value = run.distanceKm.toFixed(2).replace('.', ',');
    if (elements.runTime) elements.runTime.value = formatDuration(run.durationSec);
    if (elements.runAvgHr) elements.runAvgHr.value = Number.isFinite(run.avgHr) ? String(run.avgHr) : '';
    if (elements.runMaxHr) elements.runMaxHr.value = Number.isFinite(run.maxHr) ? String(run.maxHr) : '';
    if (elements.submitButton) {
      elements.submitButton.textContent = 'Run bijwerken';
      elements.submitButton.setAttribute('aria-label', 'Bestaande run bijwerken');
    }
    if (elements.formFeedback) {
      elements.formFeedback.textContent = 'Bewerken: pas velden aan en sla op of druk op Esc om te annuleren.';
    }
    setFieldValidity(elements.runDistance, true);
    setFieldValidity(elements.runTime, true);
    setFieldValidity(elements.runAvgHr, true);
    setFieldValidity(elements.runMaxHr, true);
    elements.runDistance?.focus();
  }

  if (action === 'delete') {
    if (confirm('Weet je zeker dat je deze run wilt verwijderen?')) {
      state.runs = state.runs.filter((item) => item.id !== id);
      dashboard.renderAll();
      if (state.editId === id) {
        resetForm(context);
      }
      showToast(elements.toast, 'Run verwijderd');
    }
  }
}

function exportJsonBackup(context) {
  const { state } = context;
  const blob = new Blob([JSON.stringify(state.runs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `running-smart-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCsvBackup(context) {
  const { state, elements } = context;
  if (!state.runs.length) {
    showToast(elements.toast, 'Geen runs om te exporteren');
    return;
  }
  const header = 'date,distanceKm,durationSec,paceSecPerKm,avgHr,maxHr\n';
  const rows = state.runs
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
  showToast(elements.toast, 'CSV-export klaar');
}

function handleImport(event, context, dashboard) {
  const { elements, state } = context;
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
      state.runs = mergeRuns(state.runs, importedRuns);
      dashboard.renderAll();
      resetForm(context);
      showToast(elements.toast, 'Runs geïmporteerd');
    } catch (error) {
      console.error(error);
      alert('Kon het bestand niet lezen. Controleer de inhoud.');
    }
  };
  reader.readAsText(file);
}

function clearRuns(context, dashboard) {
  const { elements, state } = context;
  if (confirm('Weet je zeker dat je alle runs wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
    state.runs = [];
    dashboard.renderAll();
    resetForm(context);
    showToast(elements.toast, 'Alle runs verwijderd');
  }
}

function initialiseDate(dateInput) {
  if (!dateInput) return;
  const local = new Date();
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  dateInput.value = local.toISOString().slice(0, 10);
}

function resetForm(context) {
  const { elements, state } = context;
  elements.runForm?.reset();
  initialiseDate(elements.runDate);
  state.editId = null;
  if (elements.submitButton) {
    elements.submitButton.textContent = 'Run opslaan';
    elements.submitButton.setAttribute('aria-label', 'Nieuwe run opslaan');
  }
  clearFormFeedback(elements);
  if (elements.runAvgHr) elements.runAvgHr.value = '';
  if (elements.runMaxHr) elements.runMaxHr.value = '';
}

function clearFormFeedback(elements) {
  if (elements.formFeedback) {
    elements.formFeedback.textContent = '';
  }
  if (elements.formWarning) {
    elements.formWarning.textContent = '';
  }
}

function showFormError(elements, message) {
  if (!elements.formFeedback) return;
  elements.formFeedback.textContent = message;
}

function showFormWarning(elements, message) {
  if (!elements.formWarning) return;
  elements.formWarning.textContent = message;
}

function setFieldValidity(field, isValid) {
  field?.setAttribute('aria-invalid', String(!isValid));
}

function formatHeartRateCell(value, isMax = false) {
  if (!Number.isFinite(value)) {
    const label = isMax ? 'Max. hartslag nog invullen' : 'Gem. hartslag ontbreekt';
    return `<span class="hr-pill missing" title="${label}">♡</span>`;
  }
  return `<span class="hr-pill" title="${isMax ? 'Maximale hartslag' : 'Gemiddelde hartslag'}">${value} bpm</span>`;
}

export function renderRuns(context) {
  const { elements, state } = context;
  const { runsBody, emptyState } = elements;
  if (!runsBody) return;
  runsBody.innerHTML = '';
  if (!state.runs.length) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  state.runs.forEach((run) => {
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
