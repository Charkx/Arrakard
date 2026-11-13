import { rankLeaderboard, type Division, type LeaderboardSort, type Role } from '@arrakis/domain';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { DeltaBadge } from '../components/DeltaBadge.tsx';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { TierPill } from '../components/TierPill.tsx';
import { useLoaded } from '../data/DataContext.tsx';
import {
  initialsOf,
  ratingDelta,
  type DataSource,
  type LeaderboardData,
  type LeaderboardEntry,
} from '../data/leaderboard.ts';
import type { TextKey } from '../i18n/dictionary.ts';
import { useI18n } from '../i18n/i18n.tsx';

const ROLES: readonly Role[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
const DIVISIONS: readonly { readonly value: Division; readonly label: TextKey }[] = [
  { value: 'div1', label: 'lb.division.div1' },
  { value: 'div2', label: 'lb.division.div2' },
];
const SORTABLE: readonly { readonly sort: LeaderboardSort; readonly label: TextKey }[] = [
  { sort: 'rating', label: 'lb.col.rating' },
  { sort: 'winrate', label: 'lb.col.winrate' },
  { sort: 'kda', label: 'lb.col.kda' },
  { sort: 'games', label: 'lb.col.games' },
];

const loadLeaderboard = (source: DataSource): Promise<LeaderboardData> => source.loadLeaderboard();

/** Les filtres et le tri, lus dans l'adresse de la page : un lien partagé garde la vue. */
function useLeaderboardOptions() {
  const [params, setParams] = useSearchParams();
  const role = ROLES.find((r) => r === params.get('role'));
  const division = DIVISIONS.find((d) => d.value === params.get('div'))?.value;
  const sort = SORTABLE.find((s) => s.sort === params.get('sort'))?.sort ?? 'rating';

  const set = (name: 'role' | 'div' | 'sort', value: string | undefined) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === undefined) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true },
    );
  };

  return { role, division, sort, set };
}

/** Classement de la saison en cours (cas d'usage V1), au design de la v1. */
export function LeaderboardPage() {
  const { t } = useI18n();
  const loaded = useLoaded(loadLeaderboard, null);

  return (
    <div className="lb-page">
      <header className="lb-head">
        <div>
          <h1 className="page-title">{t('lb.title')}</h1>
          {loaded.status === 'ready' && (
            <p className="page-sub">
              {loaded.data.seasonName === null
                ? t('lb.season.none')
                : t('lb.season.active', { season: loaded.data.seasonName })}
            </p>
          )}
        </div>
      </header>

      {loaded.status === 'loading' && (
        <p className="empty-state" role="status">
          {t('common.loading')}
        </p>
      )}
      {loaded.status === 'error' && (
        <p className="empty-state" role="alert">
          {t('lb.error')}
        </p>
      )}
      {loaded.status === 'ready' && <Leaderboard entries={loaded.data.entries} />}
    </div>
  );
}

