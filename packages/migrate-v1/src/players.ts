import type { Anomaly } from './plan.ts';
import type { V1Dump, V1Player } from './v1.ts';
import type { V2CardCustomization, V2TeamMembership } from './v2.ts';

/**
 * Passage en cours de chaque joueur qui a une équipe en v1. La v1 n'a pas
 * d'historique (M8) : on date l'arrivée de la première édition jouée sous ce
 * tag, sinon du début du split actif.
 */
export function teamMemberships(
  dump: V1Dump,
  firstPlayedOn: (playerId: string, teamTag: string) => string | undefined,
): V2TeamMembership[] {
  const splitStart = dump.splits.find((s) => s.is_active)?.start_date ?? null;
  return dump.players.flatMap((p) => {
    if (p.merged_into !== null || p.team_id === null || p.team_tag === null) return [];
    const joinedOn = firstPlayedOn(p.id, p.team_tag) ?? splitStart;
    if (joinedOn === null) {
      throw new Error(`Joueur ${p.id} : aucune date d’arrivée dans l’équipe ${p.team_tag}.`);
    }
    return [
      { player_id: p.id, team_id: p.team_id, status: p.status, joined_on: joinedOn, left_on: null },
    ];
  });
}

/** Personnalisation de carte, comptes Riot compris. La bio n'a pas d'équivalent (Q11). */
export function cardCustomizations(dump: V1Dump, report: Anomaly[]): V2CardCustomization[] {
  return dump.players.flatMap((p) => {
    if (p.merged_into !== null || (p.customization === null && p.riot_id === null)) return [];
    const c = p.customization ?? {};
    if (c.bio) {
      report.push({ code: 'dropped-bio', message: `Joueur ${p.id} : bio non migrée (Q11).` });
    }
    return [
      {
        player_id: p.id,
        title: c.title ?? null,
        selected_badges: c.selectedBadges ?? [],
        background: c.background ?? null,
        riot_accounts: riotAccounts(p),
      },
    ];
  });
}

/** Comptes Riot : `riot_id` s'ajoute s'il manque, en principal seulement s'il n'y en a pas. */
function riotAccounts(p: V1Player): V2CardCustomization['riot_accounts'] {
  const accounts = p.customization?.accounts ?? [];
  if (p.riot_id === null || accounts.some((a) => a.riotId === p.riot_id)) return accounts;
  return [...accounts, { riotId: p.riot_id, main: !accounts.some((a) => a.main) }];
}
