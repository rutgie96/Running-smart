import { startOfWeek, isSameWeek } from '../utils/time.js';

export function computeStats(runs, settings) {
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
    const date = new Date(`${run.date}T00:00:00`);
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
    const date = new Date(`${run.date}T00:00:00`);
    return date >= sevenDaysAgo && date <= now && Number.isFinite(run.avgHr);
  });
  const hrData30 = runs.filter((run) => {
    const date = new Date(`${run.date}T00:00:00`);
    return date >= thirtyDaysAgo && date <= now && Number.isFinite(run.avgHr);
  });
  const hrData12Weeks = runs.filter((run) => {
    const date = new Date(`${run.date}T00:00:00`);
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
    settings,
  };
}
