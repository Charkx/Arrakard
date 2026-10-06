import { createHash } from 'node:crypto';
import { normalizeAlias } from '@arrakis/domain';
import type { Anomaly } from './plan.ts';
import type { V1Dump, V1Player } from './v1.ts';
import type { V2Player, V2PlayerAlias } from './v2.ts';

/**
 * Clé de joueur de la v1 (`normalizedPlayerName`) : tag d'équipe en tête
 * retiré, puis minuscules, sans accents, espaces réduites.
 *
 * Copie exacte de l'algorithme v1, et non `normalizeAlias` du domaine : leurs
 * règles d'accents diffèrent sur quelques caractères (`^`, `` ` ``), et la
 * migration doit regrouper les performances exactement comme la v1.
 */
export function playerKey(name: string): string {
  const trimmed = name.trim();
  const shortName = /^[A-Z]{2,4}\s+(.+)$/.exec(trimmed)?.[1]?.trim() ?? trimmed;
  return shortName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

export interface Identities {
  /** Joueur v2 d'une graphie des lignes de match. */
  readonly playerIdOf: (name: string) => string;
  readonly players: readonly V2Player[];
  readonly aliases: readonly V2PlayerAlias[];
}

/** Une graphie de joueur rencontrée dans les lignes de match. */
export interface Sighting {
  readonly name: string;
  readonly team: string;
  /** `created_at` de l'édition du match, pour dater un joueur créé. */
  readonly editionCreatedAt: string;
}

/**
 * Rattache chaque graphie des lignes de match à un joueur v2, selon les règles
 * de la spécification de migration (section « Identité des joueurs »).
 */
export function resolveIdentities(
  dump: V1Dump,
  sightings: readonly Sighting[],
  report: Anomaly[],
): Identities {
  const byKey = Map.groupBy(sightings, (s) => playerKey(s.name));
  const active = dump.players.filter((p) => p.merged_into === null);
  const candidatesByKey = Map.groupBy(active, (p) => playerKey(p.name));

  const playerIdByKey = new Map<string, string>();
  const created: V2Player[] = [];
  const aliases = new Map<string, Set<string>>();
  const addAlias = (playerId: string, spelling: string) => {
    const set = aliases.get(playerId) ?? new Set();
    set.add(normalizeAlias(spelling));
    aliases.set(playerId, set);
  };
  for (const p of dump.players) addAlias(p.merged_into ?? p.id, p.name);

  for (const [key, seen] of byKey) {
    const [only, ...others] = candidatesByKey.get(key) ?? [];
    let id: string;
    if (!only) {
      const nickname = mostFrequent(seen.map((s) => s.name.trim()));
      id = stableUuid(key);
      created.push({
        id,
        nickname,
        archived: false,
        merged_into: null,
        discord_user_id: null,
        created_at: seen.map((s) => s.editionCreatedAt).reduce((a, b) => (b < a ? b : a)),
      });
      report.push({
        code: 'new-player',
        message: `« ${nickname} » ne correspond à aucun joueur v1 : joueur créé (${id}).`,
      });
    } else if (others.length === 0) {
      id = only.id;
    } else {
      id = pickHomonym(key, [only, ...others], seen, report);
    }
    playerIdByKey.set(key, id);
    for (const s of seen) addAlias(id, s.name);
  }

  return {
    playerIdOf: (name) => {
      const id = playerIdByKey.get(playerKey(name));
      // Invariant : toute graphie demandée vient des lignes de match, donc a été
      // résolue ci-dessus. Inatteignable par l'API publique, d'où l'exclusion.
      /* v8 ignore next */
      if (id === undefined) throw new Error(`Graphie « ${name} » absente des lignes de match.`);
      return id;
    },
    players: [
      ...dump.players.map((p): V2Player => ({
        id: p.id,
        nickname: p.name.trim(),
        archived: p.archived,
        merged_into: p.merged_into,
        discord_user_id: p.discord_user_id,
        created_at: p.created_at,
      })),
      ...created,
    ],
    aliases: [...aliases].flatMap(([player_id, set]) =>
      [...set].map((alias) => ({ player_id, alias })),
    ),
  };
}

/**
 * Homonymes : le joueur dont l'équipe actuelle apparaît le plus dans les
 * lignes. Sans gagnant net, la migration s'arrête plutôt que de deviner.
 */
function pickHomonym(
  key: string,
  candidates: readonly V1Player[],
  seen: readonly Sighting[],
  report: Anomaly[],
): string {
  const hits = (p: V1Player) => seen.filter((s) => s.team === p.team_tag).length;
  const [best, runnerUp] = [...candidates].sort((a, b) => hits(b) - hits(a));
  if (!best || hits(best) === 0 || (runnerUp && hits(runnerUp) === hits(best))) {
    throw new Error(
      `« ${key} » : ${candidates.length} joueurs v1 (${candidates.map((p) => p.id).join(', ')}) qu’aucune équipe ne départage.`,
    );
  }
  const others = candidates.filter((p) => p !== best).map((p) => p.id);
  report.push({
    code: 'homonyms',
    message: `« ${key} » : ${candidates.length} joueurs v1. Performances attribuées à ${best.id} (équipe ${String(best.team_tag)}) ; ${others.join(', ')} migré sans performance.`,
  });
  return best.id;
}

/**
 * Valeur la plus fréquente ; à égalité, la première par code de caractère
 * (indépendant de la langue du système, donc reproductible).
 */
function mostFrequent(values: readonly string[]): string {
  return [...Map.groupBy(values, (v) => v)]
    .map(([value, all]) => ({ value, count: all.length }))
    .reduce((best, cur) =>
      cur.count > best.count || (cur.count === best.count && cur.value < best.value) ? cur : best,
    ).value;
}

/** Espace de noms des UUID créés par la migration (UUID v5, RFC 9562). */
const NAMESPACE = 'b1f4c9e2-3a57-4d8e-9c61-0e2a7f5d4b38';

/** UUID v5 : toujours le même pour une même clé, donc une migration rejouable. */
export function stableUuid(key: string): string {
  const hash = createHash('sha1')
    .update(Buffer.from(NAMESPACE.replaceAll('-', ''), 'hex'))
    .update(key)
    .digest();
  hash.writeUInt8((hash.readUInt8(6) & 0x0f) | 0x50, 6); // version 5
  hash.writeUInt8((hash.readUInt8(8) & 0x3f) | 0x80, 8); // variant RFC 9562
  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
