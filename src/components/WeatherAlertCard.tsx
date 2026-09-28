import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Clock, Info } from 'lucide-react';
import { WeatherAlert } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface WeatherAlertCardProps {
  alerts: WeatherAlert[];
  source: string;
}

export const WeatherAlertCard: React.FC<WeatherAlertCardProps> = ({ alerts, source }) => {
  const { t } = useLanguage();
  const hasAlerts = alerts && alerts.length > 0;

  // When no alerts exist, render a clean, quiet mobile-friendly status pill
  if (!hasAlerts) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{t('noAlerts') || 'No Severe Weather Alerts'}</span>
        </div>
        <span className="text-[10px] text-emerald-500/80 font-mono">
          {source || 'Open-Meteo'}
        </span>
      </div>
    );
  }

  // When alerts exist, show a high-visibility mobile card
  return (
    <div className="rounded-3xl bg-slate-900/90 border border-amber-500/40 p-4 shadow-xl backdrop-blur-xl animate-in fade-in duration-200">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
          <span>⚠️ {t('activeAlerts') || 'Active Weather Alerts'}</span>
        </h2>
      </div>

      <div className="space-y-2.5">
        {alerts.map((alert) => {
          const isSevere = alert.severity === 'Severe';
          const isWarning = alert.severity === 'Warning';

          const cardBg = isSevere
            ? 'border-rose-500/50 bg-rose-950/30 text-rose-200'
            : isWarning
            ? 'border-amber-500/50 bg-amber-950/30 text-amber-200'
            : 'border-sky-500/50 bg-sky-950/30 text-sky-200';

          const badgeBg = isSevere
            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            : isWarning
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40';

          const severityLabel = isSevere
            ? t('severitySevereLabel')
            : isWarning
            ? t('severityWarningLabel')
            : t('severityAdvisoryLabel');

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-2xl border ${cardBg} transition-all`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      isSevere ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-sky-400'
                    }`}
                  />
                  <span className="font-bold text-sm text-white">{alert.type}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${badgeBg}`}>
                  {severityLabel}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-300 pl-6">
                {alert.description}
              </p>

              {/* Recommended action if severe */}
              {isSevere && (
                <div className="mt-2.5 ml-6 p-2 rounded-xl bg-rose-900/40 border border-rose-700/40 text-[11px] text-rose-200 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>{t('recommendedAction')}:</strong> {t('alertRecommendedActionDesc')}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-2.5 pl-6">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{alert.validity}</span>
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{alert.source || source}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
