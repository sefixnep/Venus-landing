import { useState } from 'react';
import type { SimResult, SimEvent, SessionMetrics } from '../types/simulation';
import { getSessions, clearSessions } from '../services/sessionStorage';
import { computeMetrics } from '../services/sessionMetrics';
import { useI18n } from '../i18n/context';
import type { TranslationKey } from '../i18n/translations';
import './ResultScreen.css';

interface Props {
  result: SimResult;
  onRestart: () => void;
}

/** Replace {v} placeholder with the given numeric value. */
function fillValue(template: string, value: number, decimals = 1): string {
  return template.replace('{v}', value.toFixed(decimals));
}

/** Map a failure code + relevant numeric value to a translated message. */
function translateFailure(
  code: string | null,
  result: SimResult,
  t: (key: TranslationKey) => string,
): string {
  if (!code) return result.failureReason ?? '';

  // Find the failure event to extract the numeric value
  const failureEvent = [...result.events].reverse().find(
    (e) => e.type === code,
  );
  const speed = failureEvent?.speed ?? result.touchdownSpeed;

  switch (code) {
    case 'crash':
      return fillValue(t('failure.crash'), result.touchdownSpeed);
    case 'structural_failure':
      // gForce not stored directly; approximate from event speed context
      return t('failure.structural_failure').replace('{v}', (speed > 0 ? speed.toFixed(1) : '?'));
    case 'overheat':
      return t('failure.overheat').replace('{v}', '480+');
    case 'electronics_failure':
      return t('failure.electronics_failure').replace('{v}', '200+');
    case 'drogue_torn':
      return fillValue(t('failure.drogue_torn'), speed, 0);
    case 'main_chute_torn':
      return fillValue(t('failure.main_chute_torn'), speed, 0);
    default:
      return result.failureReason ?? code;
  }
}

