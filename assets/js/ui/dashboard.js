import { saveRuns } from '../data/storage.js';
import { computeStats } from '../data/stats.js';
import { renderRuns } from './runs.js';
import {
  formatHours,
  formatPaceShort,
  formatDate,
  formatDuration,
  formatKmValue,
} from '../utils/formatters.js';
import {
  createGaugeSvg,
  gaugeProgressFromPace,
  gaugeProgressFromHr,
  getHrGaugeMarker,
  formatHrGaugeDetail,
  describeHrZone,
} from './gauges.js';
import { renderHrLineChart } from '../charts.js';
import { clamp } from '../utils/math.js';
import { startOfWeek } from '../utils/time.js';

export function initDashboard(context) {
  return {
    renderAll: () => renderAll(context),
  };
}

function renderAll(context) {
  const { state } = context;
  saveRuns(state.runs);
  const stats = computeStats(state.runs, state.settings);
  renderHero(context, stats);
  renderKPIs(context, stats);
  renderWeeklyChart(context, stats);
  renderRuns(context);
  renderCharts(context, stats);
}

function renderHero(context, stats) {
  const { elements, state } = context;
  const { heroTime, heroDistance, heroAllTimePace, heroAvgPace, heroAvgHr, heroCaption } = elements;
  if (!state.runs.length) {
    if (heroTime) heroTime.textContent = '0,00';
    if (heroDistance) heroDistance.textContent = '0,00';
    if (heroAllTimePace) heroAllTimePace.textContent = '—';
    if (heroAvgPace) heroAvgPace.textContent = '—';
    if (heroAvgHr) heroAvgHr.textContent = '—';
    if (heroCaption) heroCaption.textContent = 'Voer je eerste run in om te beginnen.';
    return;
  }
  const latest = state.runs[0];
  if (heroTime) heroTime.textContent = formatHours(latest.durationSec / 3600);
  if (heroDistance) heroDistance.textContent = latest.distanceKm.toFixed(2).replace('.', ',');
  if (heroAllTimePace) heroAllTimePace.textContent = stats.overallPace ? formatPaceShort(stats.overallPace) : '—';
  if (heroAvgPace) heroAvgPace.textContent = stats.avgPace30 ? formatPaceShort(stats.avgPace30) : '—';
  if (heroAvgHr) heroAvgHr.textContent = stats.avgHr30 ? `${Math.round(stats.avgHr30)} bpm` : '—';
  if (heroCaption) {
    heroCaption.textContent = `Laatste run · ${formatDate(latest.date)} · ${formatDuration(latest.durationSec)} (${latest.distanceKm.toFixed(2)} km)`;
  }
}

