import { normalizeAlias, splitTeamTag } from '../identity/names';
import { resolvePlayer, type DirectoryPlayer, type Resolution } from '../identity/resolve';
import type { StatsSheet } from './stats-sheet';

export type RosterStatus = 'starter' | 'sub' | 'coach';

/** Un joueur connu, avec ce dont l'analyse d'import a besoin. */
export interface ImportPlayer extends DirectoryPlayer {
  readonly status: RosterStatus;
}

export interface ImportContext {
  readonly players: readonly ImportPlayer[];
  readonly knownTeamTags: readonly string[];
  /**
   * true pour une ligue ou un tournoi : les équipes de la feuille sont des
   * rosters. false pour un In House : ce sont des équipes éphémères.
   */
  readonly teamsAreRosters: boolean;
}

/** Un pseudo distinct de la feuille, et à qui il correspond. */
export interface ImportName {
  readonly nickname: string;
  /** Équipe la plus fréquente du joueur dans la feuille ; null en In House. */
  readonly teamTag: string | null;
  readonly appearances: number;
  readonly resolution: Resolution;
}

export interface ImportAnalysis {
  readonly names: readonly ImportName[];
  readonly unknownTeams: readonly {
    readonly teamTag: string;
    readonly nicknames: readonly string[];
  }[];
  readonly transfers: readonly {
    readonly playerId: string;
    readonly fromTeamTag: string;
    readonly toTeamTag: string;
  }[];
  readonly affectedRosters: readonly {
    readonly teamTag: string;
    readonly leavingStarterIds: readonly string[];
    readonly startersAfter: number;
  }[];
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

/**
 * Ce que l'import changerait : à qui correspond chaque pseudo, quelles équipes
 * sont inconnues, quels joueurs changent d'équipe. Rien n'est décidé ici :
 * l'admin tranche ensuite.
 */
export function analyzeImport(sheet: StatsSheet, context: ImportContext): ImportAnalysis {
  const names = collectNames(sheet, context).map(({ nickname, teamTag, appearances }) => ({
    nickname,
    teamTag,
    appearances,
    resolution: resolvePlayer(nickname, { teamTag }, context.players),
  }));

  if (!context.teamsAreRosters) {
    return { names, unknownTeams: [], transfers: [], affectedRosters: [] };
  }

  const transfers = detectTransfers(names, context.players);
  return {
    names,
    unknownTeams: detectUnknownTeams(names, context.knownTeamTags),
    transfers,
    affectedRosters: detectAffectedRosters(transfers, context.players),
  };
}

interface NameAccumulator {
  nickname: string;
  appearances: number;
  teams: Map<string, number>;
}

function collectNames(
  sheet: StatsSheet,
  context: ImportContext,
): { nickname: string; teamTag: string | null; appearances: number }[] {
  const byAlias = new Map<string, NameAccumulator>();

  for (const match of sheet.matches) {
    for (const line of match.lines) {
      for (const side of line.sides) {
        const tags = new Set([...context.knownTeamTags, side.team]);
        const { nickname } = splitTeamTag(side.rawName, tags);
        const alias = normalizeAlias(nickname);
        const acc = byAlias.get(alias) ?? {
          nickname,
          appearances: 0,
          teams: new Map<string, number>(),
        };
        byAlias.set(alias, acc);
        acc.appearances += 1;
        acc.teams.set(side.team, (acc.teams.get(side.team) ?? 0) + 1);
      }
    }
  }

  return [...byAlias.values()].map((acc) => ({
    nickname: acc.nickname,
    teamTag: context.teamsAreRosters ? mostFrequent(acc.teams) : null,
    appearances: acc.appearances,
  }));
}

function detectUnknownTeams(names: readonly ImportName[], knownTeamTags: readonly string[]) {
  const nicknamesByTeam = new Map<string, string[]>();
  for (const { teamTag, nickname } of names) {
    if (teamTag === null || knownTeamTags.includes(teamTag)) continue;
    nicknamesByTeam.set(teamTag, [...(nicknamesByTeam.get(teamTag) ?? []), nickname]);
  }
  return [...nicknamesByTeam].map(([teamTag, nicknames]) => ({
    teamTag,
    nicknames: nicknames.sort(collator.compare),
  }));
}

function detectTransfers(names: readonly ImportName[], players: readonly ImportPlayer[]) {
  return names.flatMap(({ resolution, teamTag }) => {
    if (resolution.kind !== 'matched' || teamTag === null) return [];
    const current = players.find((p) => p.playerId === resolution.playerId)?.teamTag ?? null;
    return current === null || current === teamTag
      ? []
      : [{ playerId: resolution.playerId, fromTeamTag: current, toTeamTag: teamTag }];
  });
}

function detectAffectedRosters(
  transfers: ImportAnalysis['transfers'],
  players: readonly ImportPlayer[],
) {
  const isActiveStarter = (p: ImportPlayer) => p.status === 'starter' && !p.archived;
  const leavingByTeam = new Map<string, string[]>();
  for (const { playerId, fromTeamTag } of transfers) {
    const player = players.find((p) => p.playerId === playerId);
    if (player === undefined || !isActiveStarter(player)) continue;
    leavingByTeam.set(fromTeamTag, [...(leavingByTeam.get(fromTeamTag) ?? []), playerId]);
  }
  return [...leavingByTeam].map(([teamTag, leavingStarterIds]) => ({
    teamTag,
    leavingStarterIds,
    startersAfter:
      players.filter((p) => p.teamTag === teamTag && isActiveStarter(p)).length -
      leavingStarterIds.length,
  }));
}

/** Clé la plus fréquente ; la première rencontrée en cas d'égalité. */
function mostFrequent(counts: ReadonlyMap<string, number>): string {
  return [...counts].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}
