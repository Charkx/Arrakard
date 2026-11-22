import { createHash } from 'node:crypto';
import { recomputeProjections } from '@arrakis/backend/application';
import {
  clearOrganization,
  hasFacts,
  postgresRecomputePorts,
  upsertOrganization,
  writeFacts,
} from '@arrakis/backend/infrastructure';
import type { Sql } from 'postgres';
import type { MigrationPlan } from './plan.ts';

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

/**
 * Remplit une organisation avec les lignes d'un plan de migration, puis
 * recalcule ses projections. Tout se fait dans une seule transaction : si une
 * étape échoue, la base reste dans l'état d'avant.
 *
 * Avec `replace`, le chargement est rejouable : l'organisation est vidée puis
 * remplie, donc le même plan donne toujours la même base. Tout ce qui y a été
 * saisi depuis (inscriptions, personnalisations) est alors perdu.
 *
 * Ce n'est pas une commande (ADR 0023) : un outil qui écrit les faits en masse
 * par l'adaptateur Postgres, puis appelle le même recalcul qu'une commande.
 */
export async function loadPlan(
  sql: Sql,
  plan: MigrationPlan,
  organization: { readonly slug: string; readonly name: string },
  { replace }: LoadOptions,
): Promise<LoadedOrganization> {
  return sql.begin(async (tx) => {
    const organizationId = await upsertOrganization(tx, organization);
    if (await hasFacts(tx, organizationId)) {
      if (!replace) {
        throw new Error(
          `L’organisation « ${organization.slug} » contient déjà des données. Pour les remplacer, relancer avec --replace.`,
        );
      }
      await clearOrganization(tx, organizationId);
    }

    const { rows } = plan;
    await writeFacts(tx, organizationId, {
      ...rows,
      team_memberships: rows.team_memberships.map((m) => ({ id: membershipId(m), ...m })),
    });

    await recomputeProjections(postgresRecomputePorts(tx), organizationId);

    return { organizationId };
  });
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
