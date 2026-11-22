import { z } from 'zod';

/**
 * L'entrée de « synchroniser son rôle Discord » : l'organisation, et le jeton
 * que Discord vient de remettre au site (ADR 0030).
 */
export const syncDiscordRoleRequest = z.strictObject({
  organizationId: z.guid(),
  providerToken: z.string().min(1),
});

export type SyncDiscordRoleRequest = z.infer<typeof syncDiscordRoleRequest>;
