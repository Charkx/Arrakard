import { createHash } from 'node:crypto';
import { E1_E2_RATING_RULES, project, V1_RATING_RULES, type RatingRules } from '@arrakis/domain';
import type { Sql, TransactionSql } from 'postgres';
import type { MigrationPlan } from '../plan.ts';
import { toProjectionRows } from './projection-rows.ts';
import { readFacts } from './read.ts';

export interface LoadedOrganization {
  readonly organizationId: string;
}

export interface LoadOptions {
  /**
   * Remplacer ce que l'organisation contient déjà. Sans cela, le chargement
   * refuse une organisation qui a des données : rien ne s'écrase par accident.
   */
  readonly replace: boolean;
}

type Row = Record<string, unknown>;

/** Les faits d'une organisation, des moins dépendants aux plus dépendants : l'ordre d'insertion. */
export const FACT_TABLES = [
  'seasons',
  'teams',
  'players',
  'player_aliases',
  'team_memberships',
  'editions',
  'matches',
  'performances',
  'edition_participants',
  'card_customizations',
  'registrations',
] as const;

/** Les projections : écrites uniquement par le recalcul (ADR 0003). */
export const PROJECTION_TABLES = [
  'player_season_ratings',
  'player_edition_history',
  'edition_standings',
] as const;

type Table = (typeof FACT_TABLES)[number] | (typeof PROJECTION_TABLES)[number];

/** Règles de note de chaque organisation (`organizations.rating_rules`, ADR 0008). */
const RATING_RULES: Record<string, RatingRules> = {
  v1: V1_RATING_RULES,
  e1_e2: E1_E2_RATING_RULES,
};

/**
 * Remplit une organisation avec les lignes d'un plan de migration, puis
 * recalcule ses projections. Tout se fait dans une seule transaction : si une
 * étape échoue, la base reste dans l'état d'avant.
 *
 * Avec `replace`, le chargement est rejouable : l'organisation est vidée puis
 * remplie, donc le même plan donne toujours la même base. Tout ce qui y a été
 * saisi depuis (inscriptions, personnalisations) est alors perdu.
 */
export async function loadPlan(
  sql: Sql,
  plan: MigrationPlan,
  organization: { readonly slug: string; readonly name: string },
  { replace }: LoadOptions,
): Promise<LoadedOrganization> {
  return sql.begin(async (tx) => {
    const { id: organizationId, ratingRules } = await upsertOrganization(tx, organization);
    if (await hasData(tx, organizationId)) {
      if (!replace) {
        throw new Error(
          `L’organisation « ${organization.slug} » contient déjà des données. Pour les remplacer, relancer avec --replace.`,
        );
      }
      await clearOrganization(tx, organizationId);
    }

    const { rows } = plan;
    const withOrganization = (list: readonly object[]): Row[] =>
      list.map((row) => ({ organization_id: organizationId, ...row }));

    await insert(tx, 'seasons', withOrganization(rows.seasons));
    await insert(tx, 'teams', withOrganization(rows.teams));
    // Un joueur fusionné cite un autre joueur : on insère tout le monde, puis on relie.
    await insert(
      tx,
      'players',
      withOrganization(rows.players.map((p) => ({ ...p, merged_into: null }))),
    );
    for (const player of rows.players) {
      if (player.merged_into === null) continue;
      await tx`update players set merged_into = ${player.merged_into} where id = ${player.id}`;
    }
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

    await recomputeProjections(tx, organizationId, ratingRules);

    return { organizationId };
  });
}

/**
 * Recalcule toutes les projections d'une organisation à partir de ses faits,
 * tels que la base les rend, et les remplace (ADR 0003).
 */
export async function recomputeProjections(
  tx: TransactionSql,
  organizationId: string,
  rules: RatingRules,
): Promise<void> {
  const projections = toProjectionRows(project(await readFacts(tx, organizationId), rules));
  for (const table of PROJECTION_TABLES) {
    await tx`delete from ${tx(table)} where organization_id = ${organizationId}`;
    await insert(
      tx,
      table,
      projections[table].map((row) => ({
        organization_id: organizationId,
        ...row,
        // L'explication de note se range en JSON.
        ...('breakdown' in row && { breakdown: tx.json(row.breakdown as never) }),
      })),
    );
  }
}

/** Vide une organisation : ses projections, puis ses faits, des plus dépendants aux moins dépendants. */
export async function clearOrganization(tx: TransactionSql, organizationId: string): Promise<void> {
  for (const table of [...PROJECTION_TABLES, ...FACT_TABLES.toReversed()]) {
    await tx`delete from ${tx(table)} where organization_id = ${organizationId}`;
  }
}

async function upsertOrganization(
  tx: TransactionSql,
  { slug, name }: { readonly slug: string; readonly name: string },
): Promise<{ id: string; ratingRules: RatingRules }> {
  const [organization] = await tx<{ id: string; rating_rules: string }[]>`
    insert into organizations (slug, name) values (${slug}, ${name})
    on conflict (slug) do update set name = excluded.name
    returning id, rating_rules`;
  const ratingRules = organization && RATING_RULES[organization.rating_rules];
  if (!organization || !ratingRules) {
    throw new Error(`Organisation ${slug} : création impossible, ou règles de note inconnues.`);
  }
  return { id: organization.id, ratingRules };
}

async function hasData(tx: TransactionSql, organizationId: string): Promise<boolean> {
  for (const table of FACT_TABLES) {
    const [found] = await tx`
      select 1 from ${tx(table)} where organization_id = ${organizationId} limit 1`;
    if (found) return true;
  }
  return false;
}

/** Insère des lignes par paquets : Postgres limite le nombre de valeurs par requête. */
async function insert(tx: TransactionSql, table: Table, rows: readonly Row[]): Promise<void> {
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