function renderKPIs(context, stats) {
  const { elements, state } = context;
  const { kpiGrid } = elements;
  if (!kpiGrid) return;
  const weekGoal = state.settings.weeklyGoalKm || stats.bestWeekDistance || 20;
  const monthGoal = state.settings.monthlyGoalKm || stats.bestMonthDistance || 80;
  const paceGoal = state.settings.targetPaceSecPerKm || null;

  const hasOverallPace = Number.isFinite(stats.overallPace) && stats.overallPace > 0;
  const has30Pace = Number.isFinite(stats.avgPace30) && stats.avgPace30 > 0;
  const has7Pace = Number.isFinite(stats.avgPace7) && stats.avgPace7 > 0;
  const hasAvgHr30 = Number.isFinite(stats.avgHr30) && stats.avgHr30 > 0;
  const hasAvgHr7 = Number.isFinite(stats.avgHr7) && stats.avgHr7 > 0;
  const hasAvgHrAll = Number.isFinite(stats.avgHrAll) && stats.avgHrAll > 0;

  const hrMarker = getHrGaugeMarker(state.settings);

  const cards = [];

  cards.push({
    type: 'gauge',
    label: 'Kilometers deze week',
    valueText: formatKmValue(stats.kmWeek),
    unitText: 'km',
    detail: state.settings.weeklyGoalKm
      ? `Doel ${formatKmValue(state.settings.weeklyGoalKm)} km`
      : `Richtwaarde ${formatKmValue(weekGoal)} km`,
    helper: stats.kmWeek >= weekGoal ? 'Doel gehaald! 🎉' : `${formatKmValue(Math.max(weekGoal - stats.kmWeek, 0))} km te gaan`,
    progress: clamp(stats.kmWeek / weekGoal, 0, 1),
    ariaLabel: `Kilometers deze week ${formatKmValue(stats.kmWeek)} van ${formatKmValue(weekGoal)}`,
  });

  cards.push({
    type: 'gauge',
    label: 'Kilometers deze maand',
    valueText: formatKmValue(stats.kmMonth),
    unitText: 'km',
    detail: state.settings.monthlyGoalKm
      ? `Doel ${formatKmValue(state.settings.monthlyGoalKm)} km`
      : `Richtwaarde ${formatKmValue(monthGoal)} km`,
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
    detail: has7Pace ? 'Snelheid op basis van je laatste week.' : '',
    helper: has7Pace ? 'Hou dit tempo vast voor progressie.' : 'Nog geen runs in de laatste week.',
    progress: has7Pace ? gaugeProgressFromPace(stats.avgPace7) : 0,
    marker: paceGoal ? gaugeProgressFromPace(paceGoal) : null,
    ariaLabel: has7Pace ? `Tempo laatste 7 dagen ${formatPaceShort(stats.avgPace7)}` : 'Geen tempo (7 dagen)',
  });

  cards.push({
    type: 'gauge',
    label: 'Gem. hartslag (30 dagen)',
    valueText: hasAvgHr30 ? String(Math.round(stats.avgHr30)) : '—',
    unitText: hasAvgHr30 ? 'bpm' : '',
    detail: hasAvgHr30 ? formatHrGaugeDetail(stats.hrData30.length) : '',
    helper: hasAvgHr30 ? describeHrZone(stats.avgHr30, state.settings) : 'Nog geen runs met hartslag in de laatste 30 dagen.',
    progress: hasAvgHr30 ? gaugeProgressFromHr(stats.avgHr30, state.settings) : 0,
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
    helper: hasAvgHr7 ? describeHrZone(stats.avgHr7, state.settings) : 'Nog geen runs met hartslag in de laatste week.',
    progress: hasAvgHr7 ? gaugeProgressFromHr(stats.avgHr7, state.settings) : 0,
    marker: hrMarker,
    tone: 'green',
    ariaLabel: hasAvgHr7
      ? `Gemiddelde hartslag laatste 7 dagen ${Math.round(stats.avgHr7)} slagen per minuut`
      : 'Geen hartslagdata voor de laatste 7 dagen',
  });

  cards.push({
    type: 'gauge',
    label: 'Gem. hartslag (altijd)',
    valueText: hasAvgHrAll ? String(Math.round(stats.avgHrAll)) : '—',
    unitText: hasAvgHrAll ? 'bpm' : '',
    detail: hasAvgHrAll ? formatHrGaugeDetail(stats.hrDataAll.length) : '',
    helper: hasAvgHrAll ? describeHrZone(stats.avgHrAll, state.settings) : 'Voeg runs met hartslag toe voor dit inzicht.',
    progress: hasAvgHrAll ? gaugeProgressFromHr(stats.avgHrAll, state.settings) : 0,
    marker: hrMarker,
    tone: 'green',
    ariaLabel: hasAvgHrAll
      ? `Gemiddelde hartslag over alle runs ${Math.round(stats.avgHrAll)} slagen per minuut`
      : 'Geen hartslagdata beschikbaar',
  });

  cards.push({
    type: 'plain',
    label: 'HR herstel-indicator',
    valueText: stats.recovery ? `${Math.round(stats.recovery)} bpm verschil` : '—',
    helper: stats.recovery
      ? 'Gemiddeld verschil tussen max. en gem. hartslag (30 dagen).'
      : 'Voeg runs met max. hartslag toe voor dit inzicht.',
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

    kpiGrid.appendChild(wrapper);
  });
}

function renderWeeklyChart(context, stats) {
  const { elements } = context;
  const { chartBars, chartLabels } = elements;
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

  bars.forEach((bar) => {
    const barEl = document.createElement('div');
    barEl.className = 'chart-bar';
    const height = maxKm > 0 ? (bar.value / maxKm) * 100 : 0;
    barEl.style.setProperty('--bar-value', `${height.toFixed(1)}%`);
    barEl.setAttribute('aria-label', `${bar.label}: ${bar.value.toFixed(1)} km`);
    chartBars.appendChild(barEl);

    const label = document.createElement('span');
    label.className = 'chart-label';
    label.textContent = bar.label;
    chartLabels.appendChild(label);
  });
}

function renderCharts(context, stats) {
  const { elements, state } = context;
  const { hrLineCanvas12, hrLineCanvasAll, hrLineEmpty12, hrLineEmptyAll } = elements;

  if (state.charts.hrLine12) {
    state.charts.hrLine12.destroy();
    state.charts.hrLine12 = undefined;
  }
  if (state.charts.hrLineAll) {
    state.charts.hrLineAll.destroy();
    state.charts.hrLineAll = undefined;
  }

  if (hrLineCanvas12) {
    if (stats.hrData12Weeks && stats.hrData12Weeks.length) {
      hrLineEmpty12?.setAttribute('hidden', '');
      state.charts.hrLine12 = renderHrLineChart(hrLineCanvas12, stats.hrData12Weeks);
    } else {
      hrLineEmpty12?.removeAttribute('hidden');
    }
  }

  if (hrLineCanvasAll) {
    if (stats.hrDataAll && stats.hrDataAll.length) {
      hrLineEmptyAll?.setAttribute('hidden', '');
      state.charts.hrLineAll = renderHrLineChart(hrLineCanvasAll, stats.hrDataAll);
    } else {
      hrLineEmptyAll?.removeAttribute('hidden');
    }
  }
}
