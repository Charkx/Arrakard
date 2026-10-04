import { normalizeAlias } from '../identity/names.ts';
import type { MatchResult, Role } from '../performance.ts';
import { nameOf, type ImportAnalysis, type ImportContext } from './analyze.ts';
import type { StatsSheet } from './stats-sheet.ts';

export type NameDecision =
  { readonly kind: 'existing'; readonly playerId: string } | { readonly kind: 'new' };

/** Choix de l'admin, indexés par clé de nom, tag d'équipe et identifiant de joueur. */
export interface ImportDecisions {
  readonly names: Readonly<Record<string, NameDecision>>;
  readonly unknownTeams: Readonly<Record<string, 'create' | 'ignore'>>;
  readonly transfers: Readonly<Record<string, 'apply' | 'ignore'>>;
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
    if (decisions.unknownTeams[teamTag] === undefined) {
      errors.push(`Décision manquante pour l’équipe « ${teamTag} ».`);
    }
  }
  const newTeams = analysis.unknownTeams
    .map((t) => t.teamTag)
    .filter((tag) => decisions.unknownTeams[tag] === 'create');

  // 3. Transferts, pour les joueurs toujours rattachés après décisions.
  const stillMatched = new Set(
    [...refs.values()].flatMap((r) => (r.kind === 'existing' ? [r.playerId] : [])),
  );
  const transfers = analysis.transfers.filter((t) => stillMatched.has(t.playerId));
  for (const { playerId } of transfers) {
    if (decisions.transfers[playerId] === undefined) {
      errors.push(`Décision manquante pour le transfert de « ${playerId} ».`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const teamOfNewPlayer = (teamTag: string | null) =>
    teamTag !== null && (context.knownTeamTags.includes(teamTag) || newTeams.includes(teamTag))
      ? teamTag
      : null;

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
    errors.push(`Décision manquante pour le joueur « ${name.nickname} ».`);
    return undefined;
  }
  if (decision.kind === 'new') return { kind: 'new', key: normalizeAlias(name.nickname) };
  if (!context.players.some((p) => p.playerId === decision.playerId)) {
    errors.push(`Le joueur « ${decision.playerId} » n’existe pas (pour « ${name.nickname} »).`);
    return undefined;
  }
  return { kind: 'existing', playerId: decision.playerId };
}
