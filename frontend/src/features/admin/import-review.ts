import {
  analyzeImport,
  normalizeAlias,
  parseNumberedStatsSheet,
  teamsAreRosters,
  type EditionType,
  type ImportAnalysis,
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

/** Ce que le fichier donnerait, montré avant l'import (ADR 0039). */
export type ImportReview =
  | { readonly kind: 'refused'; readonly problems: readonly string[] }
  | {
      readonly kind: 'ready';
      readonly matchCount: number;
      /** Les pseudos reconnus sans hésitation. */
      readonly recognized: number;
      readonly names: readonly NameToDecide[];
      readonly unknownTeams: ImportAnalysis['unknownTeams'];
      readonly transfers: ImportAnalysis['transfers'];
    };

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
  const analysis = analyzeImport(sheet, {
    players: directory.players,
    knownTeamTags: directory.teamTags,
    teamsAreRosters: teamsAreRosters(type),
  });
  const names = analysis.names
    .filter((n) => n.resolution.kind !== 'matched')
    .map((n) => ({ ...n, key: normalizeAlias(n.nickname) }));
  return {
    kind: 'ready',
    matchCount: sheet.matches.length,
    recognized: analysis.names.length - names.length,
    names,
    unknownTeams: analysis.unknownTeams,
    transfers: analysis.transfers,
  };
}

/** Les décisions d'un import qui n'a encore rien décidé. */
export const NO_DECISION: ImportDecisions = { names: {}, unknownTeams: {}, transfers: {} };

/** L'admin a-t-il décidé chaque cas de l'aperçu ? */
export function everythingDecided(
  review: Extract<ImportReview, { kind: 'ready' }>,
  decisions: ImportDecisions,
): boolean {
  return (
    review.names.every((n) => decisions.names[n.key] !== undefined) &&
    review.unknownTeams.every((t) => decisions.unknownTeams[t.teamTag] !== undefined) &&
    review.transfers.every((t) => decisions.transfers[t.playerId] !== undefined)
  );
}
