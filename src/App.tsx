import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import type { SimulationParams, SimulationState, TelemetrySnapshot } from './types/simulation';
import { PhysicsEngine } from './engine/physics';
import { saveSession } from './services/sessionStorage';
import { useI18n } from './i18n/context';
import SimulationCanvas from './components/SimulationCanvas';
import Telemetry from './components/Telemetry';
import Controls from './components/Controls';
import Guide from './components/Guide';
import SettingsScreen from './components/SettingsScreen';
import ResultScreen from './components/ResultScreen';
import './App.css';

const Scene3D = lazy(() => import('./components/Scene3D'));

type AppScreen = 'settings' | 'simulation' | 'result';
export type RenderMode = '2d' | '3d';

const TIME_SCALES = [1, 5, 20, 50, 100, 500] as const;

/** Pick a sensible auto time-scale based on current simulation state. */
function autoTimeScale(s: SimulationState): number {
  const speed = Math.abs(s.velocity);
  const alt = s.altitude / 1000;

  // Engine running — player is actively controlling, stay real-time
  if (s.engineRunning) return 1;

  // Near the ground — real time so user can react
  if (alt < 3) return 1;
  if (alt < 10) return 5;

  // Fast entry phase — already exciting, moderate speed
  if (speed > 500) return 5;

  // Slow parachute descent — the boring part, warp hard
  if (speed < 20) return 500;
  if (speed < 50) return 100;
  if (speed < 100) return 50;

  return 20;
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('settings');
  const [simState, setSimState] = useState<SimulationState | null>(null);
  const [, forceUpdate] = useState(0);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [timeScale, setTimeScale] = useState(1);
  const [autoWarp, setAutoWarp] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>('3d');
  const resultShownRef = useRef(false);
  const historyRef = useRef<TelemetrySnapshot[]>([]);
  const lastHistoryTimeRef = useRef<number>(-Infinity);
  const paramsRef = useRef<SimulationParams | null>(null);
  const { t } = useI18n();

  const startSimulation = useCallback((params: SimulationParams) => {
    paramsRef.current = params;
    const engine = new PhysicsEngine(params);
    engineRef.current = engine;
    setSimState({ ...engine.state });
    setScreen('simulation');
    lastTimeRef.current = 0;
    resultShownRef.current = false;
    setAutoWarp(true); // default to auto-warp
  }, []);

  const handleRestart = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setScreen('settings');
    setSimState(null);
    engineRef.current = null;
    resultShownRef.current = false;
    historyRef.current = [];
    lastHistoryTimeRef.current = -Infinity;
  }, []);

  // Main simulation loop
  useEffect(() => {
    if (screen !== 'simulation' || !engineRef.current) return;

    const loop = (timestamp: number) => {
      if (!engineRef.current) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const engine = engineRef.current;

      // Determine effective time scale
      const effectiveScale = autoWarp
        ? autoTimeScale(engine.state)
        : timeScale;

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1) * effectiveScale;
      lastTimeRef.current = timestamp;

      if (engine.state.status === 'running') {
        engine.update(dt);
        const s = engine.state;
        setSimState({ ...s });

        // Sample telemetry history every ~1 simulated second
        if (s.time - lastHistoryTimeRef.current >= 1) {
          lastHistoryTimeRef.current = s.time;
          historyRef.current.push({
            time: s.time,
            altitude: s.altitude,
            speed: Math.abs(s.velocity),
            gForce: s.gForce,
            fuelFraction: s.fuelFraction,
            tempOutside: s.tempOutside,
            tempInside: s.tempInside,
            pressure: s.pressure,
            machNumber: s.machNumber,
          });
        }

        animFrameRef.current = requestAnimationFrame(loop);
      } else if (!resultShownRef.current) {
        setSimState({ ...engine.state });
        if (paramsRef.current) {
          saveSession(paramsRef.current, engine.getResult());
        }
        resultShownRef.current = true;
        setTimeout(() => setScreen('result'), 1500);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [screen, timeScale, autoWarp]);

  const handleAction = useCallback(() => {
    if (engineRef.current) {
      setSimState({ ...engineRef.current.state });
    }
    forceUpdate((n) => n + 1);
  }, []);

  if (screen === 'settings') {
    return (
      <SettingsScreen
        onStart={startSimulation}
        renderMode={renderMode}
        onRenderModeChange={setRenderMode}
      />
    );
  }

  if (screen === 'result' && engineRef.current) {
    return (
      <ResultScreen
        result={engineRef.current.getResult()}
        onRestart={handleRestart}
      />
    );
  }

  if (!simState || !engineRef.current) return null;

  const effectiveScale = autoWarp ? autoTimeScale(simState) : timeScale;

  return (
    <div className="simulation-layout">
      <div className="canvas-area">
        {renderMode === '3d' ? (
          <Suspense fallback={<div className="scene-loading">Loading scene…</div>}>
            <Scene3D state={simState} />
          </Suspense>
        ) : (
          <SimulationCanvas state={simState} width={800} height={600} />
        )}
        <div className="time-controls">
          <button
            className={`speed-btn ${autoWarp ? 'active' : ''}`}
            onClick={() => {
              setAutoWarp(true);
            }}
          >
            {t('time.auto')}
          </button>
          {TIME_SCALES.map((s) => (
            <button
              key={s}
              className={`speed-btn ${!autoWarp && timeScale === s ? 'active' : ''}`}
              onClick={() => {
                setAutoWarp(false);
                setTimeScale(s);
              }}
            >
              {s}x
            </button>
          ))}
          {autoWarp && (
            <span className="speed-indicator">{effectiveScale}x</span>
          )}
        </div>
        <div className="render-toggle">
          <button
            className={`render-btn ${renderMode === '3d' ? 'active' : ''}`}
            onClick={() => setRenderMode('3d')}
            title={t('render.cinematic')}
          >
            {t('render.toggle3d')}
          </button>
          <button
            className={`render-btn ${renderMode === '2d' ? 'active' : ''}`}
            onClick={() => setRenderMode('2d')}
            title={t('render.classic')}
          >
            {t('render.toggle2d')}
          </button>
        </div>
      </div>
      <div className="sidebar">
        <Telemetry state={simState} history={historyRef.current} />
        <Guide state={simState} />
        <Controls engine={engineRef.current} onAction={handleAction} />
        <button className="abort-btn" onClick={handleRestart}>
          {t('sim.abort')}
        </button>
      </div>
    </div>
  );
}
