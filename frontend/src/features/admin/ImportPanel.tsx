import { useState, type SyntheticEvent } from 'react';
import {
  NO_DECISION,
  type EditionType,
  type ImportDecisions,
  type NameDecision,
  type NumberedRow,
  type TeamDecision,
} from '@arrakis/backend/domain';
import { useAdminSource } from '../../data/DataContext.tsx';
import type { ImportSummary } from '../../data/admin-source.ts';
import { useI18n } from '../../shared/i18n/i18n.tsx';
import { MissingSheet, readStatsSheet } from './excel.ts';
import {
  everythingDecided,
  reviewImport,
  transfersOf,
  type DirectoryEntry,
  type ImportDirectoryView,
  type ImportReview,
  type NameToDecide,
  type ReadyReview,
} from './import-review.ts';
import { useCommand } from './useCommand.ts';

/** Le fichier choisi, lu, et sa revue d'import. */
interface Reviewed {
  readonly rows: readonly NumberedRow[];
  readonly directory: ImportDirectoryView;
  readonly review: ImportReview;
  /** L'édition où ce fichier a déjà été importé, ou null. */
  readonly importedIn: string | null;
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
      const [directory, importedIn] = await Promise.all([
        admin.importDirectory(),
        admin.importedIn(rows),
      ]);
      setReviewed({ rows, directory, importedIn, review: reviewImport(rows, directory, type) });
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

  const review = reviewed?.importedIn === null ? reviewed.review : undefined;
  const problem = reading.failure ?? failure;
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
      {reviewed?.importedIn != null && (
        <p role="alert">{t('admin.import.already', { edition: reviewed.importedIn })}</p>
      )}
      {review?.kind === 'refused' && (
        <p role="alert" className="admin-import-failure">
          {[t('admin.import.refused'), ...review.problems].join('\n')}
        </p>
      )}
      {review?.kind === 'ready' && reviewed && (
        <>
          <Decisions
            review={review}
            directory={reviewed.directory}
            decisions={decisions}
            onChange={setDecisions}
          />
          <button
            type="submit"
            className="auth-button"
            disabled={busy || !everythingDecided(review, decisions)}
          >
            {t('admin.import.send')}
          </button>
        </>
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
        {problem !== null && (
          <p role="alert" className="admin-import-failure">
            {problem}
          </p>
        )}
      </div>
    </form>
  );
}

/** Les trois listes de cas à décider, une ligne par cas (maquette validée le 2026-11-23). */
function Decisions({
  review,
  directory,
  decisions,
  onChange,
}: {
  readonly review: ReadyReview;
  readonly directory: ImportDirectoryView;
  readonly decisions: ImportDecisions;
  readonly onChange: (decisions: ImportDecisions) => void;
}) {
  const { t } = useI18n();
  const nicknameOf = nicknames(directory.players);
  const transfers = transfersOf(review, decisions);

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
              players={directory.players}
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
          {review.unknownTeams.map(({ teamTag, nicknames: names }) => (
            <TeamChoice
              key={teamTag}
              label={`${teamTag} · ${names.join(', ')}`}
              knownTags={directory.teamTags}
              chosen={decisions.unknownTeams[teamTag]}
              onChoose={(decision) => {
                onChange({
                  ...decisions,
                  unknownTeams: { ...decisions.unknownTeams, [teamTag]: decision },
                });
              }}
            />
          ))}
        </fieldset>
      )}
      {transfers.length > 0 && (
        <fieldset className="admin-import-cases">
          <legend>{t('admin.import.transfers', { count: transfers.length })}</legend>
          {transfers.map(({ playerId, fromTeamTag, toTeamTag }) => (
            <TransferChoice
              key={playerId}
              label={`${nicknameOf(playerId)} : ${fromTeamTag} → ${toTeamTag}`}
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

/** Le pseudo d'un joueur connu, par son identifiant. */
const nicknames = (players: readonly DirectoryEntry[]) => (playerId: string) =>
  players.find((p) => p.playerId === playerId)?.nickname ?? playerId;

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
  const nicknameOf = nicknames(players);
  const close =
    name.resolution.kind === 'ambiguous'
      ? name.resolution.candidates.map((playerId) => ({ playerId, similarity: null }))
      : name.resolution.kind === 'unknown'
        ? name.resolution.suggestions
        : [];
  const others = players.filter((p) => !close.some((c) => c.playerId === p.playerId));
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
              ? t('admin.import.link', { name: nicknameOf(playerId) })
              : t('admin.import.linkClose', {
                  name: nicknameOf(playerId),
                  percent: Math.round(similarity * 100),
                })}
          </option>
        ))}
        {others.map((p) => (
          <option key={p.playerId} value={p.playerId}>
            {t('admin.import.link', { name: p.nickname })}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Une équipe inconnue : la créer, l'ignorer, ou la relier à une équipe connue. */
function TeamChoice({
  label,
  knownTags,
  chosen,
  onChoose,
}: {
  readonly label: string;
  readonly knownTags: readonly string[];
  readonly chosen: TeamDecision | undefined;
  readonly onChoose: (decision: TeamDecision) => void;
}) {
  const { t } = useI18n();
  const value =
    chosen === undefined ? '' : typeof chosen === 'string' ? chosen : `team:${chosen.linkTo}`;
  return (
    <label className="admin-import-case">
      {label}
      <select
        value={value}
        onChange={(event) => {
          const choice = event.target.value;
          if (choice === 'create' || choice === 'ignore') onChoose(choice);
          else if (choice.startsWith('team:')) onChoose({ linkTo: choice.slice(5) });
        }}
      >
        <option value="">{t('admin.import.choose')}</option>
        <option value="create">{t('admin.import.create')}</option>
        <option value="ignore">{t('admin.import.ignore')}</option>
        {knownTags.map((tag) => (
          <option key={tag} value={`team:${tag}`}>
            {t('admin.import.link', { name: tag })}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Un transfert détecté : l'appliquer ou l'ignorer, en boutons radio. */
function TransferChoice({
  label,
  chosen,
  onChoose,
}: {
  readonly label: string;
  readonly chosen: 'apply' | 'ignore' | undefined;
  readonly onChoose: (choice: 'apply' | 'ignore') => void;
}) {
  const { t } = useI18n();
  return (
    <div className="admin-import-case" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      {(['apply', 'ignore'] as const).map((choice) => (
        <label key={choice}>
          <input
            type="radio"
            checked={chosen === choice}
            onChange={() => {
              onChoose(choice);
            }}
          />
          {t(choice === 'apply' ? 'admin.import.apply' : 'admin.import.ignore')}
        </label>
      ))}
    </div>
  );
}
