import { PhysicsEngine } from '../engine/physics';
import { useI18n } from '../i18n/context';
import './Controls.css';

interface Props {
  engine: PhysicsEngine;
  onAction: () => void;
}

export default function Controls({ engine, onAction }: Props) {
  const { t } = useI18n();
  const state = engine.state;
  const isRunning = state.status === 'running';

  const handleAction = (action: () => boolean | void) => {
    action();
    onAction();
  };

  return (
    <div className="controls">
      <h3 className="controls-title">{t('controls.title')}</h3>

      <button
        className={`ctrl-btn heatshield ${!engine.canJettisonHeatShield() ? 'disabled' : ''}`}
        disabled={!engine.canJettisonHeatShield()}
        onClick={() => handleAction(() => engine.jettisonHeatShield())}
        title={
          state.heatShieldJettisoned
            ? t('controls.alreadyJettisoned')
            : state.machNumber > 3
              ? `${t('controls.recommendedBelowMach')} (${state.machNumber.toFixed(1)})`
              : t('controls.jettisonShield')
        }
      >
        <span className="btn-icon">🛡</span>
        {t('controls.jettisonHeatShield')}
        {state.heatShieldActive && state.machNumber > 3 && isRunning && (
          <span className="btn-hint warning">Mach {state.machNumber.toFixed(1)}</span>
        )}
        {state.heatShieldActive && state.machNumber <= 3 && isRunning && (
          <span className="btn-hint ok">{t('controls.ready')}</span>
        )}
      </button>

      <button
        className={`ctrl-btn drogue ${!engine.canDeployDrogue() ? 'disabled' : ''}`}
        disabled={!engine.canDeployDrogue()}
        onClick={() => handleAction(() => engine.deployDrogue())}
        title={
          !state.heatShieldJettisoned
            ? t('controls.jettisonFirst')
            : state.drogueDeployed
              ? t('controls.alreadyDeployed')
              : Math.abs(state.velocity) > 300
                ? `${t('controls.speedTooHigh')} (${Math.abs(state.velocity).toFixed(0)} m/s, max 300)`
                : t('controls.deployDrogue')
        }
      >
        <span className="btn-icon">🪂</span>
        {t('controls.drogueChute')}
        {!state.drogueDeployed && state.heatShieldJettisoned && isRunning && (
          <span className={`btn-hint ${Math.abs(state.velocity) > 300 ? 'warning' : 'ok'}`}>
            {Math.abs(state.velocity) > 300 ? `${Math.abs(state.velocity).toFixed(0)} m/s` : t('controls.ready')}
          </span>
        )}
      </button>

      <button
        className={`ctrl-btn mainchute ${!engine.canDeployMainChute() ? 'disabled' : ''}`}
        disabled={!engine.canDeployMainChute()}
        onClick={() => handleAction(() => engine.deployMainChute())}
        title={
          !state.drogueDeployed
            ? t('controls.deployDrogueFirst')
            : state.mainChuteDeployed
              ? t('controls.alreadyDeployed')
              : Math.abs(state.velocity) > 100
                ? `${t('controls.speedTooHigh')} (${Math.abs(state.velocity).toFixed(0)} m/s, max 100)`
                : t('controls.deployMainChute')
        }
      >
        <span className="btn-icon">🪂</span>
        {t('controls.mainChute')}
        {!state.mainChuteDeployed && state.drogueDeployed && isRunning && (
          <span className={`btn-hint ${Math.abs(state.velocity) > 100 ? 'warning' : 'ok'}`}>
            {Math.abs(state.velocity) > 100 ? `${Math.abs(state.velocity).toFixed(0)} m/s` : t('controls.ready')}
          </span>
        )}
      </button>

      <button
        className={`ctrl-btn engine ${state.engineRunning ? 'active' : ''} ${!engine.canToggleEngine() ? 'disabled' : ''}`}
        disabled={!engine.canToggleEngine()}
        onClick={() => handleAction(() => engine.toggleEngine())}
        title={
          state.fuel <= 0
            ? t('controls.noFuel')
            : state.engineRunning
              ? t('controls.shutDown')
              : t('controls.ignite')
        }
      >
        <span className="btn-icon">🔥</span>
        {state.engineRunning ? t('controls.engineOn') : t('controls.engineOff')}
        {isRunning && state.fuel > 0 && (
          <span className="btn-hint">{(state.fuelFraction * 100).toFixed(0)}% {t('controls.fuel')}</span>
        )}
      </button>
    </div>
  );
}
