import type { TransactionSql } from 'postgres';
import { FACT_TABLES, insert, type FactTable } from './tables.ts';

/**
 * Tous les faits d'une organisation, une liste de lignes par table, une
 * propriété par colonne SQL. `organization_id` est ajouté à l'écriture.
 */
export type FactTableRows = Readonly<
  Record<Exclude<FactTable, 'players' | 'card_customizations'>, readonly object[]>
> & {
  readonly players: readonly { readonly id: string; readonly merged_into: string | null }[];
  readonly card_customizations: readonly { readonly riot_accounts: unknown }[];
};

/**
 * Écrit en masse les faits d'une organisation vide, table par table, dans
 * l'ordre des dépendances. Une opération propre à cet adaptateur : la
 * migration s'en sert, une commande n'écrit que les faits qu'elle modifie.
 */
export async function writeFacts(
  tx: TransactionSql,
  organizationId: string,
  rows: FactTableRows,
): Promise<void> {
  const withOrganization = (list: readonly object[]) =>
    list.map((row) => ({ organization_id: organizationId, ...row }));

  for (const table of FACT_TABLES) {
    if (table === 'players') {
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
    } else if (table === 'card_customizations') {
      await insert(
        tx,
        table,
        withOrganization(
          rows.card_customizations.map((c) => ({
            ...c,
            riot_accounts: tx.json(c.riot_accounts as never),
          })),
        ),
      );
    } else {
      await insert(tx, table, withOrganization(rows[table]));
    }
  }
}
