import { GAUGE_CONFIG } from '../constants.js';
import { computeZones } from '../utils/zones.js';
import { clamp } from '../utils/math.js';

const { svgNs, radius, start, end } = GAUGE_CONFIG;
const range = end - start + 360;
const length = 2 * Math.PI * radius * (range / 360);

export function createGaugeSvg(progressValue, markerProgress) {
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.classList.add('gauge-svg');

  const arcPath = describeArc(60, 60, radius, start, end + 360);

  const track = document.createElementNS(svgNs, 'path');
  track.setAttribute('d', arcPath);
  track.classList.add('gauge-track');
  svg.appendChild(track);

  const fill = document.createElementNS(svgNs, 'path');
  fill.setAttribute('d', arcPath);
  fill.classList.add('gauge-fill');
  fill.setAttribute('stroke-dasharray', length.toFixed(2));
  const safeProgress = clamp(Number(progressValue) || 0, 0, 1);
  fill.setAttribute('stroke-dashoffset', (length * (1 - safeProgress)).toFixed(2));
  svg.appendChild(fill);

  for (let i = 0; i <= 6; i += 1) {
    const ratio = i / 6;
    const angle = start + ratio * range;
    const isMajor = i % 3 === 0;
    const outer = polarToCartesian(60, 60, radius + 4, angle);
    const inner = polarToCartesian(60, 60, radius - (isMajor ? 16 : 10), angle);
    const tick = document.createElementNS(svgNs, 'line');
    tick.setAttribute('x1', outer.x.toFixed(2));
    tick.setAttribute('y1', outer.y.toFixed(2));
    tick.setAttribute('x2', inner.x.toFixed(2));
    tick.setAttribute('y2', inner.y.toFixed(2));
    tick.classList.add('gauge-tick');
    if (isMajor) {
      tick.classList.add('major');
    }
    svg.appendChild(tick);
  }

  if (typeof markerProgress === 'number' && Number.isFinite(markerProgress)) {
    const safeMarker = clamp(markerProgress, 0, 1);
    const markerAngle = start + safeMarker * range;
    const outer = polarToCartesian(60, 60, radius + 2, markerAngle);
    const inner = polarToCartesian(60, 60, radius - 18, markerAngle);
    const marker = document.createElementNS(svgNs, 'line');
    marker.setAttribute('x1', inner.x.toFixed(2));
    marker.setAttribute('y1', inner.y.toFixed(2));
    marker.setAttribute('x2', outer.x.toFixed(2));
    marker.setAttribute('y2', outer.y.toFixed(2));
    marker.classList.add('gauge-marker');
    svg.appendChild(marker);
  }

  return svg;
}

export function gaugeProgressFromPace(paceSeconds) {
  if (!Number.isFinite(paceSeconds) || paceSeconds <= 0) return 0;
  const min = 165; // 02:45
  const max = 900; // 15:00
  const clamped = clamp((paceSeconds - min) / (max - min), 0, 1);
  return 1 - clamped;
}

export function gaugeProgressFromHr(avgHr, settings) {
  if (!Number.isFinite(avgHr) || avgHr <= 0) return 0;
  const maxHr = settings && Number.isFinite(settings.maxHrUser) && settings.maxHrUser > 0 ? settings.maxHrUser : 200;
  return clamp(avgHr / maxHr, 0, 1);
}

export function getHrGaugeMarker(settings) {
  if (!settings || !settings.zones) return null;
  const zone = settings.zones.z3;
  if (!zone) return null;
  return clamp(zone[1], 0, 1);
}

export function formatHrGaugeDetail(count) {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count === 1 ? 'Gebaseerd op 1 run.' : `Gebaseerd op ${count} runs.`;
}

export function describeHrZone(avgHr, settings) {
  if (!Number.isFinite(avgHr) || avgHr <= 0) return '';
  const maxHr = settings && Number.isFinite(settings.maxHrUser) && settings.maxHrUser > 0 ? settings.maxHrUser : null;
  if (!maxHr) {
    return 'Tip: stel je maximale hartslag in voor zone-informatie.';
  }
  const zones = settings.zones || computeZones();
  const ratio = avgHr / maxHr;
  const ordered = ['z1', 'z2', 'z3', 'z4', 'z5'];
  let foundKey = null;
  let rangeValues = null;
  for (const key of ordered) {
    const zone = zones[key];
    if (!zone) continue;
    const [min, max] = zone;
    if (ratio >= min && ratio <= max + 0.0001) {
      foundKey = key;
      rangeValues = zone;
      break;
    }
  }
  if (!foundKey && zones.z5) {
    foundKey = 'z5';
    rangeValues = zones.z5;
  }
  if (!rangeValues) {
    return `Gemeten: ${Math.round(avgHr)} bpm`;
  }
  const lower = Math.round(rangeValues[0] * maxHr);
  const upper = Math.round(rangeValues[1] * maxHr);
  return `Zone ${foundKey.toUpperCase()} · ${lower}–${upper} bpm`;
}

function polarToCartesian(cx, cy, r, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const startPoint = polarToCartesian(cx, cy, r, endAngle);
  const endPoint = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${endPoint.x} ${endPoint.y}`;
}