/** Map event type to a translated detail string. */
function translateEvent(ev: SimEvent, t: (key: TranslationKey) => string): string {
  const v = ev.speed;
  switch (ev.type) {
    case 'heatshield_jettison':   return t('event.heatshield_jettison');
    case 'drogue_deploy':         return t('event.drogue_deploy');
    case 'main_chute_deploy':     return t('event.main_chute_deploy');
    case 'engine_on':             return t('event.engine_on');
    case 'engine_off':            return t('event.engine_off');
    case 'engine_off_no_fuel':    return t('event.engine_off_no_fuel');
    case 'landing_success':       return fillValue(t('event.landing_success'), v);
    case 'crash':                 return fillValue(t('event.crash'), v);
    case 'structural_failure':    return fillValue(t('event.structural_failure'), v, 1);
    case 'overheat':              return fillValue(t('event.overheat'), ev.altitude / 1000, 1)
                                         .replace('{v}', '480+');
    case 'electronics_failure':   return t('event.electronics_failure').replace('{v}', '200+');
    case 'drogue_torn':           return fillValue(t('event.drogue_torn'), v, 0);
    case 'main_chute_torn':       return fillValue(t('event.main_chute_torn'), v, 0);
    default:                      return ev.detail || ev.type;
  }
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 120, h = 24;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function ImprovementBadge({ flag, t }: { flag: SessionMetrics['improvementFlag']; t: (k: TranslationKey) => string }) {
  const key = `metrics.${flag}` as TranslationKey;
  return <span className={`improvement-flag ${flag}`}>{t(key)}</span>;
}

function MetricsSection({ metrics, t, onClear }: {
  metrics: SessionMetrics;
  t: (k: TranslationKey) => string;
  onClear: () => void;
}) {
  if (metrics.totalAttempts <= 1) {
    return (
      <div className="result-metrics">
        <h3>{t('metrics.title')}</h3>
        <p className="metrics-hint">{t('metrics.notEnoughData')}</p>
      </div>
    );
  }

  return (
    <div className="result-metrics">
      <h3>{t('metrics.title')}</h3>

      <div className="metrics-grid">
        <div className="metric-row">
          <span className="metric-label">{t('metrics.attempt')}</span>
          <span className="metric-value">#{metrics.totalAttempts}</span>
        </div>
        <div className="metric-row">
          <span className="metric-label">{t('metrics.successRate')}</span>
          <span className="metric-value">
            {metrics.totalSuccesses}/{metrics.totalAttempts}{' '}
            ({(metrics.successRate * 100).toFixed(0)}%)
          </span>
        </div>
        {metrics.bestTouchdownSpeed !== null && (
          <div className="metric-row">
            <span className="metric-label">{t('metrics.bestTouchdown')}</span>
            <span className="metric-value success-value">
              {metrics.bestTouchdownSpeed.toFixed(1)} m/s
            </span>
          </div>
        )}
        <div className="metric-row">
          <span className="metric-label">{t('metrics.avgTouchdown')}</span>
          <span className="metric-value">{metrics.avgTouchdownSpeed.toFixed(1)} m/s</span>
        </div>
      </div>

      {metrics.touchdownSpeedTrend.length >= 2 && (
        <div className="metric-row sparkline-row">
          <span className="metric-label">{t('metrics.touchdownTrend')}</span>
          <Sparkline data={metrics.touchdownSpeedTrend} color="#e0c080" />
        </div>
      )}

      {metrics.fuelTrend.length >= 2 && (
        <div className="metric-row sparkline-row">
          <span className="metric-label">{t('metrics.fuelTrend')}</span>
          <Sparkline data={metrics.fuelTrend} color="#64c8ff" />
        </div>
      )}

      {metrics.currentStreakCount > 1 && metrics.currentStreakType && (
        <div className="metric-row">
          <span className="metric-label">{t('metrics.streak')}</span>
          <span className="metric-value">
            {metrics.currentStreakCount}{' '}
            {t(metrics.currentStreakType === 'success' ? 'metrics.successes' : 'metrics.failures')}
          </span>
        </div>
      )}

      <div className="metric-row">
        <ImprovementBadge flag={metrics.improvementFlag} t={t} />
      </div>

      <button className="clear-stats-btn" onClick={onClear}>
        {t('metrics.clearStats')}
      </button>
    </div>
  );
}

export default function ResultScreen({ result, onRestart }: Props) {
  const { t } = useI18n();
  const isSuccess = result.outcome === 'success';
  const [metrics, setMetrics] = useState(() => computeMetrics(getSessions()));

  const handleClearStats = () => {
    clearSessions();
    setMetrics(computeMetrics([]));
  };

  return (
    <div className={`result-overlay ${isSuccess ? 'success' : 'failure'}`}>
      <div className="result-card">
        <div className={`result-icon ${isSuccess ? 'success' : 'failure'}`}>
          {isSuccess ? '✓' : '✗'}
        </div>

        <h2 className="result-title">
          {isSuccess ? t('result.success') : t('result.failure')}
        </h2>

        {result.failureCode && (
          <p className="result-reason">
            {translateFailure(result.failureCode, result, t)}
          </p>
        )}

        <div className="result-stats">
          <div className="stat">
            <span className="stat-label">{t('result.touchdownSpeed')}</span>
            <span className="stat-value">{result.touchdownSpeed.toFixed(1)} m/s</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('result.duration')}</span>
            <span className="stat-value">{result.duration.toFixed(1)} s</span>
          </div>
          <div className="stat">
            <span className="stat-label">{t('result.fuelRemaining')}</span>
            <span className="stat-value">{result.fuelRemaining.toFixed(1)} kg</span>
          </div>
        </div>

        <MetricsSection metrics={metrics} t={t} onClear={handleClearStats} />

        {result.events.length > 0 && (
          <div className="result-events">
            <h3>{t('result.events')}</h3>
            {result.events.map((ev, i) => (
              <div key={i} className="event-row">
                <span className="event-time">T+{ev.time.toFixed(1)}s</span>
                <span className="event-detail">{translateEvent(ev, t)}</span>
                <span className="event-alt">{(ev.altitude / 1000).toFixed(1)} km</span>
              </div>
            ))}
          </div>
        )}

        <button className="restart-btn" onClick={onRestart}>
          {t('result.tryAgain')}
        </button>
      </div>
    </div>
  );
}
