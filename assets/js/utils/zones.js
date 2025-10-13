export const ZONE_PERCENTAGES = {
  z1: [0.5, 0.6],
  z2: [0.6, 0.7],
  z3: [0.7, 0.8],
  z4: [0.8, 0.9],
  z5: [0.9, 1.0],
};

export function computeZones() {
  return { ...ZONE_PERCENTAGES };
}

export function zoneBoundaries(maxHr) {
  if (!Number.isFinite(maxHr) || maxHr <= 0) {
    return null;
  }
  const result = {};
  Object.entries(ZONE_PERCENTAGES).forEach(([key, [min, max]]) => {
    result[key] = [Math.round(min * maxHr), Math.round(max * maxHr)];
  });
  return result;
}
