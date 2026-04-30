import { useState } from 'react';
import type { SimulationState, TelemetrySnapshot } from '../types/simulation';
import { useI18n } from '../i18n/context';
import './Telemetry.css';

interface Props {
  state: SimulationState;
  history: TelemetrySnapshot[];
}

type TelemetryMode = 'numbers' | 'chart';

function statusColor(value: number, warn: number, danger: number, invert = false): string {
  if (invert) {
    if (value <= danger) return 'var(--danger)';
    if (value <= warn) return 'var(--warning)';
    return 'var(--ok)';
  }
  if (value >= danger) return 'var(--danger)';
  if (value >= warn) return 'var(--warning)';
  return 'var(--ok)';
}

// ── Number gauge ──────────────────────────────────────────────
function Gauge({ label, value, unit, color }: {
  label: string;
  value: string;
  unit: string;
  color?: string;
}) {
  return (
    <div className="gauge">
      <div className="gauge-label">{label}</div>
      <div className="gauge-value" style={{ color: color || 'var(--ok)' }}>
        {value}
        <span className="gauge-unit">{unit}</span>
      </div>
    </div>
  );
}

// ── Mini inline chart ─────────────────────────────────────────
const VB_W = 200;
const VB_H = 44;
const PAD  = 2;

function MiniChart({ label, unit, color, history, getValue, displayValue }: {
  label: string;
  unit: string;
  color: string;
  history: TelemetrySnapshot[];
  getValue: (s: TelemetrySnapshot) => number;
  displayValue: string;
}) {
  const hasData = history.length >= 2;

  let polyPoints = '';
  let lastX = VB_W - PAD;
  let lastY = VB_H / 2;

  if (hasData) {
    const values   = history.map(getValue);
    const times    = history.map(s => s.time);
    const minVal   = Math.min(...values);
    const maxVal   = Math.max(...values);
    const valRange = maxVal === minVal ? 1 : maxVal - minVal;
    const timeRange = (times[times.length - 1] - times[0]) || 1;

    const toX = (t: number) =>
      PAD + ((t - times[0]) / timeRange) * (VB_W - PAD * 2);
    const toY = (v: number) =>
      PAD + (VB_H - PAD * 2) - ((v - minVal) / valRange) * (VB_H - PAD * 2);

    polyPoints = history.map(s => `${toX(s.time)},${toY(getValue(s))}`).join(' ');
    lastX = toX(times[times.length - 1]);
    lastY = toY(values[values.length - 1]);
  }

  return (
    <div className="gauge mini-chart-gauge">
      <div className="mini-chart-header">
        <span className="gauge-label">{label}</span>
        <span className="mini-chart-cur" style={{ color }}>
          {displayValue}<span className="gauge-unit">{unit}</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="mini-chart-svg"
      >
        {hasData ? (
          <>
            <polyline
              points={polyPoints}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={lastX} cy={lastY} r="3" fill={color} vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <line
            x1={PAD} y1={VB_H / 2}
            x2={VB_W - PAD} y2={VB_H / 2}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

// ── Status indicators ─────────────────────────────────────────
function StatusIndicator({ label, active, state }: {
  label: string;
  active: boolean;
  state: string;
}) {
  return (
    <div className={`status-indicator ${active ? 'active' : 'inactive'}`}>
      <div className={`status-dot ${active ? 'on' : 'off'}`} />
      <div className="status-label">{label}</div>
      <div className="status-state">{state}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function Telemetry({ state, history }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<TelemetryMode>('numbers');
  const speed = Math.abs(state.velocity);

  // Metric descriptors
  const metrics = [
    {
      label: t('telemetry.altitude'),
      unit:  'km',
      displayValue: (state.altitude / 1000).toFixed(2),
      color: statusColor(state.altitude / 1000, 5, 1, true),
      getValue: (s: TelemetrySnapshot) => s.altitude / 1000,
    },
    {
      label: t('telemetry.speed'),
      unit:  'm/s',
      displayValue: speed.toFixed(1),
      color: statusColor(speed, 100, 300),
      getValue: (s: TelemetrySnapshot) => s.speed,
    },
    {
      label: t('telemetry.gforce'),
      unit:  'g',
      displayValue: state.gForce.toFixed(1),
      color: statusColor(state.gForce, 8, 13),
      getValue: (s: TelemetrySnapshot) => s.gForce,
    },
    {
      label: t('telemetry.fuel'),
      unit:  '%',
      displayValue: (state.fuelFraction * 100).toFixed(0),
      color: statusColor(state.fuelFraction * 100, 30, 10, true),
      getValue: (s: TelemetrySnapshot) => s.fuelFraction * 100,
    },
    {
      label: t('telemetry.tempOutside'),
      unit:  '°C',
      displayValue: state.tempOutside.toFixed(0),
      color: statusColor(state.tempOutside, 300, 450),
      getValue: (s: TelemetrySnapshot) => s.tempOutside,
    },
    {
      label: t('telemetry.tempInside'),
      unit:  '°C',
      displayValue: state.tempInside.toFixed(0),
      color: statusColor(state.tempInside, 100, 170),
      getValue: (s: TelemetrySnapshot) => s.tempInside,
    },
    {
      label: t('telemetry.pressure'),
      unit:  'atm',
      displayValue: state.pressure.toFixed(1),
      color: 'var(--ok)',
      getValue: (s: TelemetrySnapshot) => s.pressure,
    },
    {
      label: t('telemetry.mach'),
      unit:  '',
      displayValue: state.machNumber.toFixed(1),
      color: statusColor(state.machNumber, 3, 8),
      getValue: (s: TelemetrySnapshot) => s.machNumber,
    },
  ] as const;

  return (
    <div className="telemetry">
      {/* Header + mode toggle */}
      <div className="telemetry-header-row">
        <h3 className="telemetry-title">{t('telemetry.title')}</h3>
        <div className="mode-switcher">
          <button
            className={`mode-btn ${mode === 'numbers' ? 'active' : ''}`}
            onClick={() => setMode('numbers')}
          >
            {t('telemetry.modeNumbers')}
          </button>
          <button
            className={`mode-btn ${mode === 'chart' ? 'active' : ''}`}
            onClick={() => setMode('chart')}
          >
            {t('telemetry.modeChart')}
          </button>
        </div>
      </div>

      <div className={`gauges-grid ${mode === 'chart' ? 'chart-mode' : ''}`}>
        {metrics.map((m) =>
          mode === 'numbers' ? (
            <Gauge
              key={m.label}
              label={m.label}
              value={m.displayValue}
              unit={m.unit}
              color={m.color}
            />
          ) : (
            <MiniChart
              key={m.label}
              label={m.label}
              unit={m.unit}
              color={m.color}
              history={history as TelemetrySnapshot[]}
              getValue={m.getValue}
              displayValue={m.displayValue}
            />
          )
        )}
      </div>

      <h3 className="telemetry-title">{t('telemetry.systems')}</h3>

      <div className="systems">
        <StatusIndicator
          label={t('telemetry.heatShield')}
          active={state.heatShieldActive}
          state={state.heatShieldActive ? t('telemetry.active') : t('telemetry.jettisoned')}
        />
        <StatusIndicator
          label={t('telemetry.drogueChute')}
          active={state.drogueDeployed}
          state={state.drogueDeployed ? t('telemetry.deployed') : t('telemetry.stowed')}
        />
        <StatusIndicator
          label={t('telemetry.mainChute')}
          active={state.mainChuteDeployed}
          state={state.mainChuteDeployed ? t('telemetry.deployed') : t('telemetry.stowed')}
        />
        <StatusIndicator
          label={t('telemetry.engine')}
          active={state.engineRunning}
          state={state.engineRunning ? t('telemetry.firing') : t('telemetry.off')}
        />
      </div>

      <div className="time-display">
        T+ {state.time.toFixed(1)}s
      </div>
    </div>
  );
}
