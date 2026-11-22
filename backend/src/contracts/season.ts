import { z } from 'zod';

/** L'entrée de « ouvrir une saison » : son nom et son année. */
export const openSeasonRequest = z.strictObject({
  organizationId: z.guid(),
  name: z.string().trim().min(1).max(80),
  year: z.int().min(2000).max(2100),
});

/** L'entrée de « clôturer une saison ». */
export const closeSeasonRequest = z.strictObject({
  organizationId: z.guid(),
  seasonId: z.guid(),
});

export type OpenSeasonRequest = z.infer<typeof openSeasonRequest>;
export type CloseSeasonRequest = z.infer<typeof closeSeasonRequest>;
