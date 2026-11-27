import {
  analyzeImport,
  normalizeAlias,
  parseNumberedStatsSheet,
  teamsAreRosters,
  transfersToDecide,
  type EditionType,
  type ImportAnalysis,
  type ImportContext,
  type ImportDecisions,
  type ImportName,
  type ImportPlayer,
  type NumberedRow,
} from '@arrakis/backend/domain';

/** Un joueur connu, tel que l'admin le voit à l'import : avec son pseudo. */
export interface DirectoryEntry extends ImportPlayer {
  readonly nickname: string;
}

/** Les joueurs et les tags d'équipes connus, pour analyser un fichier. */
export interface ImportDirectoryView {
  readonly players: readonly DirectoryEntry[];
  readonly teamTags: readonly string[];
}

/** Un pseudo à décider, et sa clé dans les décisions. */
export interface NameToDecide extends ImportName {
  readonly key: string;
}

/** Une revue d'import prête : ce que l'admin doit décider avant d'importer. */
export interface ReadyReview {
  readonly kind: 'ready';
  readonly matchCount: number;
  /** Les pseudos reconnus sans hésitation. */
  readonly recognized: number;
  readonly names: readonly NameToDecide[];
  readonly unknownTeams: ImportAnalysis['unknownTeams'];
  /** L'analyse et son contexte, d'où se déduisent les transferts à trancher. */
  readonly analysis: ImportAnalysis;
  readonly context: ImportContext;
}

/** La revue d'import (ADR 0039) : ce que le fichier donnerait, montré avant d'importer. */
export type ImportReview =
  { readonly kind: 'refused'; readonly problems: readonly string[] } | ReadyReview;

/**
 * Lit les lignes comme le serveur les lira, et liste ce que l'admin doit
 * décider. Le serveur refait tout à l'import : ceci ne sert qu'à montrer.
 */
export function reviewImport(
  rows: readonly NumberedRow[],
  directory: ImportDirectoryView,
  type: EditionType,
): ImportReview {
  const parsed = parseNumberedStatsSheet(rows);
  if (!parsed.ok) return { kind: 'refused', problems: [parsed.error] };
  const { sheet } = parsed;
  if (sheet.warnings.length > 0) return { kind: 'refused', problems: sheet.warnings };
  const context = {
    players: directory.players,
    knownTeamTags: directory.teamTags,
    teamsAreRosters: teamsAreRosters(type),
  };
  const analysis = analyzeImport(sheet, context);
  const names = analysis.names
    .filter((n) => n.resolution.kind !== 'matched')
    .map((n) => ({ ...n, key: normalizeAlias(n.nickname) }));
  return {
    kind: 'ready',
    matchCount: sheet.matches.length,
    recognized: analysis.names.length - names.length,
    names,
    unknownTeams: analysis.unknownTeams,
    analysis,
    context,
  };
}

/** Les transferts à trancher, selon ce que l'admin a décidé des équipes (`transfersToDecide`). */
export const transfersOf = (review: ReadyReview, decisions: ImportDecisions) =>
  transfersToDecide(review.analysis, decisions, review.context);

/** L'admin a-t-il décidé chaque cas de la revue d'import ? */
export function everythingDecided(review: ReadyReview, decisions: ImportDecisions): boolean {
  return (
    review.names.every((n) => decisions.names[n.key] !== undefined) &&
    review.unknownTeams.every((t) => decisions.unknownTeams[t.teamTag] !== undefined) &&
    transfersOf(review, decisions).every((t) => decisions.transfers[t.playerId] !== undefined)
  );
}
