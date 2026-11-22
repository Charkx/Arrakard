import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAdminSource } from '../../data/DataContext.tsx';
import type { AdminSource } from '../../data/admin-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { listedOr } from './listed.ts';
import type { AdminProfile } from './profiles.ts';
import { useAdminData } from './useAdminData.ts';
import { useCommand } from './useCommand.ts';

const readProfiles = (admin: AdminSource) => admin.profiles();

/** Les profils : fusionner un double, lier une carte à Discord (cas d'usage A5 et A6, ADR 0034). */
export function ProfilesPage() {
  const { t } = useI18n();
  const { state, reload } = useAdminData(readProfiles);

  if (state.status === 'refused') return <Navigate to="/login" replace />;

  return (
    <section className="admin-page">
      <Link className="admin-back" to="/admin">
        {t('admin.teams.back')}
      </Link>
      <h1 className="page-title">{t('admin.profiles.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('admin.profiles.error')}</p>}
      {state.status === 'ready' && (
        <>
          <MergePanel profiles={state.data} onChanged={reload} />
          <DiscordPanel profiles={state.data} onChanged={reload} />
        </>
      )}
    </section>
  );
}

/** Une liste déroulante de profils. */
function ProfileSelect({
  label,
  profiles,
  value,
  onChange,
}: {
  readonly label: string;
  readonly profiles: readonly AdminProfile[];
  readonly value: string;
  readonly onChange: (id: string) => void;
}) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname}
          </option>
        ))}
      </select>
    </label>
  );
}

function MergePanel({
  profiles,
  onChanged,
}: {
  readonly profiles: readonly AdminProfile[];
  readonly onChanged: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [chosenAbsorbed, setAbsorbed] = useState('');
  const [chosenKept, setKept] = useState('');
  const [confirming, setConfirming] = useState(false);
  const { busy, failure, send } = useCommand(onChanged);
  const ids = profiles.map((p) => p.id);
  const absorbedId = listedOr(chosenAbsorbed, ids);
  const keptId = listedOr(chosenKept, ids);
  const nickname = (id: string) => profiles.find((p) => p.id === id)?.nickname ?? '';

  const ask = (event: SyntheticEvent) => {
    event.preventDefault();
    setConfirming(true);
  };

  return (
    <section className="admin-panel" aria-label={t('admin.profiles.merge')}>
      <h2 className="admin-season-title">{t('admin.profiles.merge')}</h2>
      <div className="admin-panel-body">
        {confirming ? (
          <>
            <p>
              {t('admin.profiles.confirm', {
                absorbed: nickname(absorbedId),
                kept: nickname(keptId),
              })}
            </p>
            <div className="auth-actions">
              <button
                type="button"
                className="auth-button"
                disabled={busy}
                onClick={() => {
                  send(
                    () => admin.mergePlayers(absorbedId, keptId),
                    () => {
                      setConfirming(false);
                    },
                  );
                }}
              >
                {t('admin.profiles.confirmYes')}
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
          <form className="admin-form" onSubmit={ask}>
            <ProfileSelect
              label={t('admin.profiles.absorbed')}
              profiles={profiles}
              value={absorbedId}
              onChange={setAbsorbed}
            />
            <ProfileSelect
              label={t('admin.profiles.kept')}
              profiles={profiles}
              value={keptId}
              onChange={setKept}
            />
            <button type="submit" className="auth-button" disabled={absorbedId === keptId}>
              {t('admin.profiles.mergeButton')}
            </button>
          </form>
        )}
        {failure !== null && <p role="alert">{t('admin.failed', { message: failure })}</p>}
      </div>
    </section>
  );
}

function DiscordPanel({
  profiles,
  onChanged,
}: {
  readonly profiles: readonly AdminProfile[];
  readonly onChanged: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [chosen, setChosen] = useState('');
  const [discordUserId, setDiscordUserId] = useState('');
  const { busy, failure, send } = useCommand(onChanged);
  const playerId = listedOr(
    chosen,
    profiles.map((p) => p.id),
  );
  const linked = profiles.find((p) => p.id === playerId)?.discordUserId ?? null;

  const link = (event: SyntheticEvent) => {
    event.preventDefault();
    send(
      () => admin.linkDiscordAccount(playerId, discordUserId),
      () => {
        setDiscordUserId('');
      },
    );
  };

  return (
    <section className="admin-panel" aria-label={t('admin.profiles.discord')}>
      <h2 className="admin-season-title">{t('admin.profiles.discord')}</h2>
      <div className="admin-panel-body">
        <form className="admin-form" onSubmit={link}>
          <ProfileSelect
            label={t('admin.profiles.player')}
            profiles={profiles}
            value={playerId}
            onChange={setChosen}
          />
          <label>
            {t('admin.profiles.discordId')}
            <input
              value={discordUserId}
              required
              inputMode="numeric"
              pattern="\d{17,20}"
              onChange={(e) => {
                setDiscordUserId(e.target.value.trim());
              }}
            />
          </label>
          <button type="submit" className="auth-button" disabled={busy}>
            {t('admin.profiles.link')}
          </button>
        </form>
        <p>
          {linked === null
            ? t('admin.profiles.notLinked')
            : t('admin.profiles.linked', { id: linked })}
        </p>
        {linked !== null && (
          <button
            type="button"
            className="auth-button auth-button-secondary admin-archive"
            disabled={busy}
            onClick={() => {
              send(() => admin.linkDiscordAccount(playerId, null));
            }}
          >
            {t('admin.profiles.unlink')}
          </button>
        )}
        {failure !== null && <p role="alert">{t('admin.failed', { message: failure })}</p>}
      </div>
    </section>
  );
}
