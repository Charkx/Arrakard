import { useEffect, useState, type SyntheticEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { Division } from '@arrakis/backend/domain';
import { useAdminSource, useAuthSource } from '../../data/DataContext.tsx';
import type { AdminSource } from '../../data/admin-source.ts';
import type { AuthSource } from '../../data/auth-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { isFreshAdmin } from './admin.ts';
import {
  ROSTER_STATUSES,
  rosterOf,
  type AdminTeam,
  type RosterMember,
  type RosterPlayer,
  type Rosters,
  type RosterStatus,
} from './teams.ts';
import { useCommand } from './useCommand.ts';

type State =
  | { readonly status: 'loading' }
  | { readonly status: 'refused' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly rosters: Rosters };

async function loadTeams(auth: AuthSource, admin: AdminSource): Promise<State> {
  if (!isFreshAdmin(await auth.currentUser())) return { status: 'refused' };
  return { status: 'ready', rosters: await admin.rosters() };
}

/** Les équipes et leurs rosters : créer, transférer, archiver (cas d'usage A4, ADR 0033). */
export function TeamsPage() {
  const { t } = useI18n();
  const auth = useAuthSource();
  const admin = useAdminSource();
  const [state, setState] = useState<State>({ status: 'loading' });
  // Une commande réussie recharge la page : le serveur dit ce qui a changé.
  const [version, setVersion] = useState(0);
  const reload = () => {
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    let current = true;
    loadTeams(auth, admin).then(
      (loaded) => {
        if (current) setState(loaded);
      },
      () => {
        if (current) setState({ status: 'error' });
      },
    );
    return () => {
      current = false;
    };
  }, [auth, admin, version]);

  if (state.status === 'refused') return <Navigate to="/login" replace />;

  return (
    <section className="admin-page">
      <Link className="admin-back" to="/admin">
        {t('admin.teams.back')}
      </Link>
      <h1 className="page-title">{t('admin.teams.title')}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('admin.teams.error')}</p>}
      {state.status === 'ready' && (
        <>
          <CreateTeamPanel onChanged={reload} />
          <TransferPanel rosters={state.rosters} onChanged={reload} />
          {state.rosters.teams.length === 0 ? (
            <p>{t('admin.teams.empty')}</p>
          ) : (
            <div className="admin-teams">
              {state.rosters.teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  players={rosterOf(team.id, state.rosters.players)}
                  onChanged={reload}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CreateTeamPanel({ onChanged }: { readonly onChanged: () => void }) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const { busy, failure, send } = useCommand(onChanged);

  const create = (event: SyntheticEvent) => {
    event.preventDefault();
    send(
      () => admin.createTeam(tag, name, divisions),
      () => {
        setTag('');
        setName('');
        setDivisions([]);
      },
    );
  };

  return (
    <section className="admin-panel" aria-label={t('admin.teams.create')}>
      <h2 className="admin-season-title">{t('admin.teams.create')}</h2>
      <div className="admin-panel-body">
        <form className="admin-form" onSubmit={create}>
          <label>
            {t('admin.teams.tag')}
            <input
              value={tag}
              required
              pattern="[A-Za-z]{2,4}"
              maxLength={4}
              onChange={(e) => {
                setTag(e.target.value.toUpperCase());
              }}
            />
          </label>
          <label>
            {t('admin.teams.name')}
            <input
              value={name}
              required
              maxLength={80}
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
          </label>
          <fieldset className="admin-checks">
            <legend>{t('admin.teams.divisions')}</legend>
            {(['div1', 'div2'] as const).map((division) => (
              <label key={division}>
                <input
                  type="checkbox"
                  checked={divisions.includes(division)}
                  onChange={(e) => {
                    setDivisions((current) =>
                      e.target.checked
                        ? [...current, division]
                        : current.filter((d) => d !== division),
                    );
                  }}
                />
                {t(`lb.division.${division}`)}
              </label>
            ))}
          </fieldset>
          <button type="submit" className="auth-button" disabled={busy}>
            {t('admin.teams.createButton')}
          </button>
        </form>
        {failure !== null && <p role="alert">{t('admin.failed', { message: failure })}</p>}
      </div>
    </section>
  );
}

/** Choisir « sans équipe » dans la liste des destinations. */
const NO_TEAM_CHOSEN = 'none';

function TransferPanel({
  rosters,
  onChanged,
}: {
  readonly rosters: Rosters;
  readonly onChanged: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [chosenPlayer, setPlayerId] = useState('');
  const [chosenTeam, setTeamId] = useState('');
  const [status, setStatus] = useState<RosterStatus>('starter');
  const { busy, failure, send } = useCommand(onChanged);
  const tags = new Map(rosters.teams.map((team) => [team.id, team.tag]));
  // Un choix qui n'est plus dans la liste (équipe archivée, profil fusionné)
  // retombe sur la première option : on n'envoie que ce qui est affiché.
  const playerId = rosters.players.some((p) => p.id === chosenPlayer)
    ? chosenPlayer
    : (rosters.players[0]?.id ?? '');
  const teamId =
    chosenTeam === NO_TEAM_CHOSEN || tags.has(chosenTeam)
      ? chosenTeam
      : (rosters.teams[0]?.id ?? NO_TEAM_CHOSEN);

  const transfer = (event: SyntheticEvent) => {
    event.preventDefault();
    send(() =>
      admin.transferPlayer(playerId, teamId === NO_TEAM_CHOSEN ? null : { teamId, status }),
    );
  };

  const label = (player: RosterPlayer) =>
    `${player.nickname} (${
      player.place === null
        ? t('admin.teams.noTeam')
        : `${tags.get(player.place.teamId) ?? ''} · ${t(`roster.${player.place.status}`)}`
    })`;

  return (
    <section className="admin-panel" aria-label={t('admin.teams.transfer')}>
      <h2 className="admin-season-title">{t('admin.teams.transfer')}</h2>
      <div className="admin-panel-body">
        <form className="admin-form" onSubmit={transfer}>
          <label>
            {t('admin.teams.player')}
            <select
              value={playerId}
              required
              onChange={(e) => {
                setPlayerId(e.target.value);
              }}
            >
              {rosters.players.map((player) => (
                <option key={player.id} value={player.id}>
                  {label(player)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('admin.teams.to')}
            <select
              value={teamId}
              onChange={(e) => {
                setTeamId(e.target.value);
              }}
            >
              {rosters.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {`${team.tag} · ${team.name}`}
                </option>
              ))}
              <option value={NO_TEAM_CHOSEN}>{t('admin.teams.noTeam')}</option>
            </select>
          </label>
          <label>
            {t('admin.teams.status')}
            <select
              value={status}
              disabled={teamId === NO_TEAM_CHOSEN}
              onChange={(e) => {
                setStatus(e.target.value as RosterStatus);
              }}
            >
              {ROSTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`roster.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="auth-button" disabled={busy || playerId === ''}>
            {t('admin.teams.transferButton')}
          </button>
        </form>
        {failure !== null && <p role="alert">{t('admin.failed', { message: failure })}</p>}
      </div>
    </section>
  );
}

function TeamCard({
  team,
  players,
  onChanged,
}: {
  readonly team: AdminTeam;
  readonly players: readonly RosterMember[];
  readonly onChanged: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [confirming, setConfirming] = useState(false);
  const { busy, failure, send } = useCommand(onChanged);
  const title = `${team.tag} · ${team.name}`;

  return (
    <section className="admin-panel" aria-label={title}>
      <h2 className="admin-season-title">
        {title}
        {team.divisions.map((d) => (
          <span key={d} className="admin-drafts">
            {t(`lb.division.${d}`)}
          </span>
        ))}
      </h2>
      <div className="admin-panel-body">
        {players.length === 0 ? (
          <p>{t('admin.teams.noPlayer')}</p>
        ) : (
          <ul className="admin-roster">
            {players.map((player) => (
              <li key={player.id}>
                <span>{player.nickname}</span>
                <span className="admin-roster-status">{t(`roster.${player.place.status}`)}</span>
              </li>
            ))}
          </ul>
        )}
        {confirming ? (
          <>
            <p>{t('admin.teams.confirm', { team: team.tag })}</p>
            <div className="auth-actions">
              <button
                type="button"
                className="auth-button"
                disabled={busy}
                onClick={() => {
                  send(
                    () => admin.archiveTeam(team.id),
                    () => {
                      setConfirming(false);
                    },
                  );
                }}
              >
                {t('admin.teams.confirmYes')}
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
          <button
            type="button"
            className="auth-button auth-button-secondary admin-archive"
            onClick={() => {
              setConfirming(true);
            }}
          >
            {t('admin.teams.archive')}
          </button>
        )}
        {failure !== null && <p role="alert">{t('admin.failed', { message: failure })}</p>}
      </div>
    </section>
  );
}
