// Venus atmospheric and physical constants
// Sources: NASA Planetary Fact Sheet, Venus Express data

export const VENUS = {
  gravity: 8.87,                    // m/s² surface gravity
  radius: 6051.8e3,                 // m
  surfacePressure: 92,              // atm (9.3 MPa)
  surfaceTemp: 737,                 // K (464 °C)
  surfaceDensity: 65,               // kg/m³
  cloudLayerBottom: 45000,          // m
  cloudLayerTop: 70000,             // m
  maxWindSpeed: 100,                // m/s in cloud layer
  molarMass: 0.04344,              // kg/mol (96.5% CO2 + 3.5% N2)
  gamma: 1.29,                     // ratio of specific heats for CO2
  R: 191.4,                        // J/(kg·K) specific gas constant for Venus atmosphere
} as const;

// Temperature profile of Venus atmosphere (altitude in m, temp in K)
// Based on Venus International Reference Atmosphere (VIRA)
const TEMP_PROFILE: [number, number][] = [
  [0, 737],
  [5000, 697],
  [10000, 655],
  [15000, 612],
  [20000, 570],
  [25000, 530],
  [30000, 485],
  [35000, 450],
  [40000, 410],
  [45000, 370],
  [50000, 330],
  [55000, 290],
  [60000, 250],
  [65000, 230],
  [70000, 210],
  [80000, 180],
  [90000, 170],
  [100000, 175],
  [110000, 195],
  [120000, 260],
  [130000, 300],
  [150000, 300],
];

/**
 * Get temperature at altitude using linear interpolation of VIRA data
 */
export function getTemperature(altitude: number): number {
  if (altitude <= 0) return TEMP_PROFILE[0][1];
  if (altitude >= TEMP_PROFILE[TEMP_PROFILE.length - 1][0]) {
    return TEMP_PROFILE[TEMP_PROFILE.length - 1][1];
  }

  for (let i = 0; i < TEMP_PROFILE.length - 1; i++) {
    const [h0, t0] = TEMP_PROFILE[i];
    const [h1, t1] = TEMP_PROFILE[i + 1];
    if (altitude >= h0 && altitude <= h1) {
      const frac = (altitude - h0) / (h1 - h0);
      return t0 + frac * (t1 - t0);
    }
  }
  return TEMP_PROFILE[TEMP_PROFILE.length - 1][1];
}

// Density profile based on VIRA / real Venus atmospheric data
// [altitude m, density kg/m³]
// Upper atmosphere (>70km) uses real measurements; below uses hydrostatic integration.
const DENSITY_PROFILE: [number, number][] = [
  [0,      65.0],
  [10000,  37.0],
  [20000,  21.0],
  [30000,  12.0],
  [40000,   6.4],
  [50000,   3.3],
  [60000,   1.1],
  [70000,   0.06],
  [80000,   0.015],
  [90000,   0.001],
  [100000,  6.0e-5],
  [110000,  8.0e-6],
  [120000,  1.5e-6],
  [130000,  3.0e-7],
  [150000,  1.0e-8],
];

// Pressure profile [altitude m, pressure atm]
const PRESSURE_PROFILE: [number, number][] = [
  [0,      92.0],
  [10000,  47.0],
  [20000,  24.0],
  [30000,  12.0],
  [40000,   5.0],
  [50000,   1.9],
  [60000,   0.53],
  [70000,   0.067],
  [80000,   0.0064],
  [90000,   0.00054],
  [100000,  4.2e-5],
  [120000,  2.5e-7],
  [130000,  3.5e-8],
  [150000,  1.0e-9],
];

function logInterp(profile: [number, number][], altitude: number): number {
  if (altitude <= 0) return profile[0][1];
  const last = profile[profile.length - 1];
  if (altitude >= last[0]) return last[1];

  for (let i = 0; i < profile.length - 1; i++) {
    const [h0, v0] = profile[i];
    const [h1, v1] = profile[i + 1];
    if (altitude >= h0 && altitude <= h1) {
      const frac = (altitude - h0) / (h1 - h0);
      // Log-linear interpolation (correct for exponential atmosphere)
      return v0 * Math.pow(v1 / v0, frac);
    }
  }
  return last[1];
}

/**
 * Get atmospheric density using real Venus atmospheric profile.
 * Values at high altitudes (>70km) based on measurements, not simple barometric formula.
 */
export function getDensity(altitude: number): number {
  return logInterp(DENSITY_PROFILE, altitude);
}

/**
 * Get atmospheric pressure in atm
 */
export function getPressure(altitude: number): number {
  return logInterp(PRESSURE_PROFILE, altitude);
}

/**
 * Speed of sound in Venus atmosphere at given altitude
 * c = sqrt(γ · R · T)
 */
export function getSpeedOfSound(altitude: number): number {
  const T = getTemperature(altitude);
  return Math.sqrt(VENUS.gamma * VENUS.R * T);
}

/**
 * Get gravity at altitude (varies slightly with distance from center)
 * g(h) = g₀ · (R / (R + h))²
 */
export function getGravity(altitude: number): number {
  const ratio = VENUS.radius / (VENUS.radius + altitude);
  return VENUS.gravity * ratio * ratio;
}

/**
 * Temperature in Celsius
 */
export function getTemperatureCelsius(altitude: number): number {
  return getTemperature(altitude) - 273.15;
}
