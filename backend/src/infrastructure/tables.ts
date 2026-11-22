import type { Sql, TransactionSql } from 'postgres';

/** Une connexion, ou une transaction ouverte : les lectures marchent sur les deux. */
export type Db = Sql | TransactionSql;

export type Row = Record<string, unknown>;

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

export type FactTable = (typeof FACT_TABLES)[number];
type Table = FactTable | (typeof PROJECTION_TABLES)[number];

/** Insère des lignes par paquets : Postgres limite le nombre de valeurs par requête. */
export async function insert(tx: Db, table: Table, rows: readonly Row[]): Promise<void> {
  const BATCH = 500;
  for (let start = 0; start < rows.length; start += BATCH) {
    const batch = rows.slice(start, start + BATCH);
    await tx`insert into ${tx(table)} ${tx(batch as never)}`;
  }
}

/** Vide une organisation : ses projections, puis ses faits, des plus dépendants aux moins dépendants. */
export async function clearOrganization(tx: TransactionSql, organizationId: string): Promise<void> {
  for (const table of [...PROJECTION_TABLES, ...FACT_TABLES.toReversed()]) {
    await tx`delete from ${tx(table)} where organization_id = ${organizationId}`;
  }
}

/** L'organisation contient-elle au moins un fait ? */
export async function hasFacts(tx: TransactionSql, organizationId: string): Promise<boolean> {
  for (const table of FACT_TABLES) {
    const [found] = await tx`
      select 1 from ${tx(table)} where organization_id = ${organizationId} limit 1`;
    if (found) return true;
  }
  return false;
}
