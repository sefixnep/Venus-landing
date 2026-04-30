import type {
  SimulationParams,
  SimulationState,
  SimEvent,
  SimResult,
} from '../types/simulation';
import {
  getDensity,
  getTemperatureCelsius,
  getGravity,
  getSpeedOfSound,
  getPressure,
} from './venus';

const DT = 0.05; // simulation timestep (s)
const G0 = 9.80665; // standard gravity for Isp calculation

export const DEFAULT_PARAMS: SimulationParams = {
  mass: 750,               // kg dry mass
  fuelMass: 80,            // kg
  entrySpeed: 11000,       // m/s
  entryAltitude: 130000,   // m (130 km)
  heatShieldMass: 50,      // kg
  dragCoeff: 1.2,
  crossSection: 2.5,       // m²
  engineThrust: 8000,      // N
  engineIsp: 300,          // s
  drogueArea: 8,           // m²
  drogueCd: 1.5,
  mainChuteArea: 25,       // m²
  mainChuteCd: 2.0,
};

export function createInitialState(params: SimulationParams): SimulationState {
  const totalMass = params.mass + params.fuelMass + params.heatShieldMass;
  return {
    time: 0,
    altitude: params.entryAltitude,
    velocity: -params.entrySpeed, // negative = downward
    acceleration: 0,
    gForce: 0,
    mass: totalMass,
    fuel: params.fuelMass,
    fuelFraction: 1,
    tempOutside: getTemperatureCelsius(params.entryAltitude),
    tempInside: 25, // start at room temp
    atmosphereDensity: getDensity(params.entryAltitude),
    pressure: getPressure(params.entryAltitude),
    machNumber: params.entrySpeed / getSpeedOfSound(params.entryAltitude),

    heatShieldActive: true,
    heatShieldJettisoned: false,
    drogueDeployed: false,
    mainChuteDeployed: false,
    engineRunning: false,

    phase: 'atmospheric_entry',
    status: 'running',
    failureReason: null,
    failureCode: null,

    dragForce: 0,
    thrustForce: 0,
    gravityForce: 0,
  };
}

export class PhysicsEngine {
  params: SimulationParams;
  state: SimulationState;
  events: SimEvent[];
  private accumulator: number = 0;

  constructor(params: SimulationParams) {
    this.params = { ...params };
    this.state = createInitialState(params);
    this.events = [];
  }

  reset(params?: SimulationParams) {
    if (params) this.params = { ...params };
    this.state = createInitialState(this.params);
    this.events = [];
    this.accumulator = 0;
  }

  /**
   * Advance simulation by deltaTime seconds (can be variable).
   * Internally uses fixed DT steps for stability.
   */
  update(deltaTime: number): SimulationState {
    if (this.state.status !== 'running') return this.state;

    this.accumulator += deltaTime;
    while (this.accumulator >= DT) {
      this.step();
      this.accumulator -= DT;
      if (this.state.status !== 'running') break;
    }
    return this.state;
  }

