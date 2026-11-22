import { useState, type SyntheticEvent } from 'react';
import { useAdminSource } from '../../data/DataContext.tsx';
import type { ActiveSeason } from '../../data/admin-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { todayInParis } from '../../shared/today.ts';

/**
 * La saison active (ADR 0014) : la clôturer, après confirmation, ou ouvrir la
 * suivante. Le serveur décide ; la page dit ce qu'il a refusé.
 */
export function SeasonPanel({
  activeSeason,
  onChanged,
}: {
  readonly activeSeason: ActiveSeason | null;
  readonly onChanged: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [year, setYear] = useState(Number(todayInParis().slice(0, 4)));

  const send = (action: () => Promise<void>) => {
    setBusy(true);
    setFailure(null);
    action().then(
      () => {
        setBusy(false);
        setConfirming(false);
        setName('');
        onChanged();
      },
      (error: unknown) => {
        setBusy(false);
        setFailure(error instanceof Error ? error.message : String(error));
      },
    );
  };

  const open = (event: SyntheticEvent) => {
    event.preventDefault();
    send(() => admin.openSeason(name, year));
  };

  return (
    <section className="admin-panel" aria-label={t('admin.active.title')}>
      <h2 className="admin-season-title">{t('admin.active.title')}</h2>
      <div className="admin-panel-body">
        {activeSeason === null ? (
          <>
            <p>{t('admin.active.none')}</p>
            <form className="admin-form" onSubmit={open}>
              <label>
                {t('admin.active.name')}
                <input
                  value={name}
                  required
                  maxLength={80}
                  onChange={(e) => {
                    setName(e.target.value);
                  }}
                />
              </label>
              <label>
                {t('admin.active.year')}
                <input
                  type="number"
                  value={year}
                  min={2000}
                  max={2100}
                  required
                  onChange={(e) => {
                    setYear(Number(e.target.value));
                  }}
                />
              </label>
              <button type="submit" className="auth-button" disabled={busy}>
                {t('admin.active.open')}
              </button>
            </form>
          </>
        ) : confirming ? (
          <>
            <p>{t('admin.active.confirm', { season: activeSeason.name })}</p>
            <div className="auth-actions">
              <button
                type="button"
                className="auth-button"
                disabled={busy}
                onClick={() => {
                  send(() => admin.closeSeason(activeSeason.id));
                }}
              >
                {t('admin.active.confirmYes')}
              </button>
              <button
                type="button"
                className="auth-button auth-button-secondary"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                }}
              >
                {t('admin.active.cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>{t('admin.active.current', { season: activeSeason.name })}</p>
            <button
              type="button"
              className="auth-button auth-button-secondary"
              onClick={() => {
                setConfirming(true);
              }}
            >
              {t('admin.active.close')}
            </button>
          </>
        )}
        {failure !== null && <p role="alert">{t('admin.active.failed', { message: failure })}</p>}
      </div>
    </section>
  );
}
