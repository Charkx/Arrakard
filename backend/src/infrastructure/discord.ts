import { CommandRejected, type DiscordGateway } from '../application/index.ts';
import { z } from 'zod';

/** L'API de Discord. */
const DISCORD_API_URL = 'https://discord.com/api/v10';

/** Ce qu'on lit de la réponse de Discord ; le reste est ignoré. */
const guildMemberResponse = z.object({
  user: z.object({ id: z.string() }),
  roles: z.array(z.string()),
});

/**
 * Demande à Discord qui est le porteur du jeton sur un serveur, avec la
 * permission `guilds.members.read` que le joueur donne à la connexion : aucun
 * bot n'est nécessaire (ADR 0030).
 */
export function discordGateway(
  apiUrl: string = DISCORD_API_URL,
  fetchFn: typeof fetch = fetch,
): DiscordGateway {
  const base = apiUrl.replace(/\/+$/, '');
  return {
    async guildMember(providerToken, guildId) {
      const response = await fetchFn(`${base}/users/@me/guilds/${guildId}/member`, {
        headers: { Authorization: `Bearer ${providerToken}` },
      });
      if (response.status === 404) return undefined;
      if (response.status === 401 || response.status === 403) {
        throw new CommandRejected('forbidden', 'Discord refuse ce jeton.');
      }
      if (!response.ok) throw new Error(`Discord a répondu ${String(response.status)}.`);
      const member = guildMemberResponse.parse(await response.json());
      return { discordUserId: member.user.id, roles: member.roles };
    },
  };
}
