import type { ProjectionStore, RecomputePorts } from '@arrakis/application';

import { postgresOrganizations } from './organizations.ts';
import { toProjectionRows } from './projections.ts';
import { readFacts } from './read.ts';
import { insert, PROJECTION_TABLES, type Db } from './tables.ts';

/** Les ports du recalcul, sur une connexion ou, d'ordinaire, dans une transaction. */
export function postgresRecomputePorts(tx: Db): RecomputePorts {
  return {
    facts: { readFacts: (organizationId) => readFacts(tx, organizationId) },
    organizations: postgresOrganizations(tx),
    projections: postgresProjectionStore(tx),
  };
}

function postgresProjectionStore(tx: Db): ProjectionStore {
  return {
    async replaceAll(organizationId, projections) {
      const rows = toProjectionRows(projections);
      for (const table of PROJECTION_TABLES) {
        await tx`delete from ${tx(table)} where organization_id = ${organizationId}`;
        await insert(
          tx,
          table,
          rows[table].map((row) => ({
            organization_id: organizationId,
            ...row,
            // L'explication de note se range en JSON.
            ...('breakdown' in row && { breakdown: tx.json(row.breakdown as never) }),
          })),
        );
      }
    },
  };
}
