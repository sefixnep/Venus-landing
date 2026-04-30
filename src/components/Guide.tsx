import type { SimulationState } from '../types/simulation';
import { useI18n } from '../i18n/context';
import './Guide.css';

interface Props {
  state: SimulationState;
}

interface Step {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  active: boolean;
  warn?: boolean;
}

export default function Guide({ state }: Props) {
  const { t } = useI18n();
  const alt = state.altitude / 1000;
  const speed = Math.abs(state.velocity);

  const steps: Step[] = [
    {
      id: 'entry',
      label: t('guide.entry.label'),
      detail: t('guide.entry.detail'),
      done: alt < 75 || state.heatShieldJettisoned,
      active: !state.heatShieldJettisoned && alt >= 60,
    },
    {
      id: 'jettison',
      label: t('guide.jettison.label'),
      detail: `${t('guide.jettison.detail')} ${t('guide.now')} ${speed.toFixed(0)} m/s, ${alt.toFixed(1)} km`,
      done: state.heatShieldJettisoned,
      active: !state.heatShieldJettisoned && speed < 600 && alt < 80,
      warn: !state.heatShieldJettisoned && speed < 600 && alt < 75,
    },
    {
      id: 'drogue',
      label: t('guide.drogue.label'),
      detail: `${t('guide.drogue.detail')} ${t('guide.now')} ${speed.toFixed(0)} m/s`,
      done: state.drogueDeployed,
      active: state.heatShieldJettisoned && !state.drogueDeployed && speed < 350,
      warn: state.heatShieldJettisoned && !state.drogueDeployed && speed < 300,
    },
    {
      id: 'main',
      label: t('guide.main.label'),
      detail: `${t('guide.main.detail')} ${t('guide.now')} ${speed.toFixed(0)} m/s`,
      done: state.mainChuteDeployed,
      active: state.drogueDeployed && !state.mainChuteDeployed && speed < 120,
      warn: state.drogueDeployed && !state.mainChuteDeployed && speed < 100,
    },
    {
      id: 'engine',
      label: t('guide.engine.label'),
      detail: `${t('guide.engine.detail')} ${t('guide.now')} ${alt.toFixed(1)} km`,
      done: state.altitude <= 0,
      active: state.mainChuteDeployed && alt < 6,
      warn: state.mainChuteDeployed && alt < 3,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => !s.done && s.active);
  const nextStepIndex = steps.findIndex((s) => !s.done);

  return (
    <div className="guide">
      <h3 className="guide-title">{t('guide.title')}</h3>
      <div className="guide-steps">
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIndex || (currentStepIndex === -1 && i === nextStepIndex);
          return (
            <div
              key={step.id}
              className={[
                'guide-step',
                step.done ? 'done' : '',
                isCurrent ? 'current' : '',
                step.warn && !step.done ? 'warn' : '',
              ].join(' ')}
            >
              <div className="step-icon">
                {step.done ? '✓' : isCurrent ? (step.warn ? '▶' : '○') : '·'}
              </div>
              <div className="step-body">
                <div className="step-label">{step.label}</div>
                {isCurrent && !step.done && (
                  <div className="step-detail">{step.detail}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
