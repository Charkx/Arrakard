import { useCallback, useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  isExternal,
  matchEntryProblems,
  type EntrySide,
  type MatchEntry,
  type MatchEntryProblem,
  type Side,
} from '@arrakis/backend/domain';
import { useAdminSource } from '../../data/DataContext.tsx';
import type { AdminSource } from '../../data/admin-source.ts';
import { useI18n, type Translate } from '../../shared/i18n/i18n.tsx';
import type { EditionForm } from './edition-form.ts';
import { blankMatch, parseClock } from './match-entry.ts';
import { useAdminData } from './useAdminData.ts';
import { useCommand } from './useCommand.ts';

const SIDES: readonly Side[] = ['A', 'B'];
const STATS = ['kills', 'deaths', 'assists', 'gold'] as const;

/**
 * Saisir un match à la main, en brouillon (cas d'usage A14, ADR 0037) : les
 * deux côtés face à face, une ligne par rôle (maquette validée le 2026-11-23).
 */
export function MatchEntryPage() {
  const { t } = useI18n();
  const { editionId = '' } = useParams();
  const load = useCallback((admin: AdminSource) => admin.editionForm(editionId), [editionId]);
  const { state, reload } = useAdminData(load);

  if (state.status === 'refused') return <Navigate to="/login" replace />;
  const edition = state.status === 'ready' ? state.data.edition : null;

  return (
    <section className="admin-page">
      <Link className="admin-back" to={`/admin/editions/${editionId}`}>
        {t('admin.match.back')}
      </Link>
      <h1 className="page-title">{t('admin.match.title', { edition: edition?.name ?? '' })}</h1>
      {state.status === 'loading' && <p role="status">{t('common.loading')}</p>}
      {state.status === 'error' && <p role="alert">{t('admin.edition.error')}</p>}
      {state.status === 'ready' &&
        (edition === null ? (
          <p role="alert">{t('admin.edition.notFound')}</p>
        ) : isExternal(edition.type) ? (
          <p role="alert">{t('admin.match.external')}</p>
        ) : (
          <MatchSheet
            key={edition.version}
            editionId={editionId}
            version={edition.version}
            form={state.data}
            onSaved={reload}
          />
        ))}
    </section>
  );
}