  private step() {
    const s = this.state;
    const p = this.params;

    const h = s.altitude;
    const v = s.velocity; // negative = downward
    const speed = Math.abs(v);

    // Atmospheric properties at current altitude
    const rho = getDensity(h);
    const tempOut = getTemperatureCelsius(h);
    const g = getGravity(h);
    const soundSpeed = getSpeedOfSound(h);
    const pressure = getPressure(h);

    // Current drag parameters (depend on deployed systems)
    let Cd = p.dragCoeff;
    let A = p.crossSection;
    if (s.mainChuteDeployed) {
      Cd = p.mainChuteCd;
      A = p.mainChuteArea;
    } else if (s.drogueDeployed) {
      Cd = p.drogueCd;
      A = p.drogueArea;
    }

    // Forces (positive = upward)
    const F_gravity = -s.mass * g;
    const F_drag = v < 0
      ? 0.5 * rho * Cd * A * speed * speed   // upward when falling
      : -0.5 * rho * Cd * A * speed * speed;  // downward if somehow going up

    let F_thrust = 0;
    let fuelBurned = 0;
    if (s.engineRunning && s.fuel > 0) {
      F_thrust = p.engineThrust; // upward
      // Fuel mass flow: F = Isp * g0 * mdot => mdot = F / (Isp * g0)
      const mdot = p.engineThrust / (p.engineIsp * G0);
      fuelBurned = mdot * DT;
      if (fuelBurned > s.fuel) {
        fuelBurned = s.fuel;
        // Scale thrust for partial step
        F_thrust = (s.fuel / (mdot * DT)) * p.engineThrust;
      }
    }

    // Net acceleration
    const F_net = F_gravity + F_drag + F_thrust;
    const a = F_net / s.mass;

    // Integration (semi-implicit Euler)
    const newV = v + a * DT;
    const newH = h + newV * DT;

    // Update fuel and mass
    const newFuel = s.fuel - fuelBurned;
    const newMass = s.mass - fuelBurned;

    // G-force (1g = free fall cancellation)
    const gForce = Math.abs(a + g) / 9.80665;

    // Internal temperature model
    // The probe has its own thermal insulation (like real Venera landers).
    // Heat shield provides ADDITIONAL protection from aerodynamic heating
    // at hypersonic speeds, but the hull insulation is what keeps the
    // electronics cool during the slow descent through hot lower atmosphere.
    //
    // Base insulation: time constant ~1250s (~20 min) — enough to survive descent
    // Aerodynamic heating at high Mach without shield: much faster
    // With shield: near-perfect protection from aero heating
    const baseInsulationRate = 0.0008; // hull insulation alone
    let heatRate = baseInsulationRate;

    if (s.heatShieldActive) {
      // Shield blocks almost all heat (aero + atmospheric)
      heatRate = 0.0002;
    } else if (speed > 500) {
      // No shield at high speed = exposed to aerodynamic heating
      // This is dangerous and should be avoided
      heatRate = 0.02 + speed * 0.00002;
    }

    const newTempInside = s.tempInside + (tempOut - s.tempInside) * heatRate * DT;

    // Mach number
    const mach = Math.abs(newV) / soundSpeed;

    // Update phase
    let phase = s.phase;
    if (s.drogueDeployed || s.mainChuteDeployed) {
      phase = 'parachute_descent';
    } else if (s.engineRunning) {
      phase = 'powered_descent';
    } else if (mach < 3 && h < 80000) {
      phase = 'descent';
    } else {
      phase = 'atmospheric_entry';
    }

    // Apply state updates
    s.time += DT;
    s.altitude = Math.max(0, newH);
    s.velocity = newV;
    s.acceleration = a;
    s.gForce = gForce;
    s.mass = newMass;
    s.fuel = Math.max(0, newFuel);
    s.fuelFraction = s.fuel / p.fuelMass;
    s.tempOutside = tempOut;
    s.tempInside = newTempInside;
    s.atmosphereDensity = rho;
    s.pressure = pressure;
    s.machNumber = mach;
    s.phase = phase;
    s.dragForce = Math.abs(F_drag);
    s.thrustForce = F_thrust;
    s.gravityForce = Math.abs(F_gravity);

    // Auto-shutoff engine if fuel depleted
    if (s.fuel <= 0 && s.engineRunning) {
      s.engineRunning = false;
      this.addEvent('engine_off_no_fuel', 'Engine shut off — no fuel');
    }

    // Failure checks
    this.checkFailures();

    // Touchdown check
    if (s.altitude <= 0 && s.status === 'running') {
      s.altitude = 0;
      const touchdownSpeed = Math.abs(s.velocity);
      if (touchdownSpeed <= 5) {
        s.status = 'success';
        s.phase = 'landed';
        this.addEvent('landing_success', `Touchdown at ${touchdownSpeed.toFixed(1)} m/s`);
      } else {
        s.status = 'failure';
        s.failureCode = 'crash';
        s.failureReason = `Crash: touchdown speed ${touchdownSpeed.toFixed(1)} m/s (max 5 m/s)`;
        this.addEvent('crash', s.failureReason);
      }
    }
  }

