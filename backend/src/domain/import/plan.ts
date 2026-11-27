import { normalizeAlias } from '../identity/names.ts';
import type { MatchResult, Role } from '../performance.ts';
import { nameOf, type ImportAnalysis, type ImportContext } from './analyze.ts';
import type { StatsSheet } from './stats-sheet.ts';

export type NameDecision =
  { readonly kind: 'existing'; readonly playerId: string } | { readonly kind: 'new' };

/** Une équipe inconnue : la créer, l'ignorer, ou la relier à une équipe connue (un tag mal écrit). */
export type TeamDecision = 'create' | 'ignore' | { readonly linkTo: string };

/** Choix de l'admin, indexés par clé de nom, tag d'équipe et identifiant de joueur. */
export interface ImportDecisions {
  readonly names: Readonly<Record<string, NameDecision>>;
  readonly unknownTeams: Readonly<Record<string, TeamDecision>>;
  readonly transfers: Readonly<Record<string, 'apply' | 'ignore'>>;
}

/** Les décisions d'un import qui n'a encore rien décidé. */
export const NO_DECISION: ImportDecisions = { names: {}, unknownTeams: {}, transfers: {} };

/**
 * L'équipe où vont les joueurs d'une équipe de la feuille : elle-même si elle
 * est connue ou créée, celle à laquelle l'admin l'a reliée, ou aucune (null)
 * si elle est ignorée ou pas encore décidée.
 */
function destinationOf(
  teamTag: string,
  unknownTeams: ImportDecisions['unknownTeams'],
  knownTeamTags: readonly string[],
): string | null {
  if (knownTeamTags.includes(teamTag)) return teamTag;
  const decision = unknownTeams[teamTag];
  if (decision === 'create') return teamTag;
  if (decision === undefined || decision === 'ignore') return null;
  return decision.linkTo;
}

/**
 * Les transferts que l'admin doit trancher, selon ce qu'il a décidé des
 * équipes inconnues : vers l'équipe créée ou reliée ; aucun vers une équipe
 * ignorée ou pas encore décidée, ni vers l'équipe où le joueur est déjà.
 */
export function transfersToDecide(
  analysis: ImportAnalysis,
  decisions: ImportDecisions,
  context: ImportContext,
): ImportAnalysis['transfers'] {
  return analysis.transfers.flatMap((transfer) => {
    const toTeamTag = destinationOf(
      transfer.toTeamTag,
      decisions.unknownTeams,
      context.knownTeamTags,
    );
    return toTeamTag === null || toTeamTag === transfer.fromTeamTag
      ? []
      : [{ ...transfer, toTeamTag }];
  });
}

export type PlayerRef =
  | { readonly kind: 'existing'; readonly playerId: string }
  | { readonly kind: 'new'; readonly key: string };

export interface PlannedPerformance {
  readonly player: PlayerRef;
  readonly team: string;
  readonly role: Role;
  readonly champion: string;
  readonly result: MatchResult;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gold: number;
}

export interface PlannedMatch {
  readonly matchNumber: number;
  readonly winnerTeam: string;
  readonly durationSeconds: number;
  readonly performances: readonly PlannedPerformance[];
}

/** Tout ce que la commande d'import doit écrire, sans plus rien à décider. */
export interface ImportPlan {
  readonly newPlayers: readonly { key: string; nickname: string; teamTag: string | null }[];
  readonly newAliases: readonly { playerId: string; alias: string }[];
  readonly newTeams: readonly string[];
  readonly transfers: ImportAnalysis['transfers'];
  readonly matches: readonly PlannedMatch[];
}

export type ImportPlanResult =
  | { readonly ok: true; readonly plan: ImportPlan }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Applique les décisions de l'admin à l'analyse. Tout cas non résolu sans
 * décision est une erreur : rien n'est deviné en silence.
 */
