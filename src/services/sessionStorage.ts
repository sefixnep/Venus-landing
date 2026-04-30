import type { SimulationParams, SimResult, SessionRecord } from '../types/simulation';

const STORAGE_KEY = 'venus-sessions';
const MAX_SESSIONS = 200;
const TRIM_TO = 150;

export function getSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SessionRecord[];
  } catch {
    return [];
  }
}

export function getAttemptNumber(): number {
  return getSessions().length + 1;
}

export function saveSession(params: SimulationParams, result: SimResult): SessionRecord {
  const sessions = getSessions();

  const record: SessionRecord = {
    sessionId: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    attemptNumber: sessions.length + 1,
    timestamp: Date.now(),
    initialParams: {
      mass: params.mass,
      fuelMass: params.fuelMass,
      entrySpeed: params.entrySpeed,
      entryAltitude: params.entryAltitude,
    },
    events: result.events,
    result: {
      outcome: result.outcome,
      touchdownSpeed: result.touchdownSpeed,
      fuelRemaining: result.fuelRemaining,
      duration: result.duration,
      failureCode: result.failureCode,
    },
  };

  sessions.push(record);

  // Trim if over limit
  const trimmed = sessions.length > MAX_SESSIONS
    ? sessions.slice(sessions.length - TRIM_TO)
    : sessions;

  writeSessions(trimmed);
  return record;
}

export function clearSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function writeSessions(sessions: SessionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // QuotaExceeded or incognito — try aggressive trim
    try {
      const trimmed = sessions.slice(sessions.length - 50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // silently discard
    }
  }
}
