export interface SimulationParams {
  mass: number;            // kg (500-1000)
  fuelMass: number;        // kg
  entrySpeed: number;      // m/s (10000-11000)
  entryAltitude: number;   // m (130000)
  heatShieldMass: number;  // kg
  dragCoeff: number;       // Cd (~1.2)
  crossSection: number;    // m² (2-3)
  engineThrust: number;    // N
  engineIsp: number;       // s (specific impulse)
  drogueArea: number;      // m² effective area with drogue chute
  drogueCd: number;        // Cd with drogue
  mainChuteArea: number;   // m² effective area with main chute
  mainChuteCd: number;     // Cd with main chute
}

export interface SimulationState {
  time: number;            // s
  altitude: number;        // m
  velocity: number;        // m/s (negative = downward)
  acceleration: number;    // m/s²
  gForce: number;          // g
  mass: number;            // kg (changes with fuel burn and heatshield jettison)
  fuel: number;            // kg remaining
  fuelFraction: number;    // 0-1
  tempOutside: number;     // °C
  tempInside: number;      // °C
  atmosphereDensity: number; // kg/m³
  pressure: number;        // atm
  machNumber: number;      // Mach

  heatShieldActive: boolean;
  heatShieldJettisoned: boolean;
  drogueDeployed: boolean;
  mainChuteDeployed: boolean;
  engineRunning: boolean;

  phase: SimPhase;
  status: SimStatus;
  failureReason: string | null;
  failureCode: string | null;

  dragForce: number;
  thrustForce: number;
  gravityForce: number;
}

export type SimPhase =
  | 'pre_launch'
  | 'atmospheric_entry'
  | 'descent'
  | 'parachute_descent'
  | 'powered_descent'
  | 'landed';

export type SimStatus = 'running' | 'success' | 'failure';

export interface SimEvent {
  time: number;
  type: string;
  altitude: number;
  speed: number;
  detail?: string;
}

export interface SimResult {
  outcome: 'success' | 'failure';
  touchdownSpeed: number;
  duration: number;
  fuelRemaining: number;
  failureReason: string | null;
  failureCode: string | null;
  events: SimEvent[];
}

export interface TelemetrySnapshot {
  time: number;
  altitude: number;   // m
  speed: number;      // m/s (abs)
  gForce: number;
  fuelFraction: number;
  tempOutside: number;
  tempInside: number;
  pressure: number;
  machNumber: number;
}

export interface SessionRecord {
  sessionId: string;
  attemptNumber: number;
  timestamp: number;
  initialParams: {
    mass: number;
    fuelMass: number;
    entrySpeed: number;
    entryAltitude: number;
  };
  events: SimEvent[];
  result: {
    outcome: 'success' | 'failure';
    touchdownSpeed: number;
    fuelRemaining: number;
    duration: number;
    failureCode: string | null;
  };
}

export interface SessionMetrics {
  totalAttempts: number;
  totalSuccesses: number;
  successRate: number;
  bestTouchdownSpeed: number | null;
  avgTouchdownSpeed: number;
  touchdownSpeedTrend: number[];
  fuelTrend: number[];
  avgFuelRemaining: number;
  currentStreakCount: number;
  currentStreakType: 'success' | 'failure' | null;
  improvementFlag: 'improving' | 'stable' | 'declining';
}
