import { useState, type SyntheticEvent } from 'react';
import type { EditionType, ImportDecisions, NameDecision } from '@arrakis/backend/domain';
import { useAdminSource } from '../../data/DataContext.tsx';
import type { ImportSummary } from '../../data/admin-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { MissingSheet, readStatsSheet } from './excel.ts';
import {
  everythingDecided,
  NO_DECISION,
  reviewImport,
  type DirectoryEntry,
  type ImportReview,
  type NameToDecide,
} from './import-review.ts';
import { useCommand } from './useCommand.ts';

type Ready = Extract<ImportReview, { kind: 'ready' }>;

/** Le fichier choisi, lu, et ce qu'il donnerait. */
interface Reviewed {
  readonly rows: Awaited<ReturnType<typeof readStatsSheet>>;
  readonly players: readonly DirectoryEntry[];
  readonly review: ImportReview;
}

/**
 * Importer le fichier Excel d'une édition sans match (cas d'usage A1 ;
 * ADR 0038, ADR 0039). Le navigateur lit la feuille et montre ce que l'admin
 * doit décider, par sorte de cas ; le serveur refait l'analyse, applique les
 * décisions et enregistre les matchs en brouillon.
 */
export function ImportPanel({
  editionId,
  version,
  type,
  onImported,
}: {
  readonly editionId: string;
  readonly version: number;
  readonly type: EditionType;
  readonly onImported: () => void;
}) {
  const { t } = useI18n();
  const admin = useAdminSource();
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [decisions, setDecisions] = useState<ImportDecisions>(NO_DECISION);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  // Lire le fichier n'écrit rien : seul l'import recharge l'édition.
  const reading = useCommand(() => undefined);
  const { busy, failure, send } = useCommand(onImported);

  const choose = (file: File | undefined) => {
    setReviewed(null);
    setDecisions(NO_DECISION);
    setSummary(null);
    if (file === undefined) return;
    reading.send(async () => {
      const rows = await readStatsSheet(await file.arrayBuffer()).catch((error: unknown) => {
        throw new Error(
          error instanceof MissingSheet
            ? t('admin.import.noSheet', { sheets: error.sheets.join(', ') })
            : t('admin.import.unreadable'),
        );
      });
      const directory = await admin.importDirectory();
      setReviewed({
        rows,
        players: directory.players,
        review: reviewImport(rows, directory, type),
      });
    });
  };

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (reviewed === null) return;
    send(
      async () => {
        setSummary(await admin.importEdition(editionId, version, reviewed.rows, decisions));
      },
      () => {
        setReviewed(null);
      },
    );
  };

  const review = reviewed?.review;
  return (
    <form className="admin-import" onSubmit={submit}>
      <h2 className="admin-import-title">{t('admin.import.title')}</h2>
      <p>{t('admin.import.help')}</p>
      <label>
        {t('admin.import.file')}
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => {
            choose(event.target.files?.[0]);
          }}
        />
      </label>
      {review?.kind === 'refused' && (
        <p role="alert" className="admin-import-failure">
          {[t('admin.import.refused'), ...review.problems].join('\n')}
        </p>
      )}
      {review?.kind === 'ready' && reviewed && (
        <Decisions
          review={review}
          players={reviewed.players}
          decisions={decisions}
          onChange={setDecisions}
        />
      )}
      {review?.kind === 'ready' && (
        <button
          type="submit"
          className="auth-button"
          disabled={busy || reading.busy || !everythingDecided(review, decisions)}
        >
          {t('admin.import.send')}
        </button>
      )}
      <div aria-live="polite">
        {summary !== null && (
          <p role="status">
            {t('admin.import.done', {
              count: summary.matches,
              players: summary.createdPlayers,
              teams: summary.createdTeams,
              transfers: summary.transfers,
            })}
          </p>
        )}
        {(reading.failure ?? failure) !== null && (
          <p role="alert" className="admin-import-failure">
            {reading.failure ?? failure}
          </p>
        )}
      </div>
    </form>
  );
}

