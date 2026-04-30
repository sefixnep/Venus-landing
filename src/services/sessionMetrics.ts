import type { SessionRecord, SessionMetrics } from '../types/simulation';

export function computeMetrics(sessions: SessionRecord[]): SessionMetrics {
  const total = sessions.length;

  if (total === 0) {
    return emptyMetrics();
  }

  const successes = sessions.filter(s => s.result.outcome === 'success');
  const successRate = total > 0 ? successes.length / total : 0;

  // Best touchdown speed among successful landings
  const bestTouchdownSpeed = successes.length > 0
    ? Math.min(...successes.map(s => s.result.touchdownSpeed))
    : null;

  // Average touchdown speed (all attempts)
  const avgTouchdownSpeed = sessions.reduce((sum, s) => sum + s.result.touchdownSpeed, 0) / total;

  // Trends: last 10 values
  const last10 = sessions.slice(-10);
  const touchdownSpeedTrend = last10.map(s => s.result.touchdownSpeed);
  const fuelTrend = last10.map(s => s.result.fuelRemaining);

  // Average fuel remaining
  const avgFuelRemaining = sessions.reduce((sum, s) => sum + s.result.fuelRemaining, 0) / total;

  // Current streak
  let currentStreakCount = 0;
  let currentStreakType: 'success' | 'failure' | null = null;
  if (total > 0) {
    currentStreakType = sessions[total - 1].result.outcome;
    for (let i = total - 1; i >= 0; i--) {
      if (sessions[i].result.outcome === currentStreakType) {
        currentStreakCount++;
      } else {
        break;
      }
    }
  }

  // Improvement flag: compare avg touchdown speed of last 3 vs previous 3
  const improvementFlag = computeImprovementFlag(sessions);

  return {
    totalAttempts: total,
    totalSuccesses: successes.length,
    successRate,
    bestTouchdownSpeed,
    avgTouchdownSpeed,
    touchdownSpeedTrend,
    fuelTrend,
    avgFuelRemaining,
    currentStreakCount,
    currentStreakType,
    improvementFlag,
  };
}

function computeImprovementFlag(sessions: SessionRecord[]): 'improving' | 'stable' | 'declining' {
  if (sessions.length < 4) return 'stable';

  const recent3 = sessions.slice(-3);
  const prev3 = sessions.slice(-6, -3);

  if (prev3.length < 2) return 'stable';

  const avgRecent = avg(recent3.map(s => s.result.touchdownSpeed));
  const avgPrev = avg(prev3.map(s => s.result.touchdownSpeed));

  if (avgPrev === 0) return 'stable';

  const change = (avgRecent - avgPrev) / avgPrev;

  if (change < -0.1) return 'improving'; // speed decreased = better
  if (change > 0.1) return 'declining';
  return 'stable';
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function emptyMetrics(): SessionMetrics {
  return {
    totalAttempts: 0,
    totalSuccesses: 0,
    successRate: 0,
    bestTouchdownSpeed: null,
    avgTouchdownSpeed: 0,
    touchdownSpeedTrend: [],
    fuelTrend: [],
    avgFuelRemaining: 0,
    currentStreakCount: 0,
    currentStreakType: null,
    improvementFlag: 'stable',
  };
}
