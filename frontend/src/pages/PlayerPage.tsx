import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PlayerCard } from '../components/PlayerCard.tsx';
import { WhyThisRating } from '../components/WhyThisRating.tsx';
import { useLoaded } from '../data/DataContext.tsx';
import { initialsOf, type DataSource } from '../data/leaderboard.ts';
import {
  byEdition,
  type MergedPlayer,
  mostRecentFirst,
  type PlayedMatch,
  type PlayerPageData,
  type PlayerProfile,
  type SeasonRatingView,
} from '../data/player.ts';
import { useI18n } from '../i18n/i18n.tsx';

const loadPlayer = (
  source: DataSource,
  playerId: string,
): Promise<PlayerPageData | MergedPlayer | null> => source.loadPlayer(playerId);

/** Le profil d'un joueur (cas d'usage V2), au design de la v1. Adresse de la v1 : /player/:id. */
export function PlayerPage() {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const loaded = useLoaded(loadPlayer, id);

  if (loaded.status === 'loading') {
    return (
      <p className="empty-state" role="status">
        {t('common.loading')}
      </p>
    );
  }
  if (loaded.status === 'error') {
    return (
      <p className="empty-state" role="alert">
        {t('profile.error')}
      </p>
    );
  }
  if (loaded.data === null) {
    return (
      <div className="empty-state">
        <h1 className="page-title">{t('profile.notFound')}</h1>
        <p>{t('profile.notFound.message')}</p>
        <Link to="/leaderboard" className="navbar-link">
          {t('profile.back')}
        </Link>
      </div>
    );
  }
  if ('mergedInto' in loaded.data) {
    return <Navigate to={`/player/${loaded.data.mergedInto}`} replace />;
  }
  return <Profile profile={loaded.data.profile} matches={mostRecentFirst(loaded.data.matches)} />;
}

