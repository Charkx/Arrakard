import type { EditionType } from '@arrakis/domain';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { championIconUrl } from '../data/champions.ts';
import { useLoaded } from '../data/DataContext.tsx';
import {
  byMatchday,
  formatDuration,
  type EditionMatch,
  type EditionPageData,
  type MatchPlayer,
  type StandingRow,
} from '../data/edition.ts';
import type { DataSource } from '../data/leaderboard.ts';
import { useI18n } from '../i18n/i18n.tsx';

const loadEdition = (source: DataSource, editionId: string): Promise<EditionPageData | null> =>
  source.loadEdition(editionId);

const isLeague = (type: EditionType) => type === 'league_div1' || type === 'league_div2';
/** Un événement externe n'a pas de match enregistré, seulement des participants (glossaire). */
const isExternal = (type: EditionType) => type === 'external_event' || type === 'external_lan';

/** La page d'une édition (cas d'usage V4), au design de la v1. Adresse de la v1 : /event/:id. */
export function EditionPage() {
  const { t } = useI18n();
  const { id = '' } = useParams();
  const loaded = useLoaded(loadEdition, id);

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
        {t('edition.error')}
      </p>
    );
  }
  if (loaded.data === null) {
    return (
      <div className="empty-state">
        <h1 className="page-title">{t('edition.notFound')}</h1>
        <p>{t('edition.notFound.message')}</p>
        <Link to="/leaderboard" className="navbar-link">
          {t('edition.toLeaderboard')}
        </Link>
      </div>
    );
  }
  return <Edition data={loaded.data} />;
}