  private checkFailures() {
    const s = this.state;

    // G-force limit — only applies AFTER heat shield jettison.
    // During atmospheric entry the heat shield provides structural protection
    // (real Venera probes sustained 300-450g during entry).
    if (!s.heatShieldActive && s.gForce > 15) {
      s.status = 'failure';
      s.failureCode = 'structural_failure';
      s.failureReason = `Structural failure: ${s.gForce.toFixed(1)}g exceeded 15g limit`;
      this.addEvent('structural_failure', s.failureReason);
      return;
    }

    // Overheat: if heat shield is jettisoned while it's still too hot
    if (!s.heatShieldActive && !s.heatShieldJettisoned) {
      // shouldn't happen, but guard anyway
    }
    if (s.heatShieldJettisoned && s.tempOutside > 480) {
      s.status = 'failure';
      s.failureCode = 'overheat';
      s.failureReason = `Overheat: heat shield jettisoned too early (${s.tempOutside.toFixed(0)}°C)`;
      this.addEvent('overheat', s.failureReason);
      return;
    }

    // Internal overheat (electronics fail above ~200°C)
    if (s.tempInside > 200) {
      s.status = 'failure';
      s.failureCode = 'electronics_failure';
      s.failureReason = `Electronics failure: internal temp ${s.tempInside.toFixed(0)}°C`;
      this.addEvent('electronics_failure', s.failureReason);
      return;
    }
  }

  // User actions
  jettisonHeatShield(): boolean {
    const s = this.state;
    if (!s.heatShieldActive || s.heatShieldJettisoned) return false;

    s.heatShieldActive = false;
    s.heatShieldJettisoned = true;
    s.mass -= this.params.heatShieldMass;
    this.addEvent('heatshield_jettison', 'Heat shield jettisoned');
    return true;
  }

  canJettisonHeatShield(): boolean {
    return this.state.heatShieldActive && !this.state.heatShieldJettisoned && this.state.status === 'running';
  }

  deployDrogue(): boolean {
    const s = this.state;
    if (s.drogueDeployed || !s.heatShieldJettisoned) return false;

    // Check if speed is too high (would rip the chute)
    if (Math.abs(s.velocity) > 300) {
      s.status = 'failure';
      s.failureCode = 'drogue_torn';
      s.failureReason = `Drogue chute torn: deployed at ${Math.abs(s.velocity).toFixed(0)} m/s (max 300 m/s)`;
      this.addEvent('drogue_torn', s.failureReason);
      return false;
    }

    s.drogueDeployed = true;
    this.addEvent('drogue_deploy', 'Drogue chute deployed');
    return true;
  }

  canDeployDrogue(): boolean {
    return !this.state.drogueDeployed && this.state.heatShieldJettisoned && this.state.status === 'running';
  }

  deployMainChute(): boolean {
    const s = this.state;
    if (s.mainChuteDeployed || !s.drogueDeployed) return false;

    if (Math.abs(s.velocity) > 100) {
      s.status = 'failure';
      s.failureCode = 'main_chute_torn';
      s.failureReason = `Main chute torn: deployed at ${Math.abs(s.velocity).toFixed(0)} m/s (max 100 m/s)`;
      this.addEvent('main_chute_torn', s.failureReason);
      return false;
    }

    s.mainChuteDeployed = true;
    this.addEvent('main_chute_deploy', 'Main chute deployed');
    return true;
  }

  canDeployMainChute(): boolean {
    return !this.state.mainChuteDeployed && this.state.drogueDeployed && this.state.status === 'running';
  }

  toggleEngine(): boolean {
    const s = this.state;
    if (s.status !== 'running') return false;

    if (s.engineRunning) {
      s.engineRunning = false;
      this.addEvent('engine_off', 'Engine shut off');
    } else {
      if (s.fuel <= 0) return false;
      s.engineRunning = true;
      this.addEvent('engine_on', 'Engine ignited');
    }
    return true;
  }

  canToggleEngine(): boolean {
    const s = this.state;
    if (s.status !== 'running') return false;
    if (s.engineRunning) return true; // can always turn off
    return s.fuel > 0;
  }

  getResult(): SimResult {
    return {
      outcome: this.state.status === 'success' ? 'success' : 'failure',
      touchdownSpeed: Math.abs(this.state.velocity),
      duration: this.state.time,
      fuelRemaining: this.state.fuel,
      failureReason: this.state.failureReason,
      failureCode: this.state.failureCode,
      events: [...this.events],
    };
  }

  private addEvent(type: string, detail: string) {
    this.events.push({
      time: this.state.time,
      type,
      altitude: this.state.altitude,
      speed: Math.abs(this.state.velocity),
      detail,
    });
  }
}