export function planImport(
  sheet: StatsSheet,
  analysis: ImportAnalysis,
  decisions: ImportDecisions,
  context: ImportContext,
): ImportPlanResult {
  const errors: string[] = [];

  // 1. À qui correspond chaque nom.
  const refs = new Map<string, PlayerRef>();
  for (const name of analysis.names) {
    const key = normalizeAlias(name.nickname);
    const ref = refFor(name, decisions.names[key], context, errors);
    if (ref) refs.set(key, ref);
  }

  // 2. Équipes inconnues.
  for (const { teamTag } of analysis.unknownTeams) {
    const decision = decisions.unknownTeams[teamTag];
    if (decision === undefined) {
      errors.push(
        `Décision manquante pour l’équipe « ${teamTag} » : aucune équipe connue ne porte ce tag.`,
      );
    } else if (typeof decision === 'object' && !context.knownTeamTags.includes(decision.linkTo)) {
      errors.push(`L’équipe « ${decision.linkTo} » n’existe pas (pour « ${teamTag} »).`);
    }
  }
  const newTeams = analysis.unknownTeams
    .map((t) => t.teamTag)
    .filter((tag) => decisions.unknownTeams[tag] === 'create');

  // 3. Transferts, pour les joueurs toujours rattachés après décisions.
  const stillMatched = new Set(
    [...refs.values()].flatMap((r) => (r.kind === 'existing' ? [r.playerId] : [])),
  );
  const transfers = transfersToDecide(analysis, decisions, context).filter((t) =>
    stillMatched.has(t.playerId),
  );
  for (const { playerId, fromTeamTag, toTeamTag } of transfers) {
    if (decisions.transfers[playerId] === undefined) {
      // Un transfert vient toujours d'un nom rattaché à ce joueur (`analyzeImport`).
      const nickname =
        analysis.names.find(
          ({ resolution }) => resolution.kind === 'matched' && resolution.playerId === playerId,
        )?.nickname ?? playerId;
      errors.push(
        `Décision manquante pour le transfert de « ${nickname} » (${fromTeamTag} → ${toTeamTag}).`,
      );
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const teamOfNewPlayer = (teamTag: string | null) =>
    teamTag === null ? null : destinationOf(teamTag, decisions.unknownTeams, context.knownTeamTags);

  return {
    ok: true,
    plan: {
      newPlayers: analysis.names.flatMap((name) => {
        const key = normalizeAlias(name.nickname);
        return refs.get(key)?.kind === 'new'
          ? [{ key, nickname: name.nickname, teamTag: teamOfNewPlayer(name.teamTag) }]
          : [];
      }),
      newAliases: [...refs].flatMap(([alias, ref]) => {
        if (ref.kind !== 'existing') return [];
        const known = context.players.find((p) => p.playerId === ref.playerId)?.aliases ?? [];
        return known.some((a) => normalizeAlias(a) === alias)
          ? []
          : [{ playerId: ref.playerId, alias }];
      }),
      newTeams,
      transfers: transfers.filter((t) => decisions.transfers[t.playerId] === 'apply'),
      matches: sheet.matches.map((match) => ({
        matchNumber: match.matchNumber,
        winnerTeam: match.winnerTeam,
        durationSeconds: match.durationSeconds,
        performances: match.lines.flatMap((line) =>
          line.sides.map((side) => {
            const { key } = nameOf(side, context.knownTeamTags);
            const player = refs.get(key);
            // Impossible si l'analyse vient de cette feuille : chaque nom a une référence.
            if (player === undefined) throw new Error(`Nom absent de l'analyse : « ${key} ».`);
            return {
              player,
              team: side.team,
              role: line.role,
              champion: side.champion,
              result: side.result,
              kills: side.kills,
              deaths: side.deaths,
              assists: side.assists,
              gold: side.gold,
            };
          }),
        ),
      })),
    },
  };
}

function refFor(
  name: ImportAnalysis['names'][number],
  decision: NameDecision | undefined,
  context: ImportContext,
  errors: string[],
): PlayerRef | undefined {
  if (decision === undefined) {
    if (name.resolution.kind === 'matched') {
      return { kind: 'existing', playerId: name.resolution.playerId };
    }
    const why =
      name.resolution.kind === 'ambiguous'
        ? 'plusieurs joueurs portent ce pseudo'
        : 'aucun joueur connu ne porte ce pseudo';
    errors.push(`Décision manquante pour le joueur « ${name.nickname} » : ${why}.`);
    return undefined;
  }
  if (decision.kind === 'new') return { kind: 'new', key: normalizeAlias(name.nickname) };
  if (!context.players.some((p) => p.playerId === decision.playerId)) {
    errors.push(`Le joueur « ${decision.playerId} » n’existe pas (pour « ${name.nickname} »).`);
    return undefined;
  }
  return { kind: 'existing', playerId: decision.playerId };
}