function Profile({
  profile,
  matches,
}: {
  readonly profile: PlayerProfile;
  readonly matches: readonly PlayedMatch[];
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { season } = profile;

  return (
    <div className="lb-page">
      <div className="player-header">
        <div className="pp-topbar">
          <button
            type="button"
            className="btn-back"
            onClick={() => {
              void navigate('/leaderboard');
            }}
          >
            {t('profile.back')}
          </button>
        </div>

        <div className="header-grid">
          {season && (
            <div className="header-card-col">
              <PlayerCard
                nickname={profile.nickname}
                initials={initialsOf(profile.nickname)}
                rating={season.rating}
                tier={season.tier}
                teamTag={profile.teamTag}
                role={season.role}
                impact={season.impact}
                consistency={season.consistency}
                clutch={season.clutch}
                games={season.games}
                editionsPlayed={season.editionsPlayed}
                champions={season.topChampions}
              />
            </div>
          )}

          <div className="header-info">
            <div className="player-title-zone">
              <h1 className="player-display-name">{profile.nickname}</h1>
              <div className="player-role-line">
                {[season?.role, profile.teamName ?? profile.teamTag, profile.seasonName]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              {season && <Badges season={season} />}
            </div>

            {season ? (
              <SeasonStats season={season} />
            ) : (
              <p className="empty-state">{t('profile.noGames')}</p>
            )}
          </div>
        </div>
      </div>

      {season && <WhyThisRating breakdown={season.breakdown} role={season.role} />}

      <section className="neo-panel match-section">
        <h2 className="panel-title">{t('profile.history')}</h2>
        <History matches={matches} />
      </section>
    </div>
  );
}

function Badges({ season }: { readonly season: SeasonRatingView }) {
  const { t } = useI18n();
  const delta = season.previousRating === null ? 0 : season.rating - season.previousRating;
  return (
    <>
      <div className="player-badges-row">
        <span className={`player-badge badge-tier-${season.tier}`}>
          {t('profile.tierBadge', { tier: t(`tier.${season.tier}`) })}
        </span>
      </div>
      {delta !== 0 && (
        <div className={`player-trend ${delta > 0 ? 'trend-pos' : 'trend-neg'}`}>
          {delta > 0 ? '↗' : '↘'}{' '}
          {t('profile.trend', { delta: `${delta > 0 ? '+' : ''}${String(delta)}` })}
        </div>
      )}
    </>
  );
}

function SeasonStats({ season }: { readonly season: SeasonRatingView }) {
  const { t } = useI18n();
  return (
    <>
      <div className="metrics-row">
        <Metric label={t('profile.m.games')} value={String(season.games)} />
        <Metric
          label={t('profile.m.winrate')}
          value={`${String(season.winrate)}%`}
          sub={t('profile.m.winLoss', { w: season.wins, l: season.losses })}
          color="teal"
        />
        <Metric label={t('profile.m.kda')} value={season.kda.toFixed(2)} color="violet" />
        <Metric
          label={t('profile.m.editions')}
          value={String(season.editionsPlayed)}
          color="gold"
        />
      </div>
      <div className="attrs-card">
        <Attribute label={t('profile.attr.impact')} value={season.impact} color="coral" />
        <Attribute label={t('profile.attr.consistency')} value={season.consistency} color="blue" />
        <Attribute label={t('profile.attr.clutch')} value={season.clutch} color="violet" />
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  sub,
  color,
}: {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly color?: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
      </div>
      <div className={`metric-value${color ? ` color-${color}` : ''}`}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function Attribute({
  label,
  value,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly color: string;
}) {
  return (
    <div className="attr-row">
      <span className="attr-label-cell">
        <span className="attr-label">{label}</span>
      </span>
      <div className="attr-bar-outer" aria-hidden="true">
        <div
          className={`attr-bar-fill attr-fill-${color}`}
          style={{ width: `${String(Math.min(100, value))}%` }}
        />
      </div>
      <span className={`attr-value color-${color}`}>{value}</span>
    </div>
  );
}

function History({ matches }: { readonly matches: readonly PlayedMatch[] }) {
  const { t, language } = useI18n();
  if (matches.length === 0) return <p className="empty-state">{t('profile.history.empty')}</p>;

  const wins = matches.filter((m) => m.result === 'win').length;
  const dateFormat = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <div className="profile-panel unified-history">
      <div className="history-header">
        <div className="history-summary">
          <span className="hs-stat">
            <span className="hs-lbl">
              {t('profile.history.summary', {
                w: wins,
                l: matches.length - wins,
                n: matches.length,
              })}
            </span>
          </span>
        </div>
      </div>
      <ol className="history-timeline" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {byEdition(matches).map((group) => {
          const first = group.matches[0];
          if (!first) return null;
          const groupWins = group.matches.filter((m) => m.result === 'win').length;
          const border =
            groupWins * 2 > group.matches.length
              ? 'var(--teal)'
              : groupWins * 2 < group.matches.length
                ? 'var(--coral)'
                : 'var(--border-med)';
          return (
            <li key={group.editionId} className="history-entry" style={{ borderLeftColor: border }}>
              <div className="history-entry-header">
                <Link className="history-entry-name" to={`/event/${group.editionId}`}>
                  {first.editionName}
                </Link>
                <span className="history-entry-date">
                  {dateFormat.format(new Date(`${first.editionDate}T00:00:00Z`))}
                </span>
                <span className="history-entry-pills" aria-hidden="true">
                  {group.matches.map((m) => (
                    <span
                      key={m.matchId}
                      className={`gpill gpill-${m.result === 'win' ? 'w' : 'l'}`}
                    >
                      {t(m.result === 'win' ? 'match.win.short' : 'match.loss.short')}
                    </span>
                  ))}
                </span>
              </div>
              <div className="history-scroll">
                <table className="history-games">
                  <tbody>
                    {group.matches.map((m) => (
                      <tr key={m.matchId} className="history-game">
                        <td>
                          {m.matchday === null
                            ? t('profile.match', { n: m.matchNumber })
                            : `${t('profile.matchday', { n: m.matchday })} · ${t('profile.match', { n: m.matchNumber })}`}
                        </td>
                        <td className="champ-with-name">{m.champion}</td>
                        <td className="role-chip">{m.role}</td>
                        <td className="num game-kda-raw">
                          {m.kills}/{m.deaths}/{m.assists}
                        </td>
                        <td>
                          <span
                            className={`result-pill result-${m.result === 'win' ? 'win' : 'lose'}`}
                          >
                            {t(m.result === 'win' ? 'match.win' : 'match.loss')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
