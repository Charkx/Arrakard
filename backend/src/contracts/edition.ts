import { z } from 'zod';

/** Un identifiant de la base : un UUID, sans exiger sa version. */
const databaseId = z.guid();

/**
 * L'entrée d'une commande qui vise une édition : l'organisation où l'admin
 * agit, l'édition, et la version qu'il a sous les yeux (ADR 0005).
 */
export const editionAtVersion = z.strictObject({
  organizationId: databaseId,
  editionId: databaseId,
  version: z.int().positive(),
});