/** Les trois listes de cas à décider, une ligne par cas (maquette validée le 2026-11-23). */
function Decisions({
  review,
  players,
  decisions,
  onChange,
}: {
  readonly review: Ready;
  readonly players: readonly DirectoryEntry[];
  readonly decisions: ImportDecisions;
  readonly onChange: (decisions: ImportDecisions) => void;
}) {
  const { t } = useI18n();
  const nicknameOf = (playerId: string) =>
    players.find((p) => p.playerId === playerId)?.nickname ?? playerId;

  return (
    <>
      <p>
        {t('admin.import.summary', { count: review.matchCount, recognized: review.recognized })}
      </p>
      {review.names.length > 0 && (
        <fieldset className="admin-import-cases">
          <legend>{t('admin.import.names', { count: review.names.length })}</legend>
          {review.names.map((name) => (
            <NameChoice
              key={name.key}
              name={name}
              players={players}
              chosen={decisions.names[name.key]}
              onChoose={(decision) => {
                onChange({ ...decisions, names: { ...decisions.names, [name.key]: decision } });
              }}
            />
          ))}
        </fieldset>
      )}
      {review.unknownTeams.length > 0 && (
        <fieldset className="admin-import-cases">
          <legend>{t('admin.import.teams', { count: review.unknownTeams.length })}</legend>
          {review.unknownTeams.map(({ teamTag, nicknames }) => (
            <TwoWay
              key={teamTag}
              label={`${teamTag} · ${nicknames.join(', ')}`}
              options={[
                ['create', t('admin.import.create')],
                ['ignore', t('admin.import.ignore')],
              ]}
              chosen={decisions.unknownTeams[teamTag]}
              onChoose={(choice) => {
                onChange({
                  ...decisions,
                  unknownTeams: { ...decisions.unknownTeams, [teamTag]: choice },
                });
              }}
            />
          ))}
        </fieldset>
      )}
      {review.transfers.length > 0 && (
        <fieldset className="admin-import-cases">
          <legend>{t('admin.import.transfers', { count: review.transfers.length })}</legend>
          {review.transfers.map(({ playerId, fromTeamTag, toTeamTag }) => (
            <TwoWay
              key={playerId}
              label={`${nicknameOf(playerId)} : ${fromTeamTag} → ${toTeamTag}`}
              options={[
                ['apply', t('admin.import.apply')],
                ['ignore', t('admin.import.ignore')],
              ]}
              chosen={decisions.transfers[playerId]}
              onChoose={(choice) => {
                onChange({
                  ...decisions,
                  transfers: { ...decisions.transfers, [playerId]: choice },
                });
              }}
            />
          ))}
        </fieldset>
      )}
    </>
  );
}

/** Un pseudo non reconnu : le relier à un joueur (les plus proches d'abord), ou en créer un. */
function NameChoice({
  name,
  players,
  chosen,
  onChoose,
}: {
  readonly name: NameToDecide;
  readonly players: readonly DirectoryEntry[];
  readonly chosen: NameDecision | undefined;
  readonly onChoose: (decision: NameDecision) => void;
}) {
  const { t } = useI18n();
  const close =
    name.resolution.kind === 'ambiguous'
      ? name.resolution.candidates.map((playerId) => ({ playerId, similarity: null }))
      : name.resolution.kind === 'unknown'
        ? name.resolution.suggestions
        : [];
  const others = players.filter((p) => !close.some((c) => c.playerId === p.playerId));
  const nicknameOf = (playerId: string) =>
    players.find((p) => p.playerId === playerId)?.nickname ?? playerId;
  const value = chosen === undefined ? '' : chosen.kind === 'new' ? 'new' : chosen.playerId;

  return (
    <label className="admin-import-case">
      {t('admin.import.name', {
        nickname: name.nickname,
        count: name.appearances,
        team: name.teamTag ?? '—',
      })}
      <select
        value={value}
        onChange={(event) => {
          const choice = event.target.value;
          if (choice === '') return;
          onChoose(choice === 'new' ? { kind: 'new' } : { kind: 'existing', playerId: choice });
        }}
      >
        <option value="">{t('admin.import.choose')}</option>
        <option value="new">{t('admin.import.newPlayer')}</option>
        {close.map(({ playerId, similarity }) => (
          <option key={playerId} value={playerId}>
            {similarity === null
              ? t('admin.import.link', { nickname: nicknameOf(playerId) })
              : t('admin.import.linkClose', {
                  nickname: nicknameOf(playerId),
                  percent: Math.round(similarity * 100),
                })}
          </option>
        ))}
        {others.map((p) => (
          <option key={p.playerId} value={p.playerId}>
            {t('admin.import.link', { nickname: p.nickname })}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Un cas à deux choix, en boutons radio. */
function TwoWay<Choice extends string>({
  label,
  options,
  chosen,
  onChoose,
}: {
  readonly label: string;
  readonly options: readonly (readonly [Choice, string])[];
  readonly chosen: Choice | undefined;
  readonly onChoose: (choice: Choice) => void;
}) {
  return (
    <div className="admin-import-case" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      {options.map(([choice, text]) => (
        <label key={choice}>
          <input
            type="radio"
            checked={chosen === choice}
            onChange={() => {
              onChoose(choice);
            }}
          />
          {text}
        </label>
      ))}
    </div>
  );
}