function Edition({ data }: { readonly data: EditionPageData }) {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const { edition, standings, matches, participants } = data;
  const date = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${edition.date}T00:00:00Z`));

  return (
    <div className="lb-page">
      <div className="pp-topbar">
        <button
          type="button"
          className="btn-back"
          onClick={() => {
            void navigate(-1);
          }}
        >
          {t('edition.back')}
        </button>
      </div>
      <header className="ev-hero card">
        <div className="ev-hero-glow" aria-hidden="true" />
        <div className="ev-hero-content">
          <div className="ev-hero-eyebrow">
            <span className="ev-hero-eyebrow-dash" />
            {t(`edition.type.${edition.type}`)}
            {edition.seasonName && (
              <span className="ev-hero-eyebrow-season">· {edition.seasonName}</span>
            )}
          </div>
          <h1 className="ev-title">{edition.name}</h1>
          <div className="ev-hero-badges">
            <span className="ev-hero-dates">{date}</span>
            {edition.location && (
              <span className="ev-badge ev-badge-place">{edition.location}</span>
            )}
          </div>
          {edition.eventMvp && (
            <div className="ev-champion-banner">
              <span className="ev-champion-name">
                {t('edition.eventMvp', { name: edition.eventMvp })}
              </span>
            </div>
          )}
          {edition.description && <p className="page-sub">{edition.description}</p>}
        </div>
      </header>

      {standings.length > 0 && (
        <Section title={t('edition.standings')}>
          <Standings rows={standings} />
        </Section>
      )}

      {isExternal(edition.type) ? (
        <Section title={t('edition.participants')}>
          {participants.length === 0 ? (
            <p className="empty-state">{t('edition.noParticipant')}</p>
          ) : (
            <ul className="filter-group ev-participants">
              {participants.map((p) => (
                <li key={p.playerId}>
                  <Link className="filter-btn" to={`/player/${p.playerId}`}>
                    {p.nickname}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : (
        <Section title={t('edition.matches')}>
          {matches.length === 0 ? (
            <p className="empty-state">{t('edition.noMatch')}</p>
          ) : isLeague(edition.type) ? (
            byMatchday(matches).map((day) => (
              <div key={day.matchday ?? 'sans-journee'} className="ev-matchday">
                {day.matchday !== null && (
                  <h3 className="lb-kicker">{t('edition.matchday', { n: day.matchday })}</h3>
                )}
                <Matches matches={day.matches} />
              </div>
            ))
          ) : (
            <Matches matches={matches} />
          )}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="ev-section card">
      <h2 className="ev-section-title">{title}</h2>
      <div className="ev-section-body">{children}</div>
    </section>
  );
}

function Standings({ rows }: { readonly rows: readonly StandingRow[] }) {
  const { t } = useI18n();
  return (
    <div className="ev-soiree-scroll">
      <table className="ev-ranking-table ev-soiree-table">
        <thead>
          <tr>
            <th scope="col">{t('edition.col.rank')}</th>
            <th scope="col">{t('edition.col.player')}</th>
            <th scope="col" className="ev-soiree-hide-sm">
              {t('edition.col.role')}
            </th>
            <th scope="col">{t('edition.col.record')}</th>
            <th scope="col">{t('edition.col.kda')}</th>
            <th scope="col" className="ev-soiree-hide-sm">
              {t('edition.col.resultPoints')}
            </th>
            <th scope="col" className="ev-soiree-hide-sm">
              {t('edition.col.statPoints')}
            </th>
            <th scope="col" className="ev-soiree-hide-sm">
              {t('edition.col.mvpPoints')}
            </th>
            <th scope="col">{t('edition.col.points')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.playerId}
              className={`${row.isEventMvp ? 'ev-row-highlight' : ''}${row.rank <= 3 ? ` ev-soiree-rank-${String(row.rank)}` : ''}`}
            >
              <td>
                <span
                  className={`ev-rank-num ${row.rank <= 3 ? `ev-rank-${String(row.rank)} medal` : 'ev-rank-n'}`}
                >
                  {row.rank}
                </span>
              </td>
              <td>
                <div className="ev-team-cell">
                  <img
                    src={championIconUrl(row.champion)}
                    alt=""
                    className="ev-soiree-champ"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                  <Link className="ev-team-link" to={`/player/${row.playerId}`}>
                    {row.nickname}
                  </Link>
                  <span className="ev-soiree-team">{row.team}</span>
                  {row.isEventMvp && (
                    <span className="ev-row-badge ev-badge-champion">🏆 {t('edition.mvp')}</span>
                  )}
                </div>
              </td>
              <td className="ev-soiree-hide-sm">
                <span className={`ev-role-pill ev-role-${row.role.toLowerCase()}`}>{row.role}</span>
              </td>
              <td>
                <span className="ev-wins">{row.wins}</span>
                <span style={{ color: 'var(--text-tertiary)' }}> - </span>
                <span className="ev-losses">{row.losses}</span>
              </td>
              <td className="ev-soiree-kda">
                {row.kills}/{row.deaths}/{row.assists}
              </td>
              <td className="ev-soiree-hide-sm ev-soiree-sub">{row.resultPoints}</td>
              <td className="ev-soiree-hide-sm ev-soiree-sub">{row.statPoints}</td>
              <td className="ev-soiree-hide-sm ev-soiree-sub">
                {row.mvpPoints > 0 ? `+${String(row.mvpPoints)}` : '—'}
              </td>
              <td className="ev-soiree-pts">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Matches({ matches }: { readonly matches: readonly EditionMatch[] }) {
  return (
    <div className="ev-matches">
      {matches.map((match) => (
        <MatchCard key={match.matchId} match={match} />
      ))}
    </div>
  );
}

/** Un match, replié comme en v1 : les deux équipes, puis au clic les cinq lignes de rôle. */
function MatchCard({ match }: { readonly match: EditionMatch }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const aWon = match.winnerTeam === match.teamA;

  return (
    <div className={`ev-match-card${open ? ' open' : ''}`}>
      <button
        type="button"
        className="ev-match-head"
        aria-expanded={open}
        aria-label={t('edition.showMatch', { n: match.matchNumber })}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        <span className="ev-match-no">
          {match.isFinal ? `${t('edition.final')} · ` : ''}
          {t('edition.match', { n: match.matchNumber })}
        </span>
        <span className="ev-match-teams">
          <span className={`ev-match-team${aWon ? ' win' : ''}`}>{match.teamA}</span>
          <span className="ev-match-vs">{t('edition.vs')}</span>
          <span className={`ev-match-team${aWon ? '' : ' win'}`}>{match.teamB}</span>
        </span>
        <span className="ev-match-meta">
          <span className="ev-match-winner">{t('edition.won', { team: match.winnerTeam })}</span>
          {match.mvp && <span className="ev-match-mvp">🏆 {match.mvp}</span>}
          <span className="ev-match-dur">{formatDuration(match.durationSeconds)}</span>
          <span className="ev-match-chev" aria-hidden="true">
            ▾
          </span>
        </span>
      </button>
      {open && (
        <div className="ev-match-board">
          {match.lines.map((line) => (
            <div key={line.role} className="ev-match-row">
              <Performance player={line.a} side="a" />
              <span className={`ev-role-pill ev-role-${line.role.toLowerCase()}`}>{line.role}</span>
              <Performance player={line.b} side="b" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Performance({
  player,
  side,
}: {
  readonly player: MatchPlayer | null;
  readonly side: 'a' | 'b';
}) {
  if (!player) return <div className={`ev-perf ev-perf-${side}`}>—</div>;
  return (
    <div className={`ev-perf ev-perf-${side}${player.result === 'win' ? ' win' : ''}`}>
      <img
        src={championIconUrl(player.champion)}
        alt={player.champion}
        className="ev-perf-champ"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.visibility = 'hidden';
        }}
      />
      <Link className="ev-perf-name" to={`/player/${player.playerId}`}>
        {player.nickname}
      </Link>
      <span className="ev-perf-kda">
        {player.kills}/{player.deaths}/{player.assists}
      </span>
    </div>
  );
}