function MatchSheet({
  editionId,
  version,
  form,
  onSaved,
}: {
  readonly editionId: string;
  readonly version: number;
  readonly form: EditionForm;
  readonly onSaved: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [match, setMatch] = useState<MatchEntry>(blankMatch);
  const [clock, setClock] = useState('');
  const [winner, setWinner] = useState<Side | null>(null);
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const { busy, failure, send } = useCommand(onSaved);
  const durationSeconds = parseClock(clock);
  const problems = matchEntryProblems(match);
  const nickname = (id: string) => form.players.find((p) => p.id === id)?.nickname ?? id;

  const setSide = (line: number, side: number, change: Partial<EntrySide>) => {
    setMatch((current) => ({
      ...current,
      lines: current.lines.map((l, i) =>
        i !== line
          ? l
          : {
              ...l,
              sides: [
                side === 0 ? { ...l.sides[0], ...change } : l.sides[0],
                side === 1 ? { ...l.sides[1], ...change } : l.sides[1],
              ],
            },
      ),
    }));
  };

  const ready = durationSeconds !== null && winner !== null && problems.length === 0;

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    // Les erreurs ne s'affichent qu'au premier essai : une feuille vierge n'en est pas une.
    setTried(true);
    if (durationSeconds === null || winner === null || problems.length > 0) return;
    send(async () => {
      setSaved(await admin.recordMatch(editionId, version, { ...match, durationSeconds, winner }));
    });
  };

  return (
    <form className="admin-panel admin-match" onSubmit={submit}>
      <div className="admin-panel-body">
        <div className="admin-form">
          <label>
            {t('admin.match.duration')}
            <input
              value={clock}
              placeholder="32:10"
              required
              inputMode="numeric"
              onChange={(e) => {
                setClock(e.target.value);
              }}
            />
          </label>
          <fieldset className="admin-checks">
            <legend>{t('admin.match.winner')}</legend>
            {SIDES.map((side) => (
              <label key={side}>
                <input
                  type="radio"
                  name="winner"
                  checked={winner === side}
                  onChange={() => {
                    setWinner(side);
                  }}
                />
                {t(`admin.match.side.${side}`)}
              </label>
            ))}
          </fieldset>
        </div>
        <div className="admin-match-sides">
          {SIDES.map((side, s) => (
            <fieldset key={side} className="admin-match-side">
              <legend>{t(`admin.match.side.${side}`)}</legend>
              <label className="admin-match-team">
                {t('admin.match.team')}
                <input
                  value={match.teams[s]}
                  maxLength={40}
                  onChange={(e) => {
                    const name = e.target.value;
                    setMatch((current) => ({
                      ...current,
                      teams: s === 0 ? [name, current.teams[1]] : [current.teams[0], name],
                    }));
                  }}
                />
              </label>
              <div className="admin-match-line admin-match-head" aria-hidden="true">
                <span className="admin-match-role" />
                <span className="admin-match-head-player">{t('admin.match.player')}</span>
                <span className="admin-match-head-champion">{t('admin.match.champion')}</span>
                <span className="admin-match-stat">{t('admin.match.k')}</span>
                <span className="admin-match-stat">{t('admin.match.d')}</span>
                <span className="admin-match-stat">{t('admin.match.a')}</span>
                <span className="admin-match-gold">{t('admin.match.gold')}</span>
              </div>
              {match.lines.map((line, l) => {
                const place = line.sides[s] ?? line.sides[0];
                const label = (what: string) => `${what} ${line.role} ${side}`;
                return (
                  <div key={line.role} className="admin-match-line">
                    <span className="admin-match-role">{line.role}</span>
                    <select
                      aria-label={label(t('admin.match.player'))}
                      value={place.playerId}
                      onChange={(e) => {
                        setSide(l, s, { playerId: e.target.value });
                      }}
                    >
                      <option value="">—</option>
                      {form.players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nickname}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={label(t('admin.match.champion'))}
                      value={place.champion}
                      maxLength={40}
                      placeholder={t('admin.match.champion')}
                      onChange={(e) => {
                        setSide(l, s, { champion: e.target.value });
                      }}
                    />
                    {STATS.map((stat) => (
                      <input
                        key={stat}
                        aria-label={label(t(`admin.match.${stat}`))}
                        className={stat === 'gold' ? 'admin-match-gold' : 'admin-match-stat'}
                        type="number"
                        min={0}
                        value={place[stat]}
                        onChange={(e) => {
                          setSide(l, s, { [stat]: Math.max(0, Number(e.target.value)) });
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>
        {tried && !ready && (
          <ul
            className="admin-match-problems"
            aria-label={t('admin.match.problems')}
            aria-live="polite"
          >
            {durationSeconds === null && <li>{t('admin.match.badDuration')}</li>}
            {winner === null && <li>{t('admin.match.noWinner')}</li>}
            {problems.map((problem) => (
              <li key={problemKey(problem)}>{explain(t, problem, nickname)}</li>
            ))}
          </ul>
        )}
        <button type="submit" className="auth-button" disabled={busy}>
          {t('admin.match.save')}
        </button>
        {saved !== null && <p role="status">{t('admin.match.saved', { n: saved })}</p>}
        {failure !== null && <p role="alert">{t('admin.failed', { message: failure })}</p>}
      </div>
    </form>
  );
}

const problemKey = (p: MatchEntryProblem): string =>
  p.kind === 'missingPlayer' || p.kind === 'missingChampion'
    ? `${p.kind}-${p.role}-${p.side}`
    : p.kind === 'samePlayerTwice'
      ? `${p.kind}-${p.playerId}`
      : p.kind;

/** Ce que l'admin doit corriger, en mots. */
function explain(t: Translate, p: MatchEntryProblem, nickname: (id: string) => string): string {
  switch (p.kind) {
    case 'roles':
      return t('admin.match.problem.roles');
    case 'teams':
      return t('admin.match.problem.teams');
    case 'missingPlayer':
      return t('admin.match.problem.missingPlayer', { role: p.role, side: p.side });
    case 'missingChampion':
      return t('admin.match.problem.missingChampion', { role: p.role, side: p.side });
    case 'samePlayerTwice':
      return t('admin.match.problem.samePlayerTwice', { player: nickname(p.playerId) });
  }
}
