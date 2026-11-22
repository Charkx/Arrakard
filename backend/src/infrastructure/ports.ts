import type { ProjectionStore, RecomputePorts } from '../application/index.ts';

import { postgresOrganizations } from './organizations.ts';
import { toProjectionRows } from './projections.ts';
import { readFacts } from './read.ts';
import { insert, PROJECTION_TABLES, type Db } from './tables.ts';

/** Les ports du recalcul, sur une connexion ou, d'ordinaire, dans une transaction. */
export function postgresRecomputePorts(db: Db): RecomputePorts {
  return {
    facts: { readFacts: (organizationId) => readFacts(db, organizationId) },
    organizations: postgresOrganizations(db),
    projections: postgresProjectionStore(db),
  };
}

function postgresProjectionStore(db: Db): ProjectionStore {
  return {
    async replaceAll(organizationId, projections) {
      const rows = toProjectionRows(projections);
      for (const table of PROJECTION_TABLES) {
        await db`delete from ${db(table)} where organization_id = ${organizationId}`;
        await insert(
          db,
          table,
          rows[table].map((row) => ({
            organization_id: organizationId,
            ...row,
            // L'explication de note se range en JSON.
            ...('breakdown' in row && { breakdown: db.json(row.breakdown as never) }),
          })),
        );
      }
    },
  };
}
