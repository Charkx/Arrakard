import { createHash } from 'node:crypto';
import { project, V1_RATING_RULES } from '@arrakis/domain';
import type { Sql, TransactionSql } from 'postgres';
import type { MigrationPlan } from '../plan.ts';
import { toProjectionRows } from './projection-rows.ts';
import { readFacts } from './read.ts';

export interface LoadedOrganization {
  readonly organizationId: string;
}

type Row = Record<string, unknown>;

/** Tables d'une organisation, des plus dépendantes aux moins dépendantes : l'ordre de vidage. */
const TABLES_TO_CLEAR = [
  'edition_standings',
  'player_edition_history',
  'player_season_ratings',
  'registrations',
  'card_customizations',
  'edition_participants',
  'performances',
  'matches',
  'editions',
  'team_memberships',
  'player_aliases',
  'players',
  'teams',
  'seasons',
] as const;

/**
 * Remplit une organisation avec les lignes d'un plan de migration, puis
 * recalcule ses projections. Tout se fait dans une seule transaction : si une
 * étape échoue, la base reste dans l'état d'avant.
 *
 * Le chargement est rejouable : l'organisation est vidée puis remplie, donc
 * le même plan donne toujours la même base.
 */
export async function loadPlan(
  sql: Sql,
  plan: MigrationPlan,
  organization: { readonly slug: string; readonly name: string },
): Promise<LoadedOrganization> {
  return sql.begin(async (tx) => {
    const organizationId = await upsertOrganization(tx, organization);
    await clearOrganization(tx, organizationId);

    // Les faits, des moins dépendants aux plus dépendants.
    const { rows } = plan;
    const withOrganization = (list: readonly object[]): Row[] =>
      list.map((row) => ({ organization_id: organizationId, ...row }));

    await insert(tx, 'seasons', withOrganization(rows.seasons));
    await insert(tx, 'teams', withOrganization(rows.teams));
    await insert(tx, 'players', withOrganization(rows.players));
    await insert(tx, 'player_aliases', withOrganization(rows.player_aliases));
    await insert(
      tx,
      'team_memberships',
      withOrganization(rows.team_memberships.map((m) => ({ id: membershipId(m), ...m }))),
    );
    await insert(tx, 'editions', withOrganization(rows.editions));
    await insert(tx, 'matches', withOrganization(rows.matches));
    await insert(tx, 'performances', withOrganization(rows.performances));
    await insert(tx, 'edition_participants', withOrganization(rows.edition_participants));
    await insert(
      tx,
      'card_customizations',
      withOrganization(
        rows.card_customizations.map((c) => ({ ...c, riot_accounts: tx.json(c.riot_accounts) })),
      ),
    );
    await insert(tx, 'registrations', withOrganization(rows.registrations));

    // Les projections, recalculées à partir des faits tels que la base les rend (ADR 0003).
    const projections = toProjectionRows(
      project(await readFacts(tx, organizationId), V1_RATING_RULES),
    );
    await insert(tx, 'player_season_ratings', withOrganization(projections.player_season_ratings));
    await insert(
      tx,
      'player_edition_history',
      withOrganization(projections.player_edition_history),
    );
    await insert(tx, 'edition_standings', withOrganization(projections.edition_standings));

    return { organizationId };
  });
}

/** Supprime une organisation et tout ce qu'elle contient. Sans effet si elle n'existe pas. */
export async function removeOrganization(sql: Sql, slug: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [organization] = await tx<{ id: string }[]>`
      select id from organizations where slug = ${slug}`;
    if (!organization) return;
    await clearOrganization(tx, organization.id);
    await tx`delete from organizations where id = ${organization.id}`;
  });
}

async function upsertOrganization(
  tx: TransactionSql,
  { slug, name }: { readonly slug: string; readonly name: string },
): Promise<string> {
  const [organization] = await tx<{ id: string }[]>`
    insert into organizations (slug, name) values (${slug}, ${name})
    on conflict (slug) do update set name = excluded.name
    returning id`;
  if (!organization) throw new Error(`Organisation ${slug} : création impossible.`);
  return organization.id;
}

async function clearOrganization(tx: TransactionSql, organizationId: string): Promise<void> {
  for (const table of TABLES_TO_CLEAR) {
    await tx`delete from ${tx(table)} where organization_id = ${organizationId}`;
  }
}

/** Insère des lignes par paquets : Postgres limite le nombre de valeurs par requête. */
async function insert(tx: TransactionSql, table: string, rows: readonly Row[]): Promise<void> {
  const BATCH = 500;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    await tx`insert into ${tx(table)} ${tx(batch as never)}`;
  }
}

/**
 * Identifiant d'un passage en équipe. La v1 n'en a pas : il est déduit du
 * passage lui-même, pour que deux chargements donnent la même base.
 */
function membershipId(m: {
  readonly player_id: string;
  readonly team_id: string;
  readonly joined_on: string;
}): string {
  const hex = createHash('sha256')
    .update(`${m.player_id}|${m.team_id}|${m.joined_on}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
