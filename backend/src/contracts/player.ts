import { z } from 'zod';

/** L'entrée de « fusionner deux profils » : le profil en double, et celui qui reste. */
export const mergePlayersRequest = z.strictObject({
  organizationId: z.guid(),
  absorbedId: z.guid(),
  keptId: z.guid(),
});

/** Un identifiant de compte Discord : un nombre de 17 à 20 chiffres (« snowflake »). */
const discordUserId = z
  .string()
  .trim()
  .regex(/^\d{17,20}$/);

/** L'entrée de « lier une carte à Discord » : le compte, ou null pour délier. */
export const linkDiscordAccountRequest = z.strictObject({
  organizationId: z.guid(),
  playerId: z.guid(),
  discordUserId: discordUserId.nullable(),
});

export type MergePlayersRequest = z.infer<typeof mergePlayersRequest>;
export type LinkDiscordAccountRequest = z.infer<typeof linkDiscordAccountRequest>;
