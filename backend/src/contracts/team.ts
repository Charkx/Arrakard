import { z } from 'zod';

/** Un tag d'équipe : 2 à 4 majuscules (« ARK »), mis en majuscules. */
const teamTag = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2,4}$/);

/** L'entrée de « créer une équipe » : son tag, son nom et ses divisions. */
export const createTeamRequest = z.strictObject({
  organizationId: z.guid(),
  tag: teamTag,
  name: z.string().trim().min(1).max(80),
  divisions: z
    .array(z.enum(['div1', 'div2']))
    .refine((divisions) => new Set(divisions).size === divisions.length, 'Division en double.'),
});

/** L'entrée de « transférer un joueur » : sa nouvelle place, ou null s'il quitte son équipe. */
export const transferPlayerRequest = z.strictObject({
  organizationId: z.guid(),
  playerId: z.guid(),
  to: z.strictObject({ teamId: z.guid(), status: z.enum(['starter', 'sub', 'coach']) }).nullable(),
});

/** L'entrée de « archiver une équipe ». */
export const archiveTeamRequest = z.strictObject({
  organizationId: z.guid(),
  teamId: z.guid(),
});

export type CreateTeamRequest = z.infer<typeof createTeamRequest>;
export type TransferPlayerRequest = z.infer<typeof transferPlayerRequest>;
export type ArchiveTeamRequest = z.infer<typeof archiveTeamRequest>;