function Leaderboard({ entries }: { readonly entries: readonly LeaderboardEntry[] }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { role, division, sort, set } = useLeaderboardOptions();

  const byId = new Map(entries.map((e) => [e.playerId, e]));
  const rows = rankLeaderboard(entries, {
    sort,
    ...(role !== undefined && { role }),
    ...(division !== undefined && { division }),
  }).flatMap((row) => {
    const entry = byId.get(row.playerId);
    return entry ? [{ ...row, entry }] : [];
  });

  // Les indicateurs et le podium portent sur toute la saison, sans filtre.
  const ranked = rankLeaderboard(entries).flatMap((row) => byId.get(row.playerId) ?? []);
  const filtered = role !== undefined || division !== undefined;
  const open = (entry: LeaderboardEntry) => {
    void navigate(`/player/${entry.playerId}`);
  };

  return (
    <>
      <Indicators ranked={ranked} />
      {ranked.length >= 3 && <Podium top3={ranked.slice(0, 3)} onOpen={open} />}

      <section className="neo-panel lb-table-panel">
        <div className="lb-filter-bar" role="group" aria-label={t('lb.filters')}>
          <div className="lb-filter-seg">
            <span className="lb-filter-seg-label">{t('lb.division')}</span>
            <div className="filter-group">
              <FilterButton
                pressed={division === undefined}
                onClick={() => {
                  set('div', undefined);
                }}
              >
                {t('common.all')}
              </FilterButton>
              {DIVISIONS.map((d) => (
                <FilterButton
                  key={d.value}
                  pressed={division === d.value}
                  onClick={() => {
                    set('div', d.value);
                  }}
                >
                  {t(d.label)}
                </FilterButton>
              ))}
            </div>
          </div>
          <div className="lb-filter-divider" aria-hidden="true" />
          <div className="lb-filter-seg">
            <span className="lb-filter-seg-label">{t('lb.role')}</span>
            <div className="filter-group">
              <FilterButton
                pressed={role === undefined}
                onClick={() => {
                  set('role', undefined);
                }}
              >
                {t('common.all')}
              </FilterButton>
              {ROLES.map((r) => (
                <FilterButton
                  key={r}
                  className={`role-${r}`}
                  pressed={role === r}
                  onClick={() => {
                    set('role', r);
                  }}
                >
                  {r}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">
            <strong>{t('lb.empty')}</strong>
            {t(filtered ? 'lb.empty.filtered' : 'lb.empty.noFilter')}
          </div>
        ) : (
          <div className="lb-table-scroll">
            <table className="lb-table">
              <thead>
                <tr>
                  <th scope="col" className="th-left">
                    {t('lb.col.rank')}
                  </th>
                  <th scope="col" className="th-left">
                    {t('lb.col.player')}
                  </th>
                  {SORTABLE.map((column) => (
                    <th
                      key={column.sort}
                      scope="col"
                      aria-sort={sort === column.sort ? 'descending' : 'none'}
                    >
                      <button
                        type="button"
                        title={t('lb.sortBy', { column: t(column.label) })}
                        onClick={() => {
                          set('sort', column.sort === 'rating' ? undefined : column.sort);
                        }}
                      >
                        {t(column.label)}
                        {sort === column.sort ? ' ▾' : ''}
                      </button>
                    </th>
                  ))}
                  <th scope="col">{t('lb.col.tier')}</th>
                  <th scope="col">{t('lb.col.form')}</th>
                  <th scope="col">{t('lb.col.evolution')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, rank, previousRank }) => (
                  <Row
                    key={entry.playerId}
                    entry={entry}
                    rank={rank}
                    previousRank={previousRank}
                    onOpen={open}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function FilterButton({
  pressed,
  onClick,
  className = '',
  children,
}: {
  readonly pressed: boolean;
  readonly onClick: () => void;
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`filter-btn ${className}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Indicators({ ranked }: { readonly ranked: readonly LeaderboardEntry[] }) {
  const { t } = useI18n();
  const climber = [...ranked]
    .map((e) => ({ e, gain: ratingDelta(e) }))
    .sort((a, b) => b.gain - a.gain)[0];
  const averageGames =
    ranked.length === 0
      ? 0
      : Math.round(ranked.reduce((sum, e) => sum + e.games, 0) / ranked.length);

  return (
    <div className="lb-kpis">
      <div className="lb-kpi lb-kpi--violet">
        <span className="lb-kpi-label">{t('lb.kpi.ranked')}</span>
        <div className="lb-kpi-value">{ranked.length}</div>
      </div>
      <div className="lb-kpi lb-kpi--teal">
        <span className="lb-kpi-label">{t('lb.kpi.progress')}</span>
        <div className="lb-kpi-value is-text">
          {climber && climber.gain > 0 ? `${climber.e.nickname} +${String(climber.gain)}` : '—'}
        </div>
      </div>
      <div className="lb-kpi lb-kpi--coral">
        <span className="lb-kpi-label">{t('lb.kpi.avgGames')}</span>
        <div className="lb-kpi-value">{averageGames}</div>
      </div>
    </div>
  );
}

function Podium({
  top3,
  onOpen,
}: {
  readonly top3: readonly LeaderboardEntry[];
  readonly onOpen: (entry: LeaderboardEntry) => void;
}) {
  const { t } = useI18n();
  // Ordre visuel de la v1 : le 2e, le 1er au centre, puis le 3e.
  const slots = [
    { entry: top3[1], place: 2, scale: 0.8 },
    { entry: top3[0], place: 1, scale: 0.86 },
    { entry: top3[2], place: 3, scale: 0.8 },
  ];

  return (
    <section className="neo-raised lb-podium-panel">
      <h2 className="lb-kicker">{t('lb.podium')}</h2>
      <div className="lb-podium-scroll">
        <div className="lb-podium">
          {slots.map(({ entry, place, scale }) =>
            entry ? (
              <button
                key={entry.playerId}
                type="button"
                className={`lb-podium-slot r${String(place)}`}
                aria-label={t('lb.openProfile', { name: entry.nickname })}
                onClick={() => {
                  onOpen(entry);
                }}
              >
                <span className="lb-podium-rank">
                  {place === 1 ? '👑 ' : ''}0{place}
                </span>
                <PlayerCard
                  nickname={entry.nickname}
                  initials={initialsOf(entry.nickname)}
                  rating={entry.rating}
                  tier={entry.tier}
                  teamTag={entry.teamTag}
                  role={entry.role}
                  impact={entry.impact}
                  consistency={entry.consistency}
                  clutch={entry.clutch}
                  games={entry.games}
                  editionsPlayed={entry.editionsPlayed}
                  scale={scale}
                />
                <DeltaBadge delta={ratingDelta(entry)} />
              </button>
            ) : null,
          )}
        </div>
      </div>
    </section>
  );
}

function Row({
  entry,
  rank,
  previousRank,
  onOpen,
}: {
  readonly entry: LeaderboardEntry;
  readonly rank: number;
  readonly previousRank: number | null;
  readonly onOpen: (entry: LeaderboardEntry) => void;
}) {
  const { t } = useI18n();
  // Seuils de couleur du taux de victoires, repris de la v1.
  const level = entry.winrate >= 60 ? 'high' : entry.winrate <= 40 ? 'low' : '';
  const move = previousRank === null ? 0 : previousRank - rank;

  return (
    // Toute la ligne s'ouvre à la souris, comme en v1 ; au clavier et pour un
    // lecteur d'écran, c'est le nom du joueur qui est le lien.
    <tr
      className={`lb-row${rank <= 3 ? ` lb-row-${String(rank)}` : ''}`}
      onClick={() => {
        onOpen(entry);
      }}
    >
      <td className="td-left">
        <span className={`lb-rank${rank <= 3 ? ` medal medal-${String(rank)}` : ''}`}>{rank}</span>
      </td>
      <td className="td-left">
        <div className="lb-player">
          <div className={`lb-avatar ${entry.tier}`} aria-hidden="true">
            {initialsOf(entry.nickname)}
          </div>
          <div style={{ minWidth: 0 }}>
            <Link
              className="lb-name"
              to={`/player/${entry.playerId}`}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              {entry.nickname}
            </Link>
            <div className="lb-sub">
              {entry.teamTag ? `${entry.teamTag} · ${entry.role}` : entry.role}
            </div>
          </div>
        </div>
      </td>
      <td>
        <span className="lb-rating">
          <span className={`lb-rating-value ${entry.tier}`}>{entry.rating}</span>
          <DeltaBadge delta={ratingDelta(entry)} />
        </span>
      </td>
      <td>
        <span className="lb-wr">
          <span className={`lb-wr-value ${level}`}>{entry.winrate}%</span>
          <span className="lb-wr-bar" aria-hidden="true">
            <span
              className={`lb-wr-fill ${level}`}
              style={{ display: 'block', width: `${String(Math.min(entry.winrate, 100))}%` }}
            />
          </span>
        </span>
      </td>
      <td>{entry.kda.toFixed(2)}</td>
      <td>{entry.games}</td>
      <td>
        <TierPill tier={entry.tier} />
      </td>
      <td>
        <span className={`lb-form ${entry.recentForm}`} title={t(`lb.form.${entry.recentForm}`)}>
          {entry.recentForm === 'up' ? '↑' : entry.recentForm === 'down' ? '↓' : '→'}
        </span>
      </td>
      <td>
        {move > 0 && (
          <span className="lb-evo up" title={t('lb.evolution.up', { n: move })}>
            ↑{move}
          </span>
        )}
        {move < 0 && (
          <span className="lb-evo down" title={t('lb.evolution.down', { n: -move })}>
            ↓{-move}
          </span>
        )}
        {move === 0 && <span className="lb-evo none">—</span>}
      </td>
    </tr>
  );
}
