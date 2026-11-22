import { z } from 'zod';

/** Un identifiant de la base : un UUID, sans exiger sa version. */
const id = z.guid();

/**
 * L'entrée de la commande « clôturer une édition », telle que le site
 * l'envoie : l'organisation où l'admin agit, l'édition, et la version qu'il
 * a sous les yeux (ADR 0005).
 */
export const closeEditionRequest = z.strictObject({
  organizationId: id,
  editionId: id,
  version: z.int().positive(),
});

export type CloseEditionRequest = z.infer<typeof closeEditionRequest>;
