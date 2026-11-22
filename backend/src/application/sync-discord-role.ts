import { CommandRejected, type Clock, type UnitOfWork } from './command.ts';
import type { MemberRole } from './memberships.ts';

/** Un membre d'un serveur Discord, tel que Discord le décrit. */
export interface GuildMember {
  readonly discordUserId: string;
  readonly roles: readonly string[];
}

/** Ce que le serveur demande à Discord (ADR 0030). */
export interface DiscordGateway {
  /**
   * Le membre du serveur à qui appartient ce jeton Discord, ou `undefined`
   * s'il n'est pas sur ce serveur. Refuse un jeton invalide.
   */
  guildMember(providerToken: string, guildId: string): Promise<GuildMember | undefined>;
}

export interface SyncDiscordRoleServices {
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly discord: DiscordGateway;
}

export interface SyncDiscordRoleInput {
  readonly organizationId: string;
  /** Le jeton que Discord a remis au site à la connexion. Jamais enregistré. */
  readonly providerToken: string;
}

export interface SyncDiscordRoleOutcome {
  /** Le rôle après la synchronisation, ou null si l'utilisateur n'est plus sur le serveur. */
  readonly role: MemberRole | null;
}

/** Le rôle que donne une place sur le serveur Discord : admin, simple membre, ou aucun. */
function roleFrom(member: GuildMember | undefined, adminRoleId: string): MemberRole | null {
  if (!member) return null;
  return member.roles.includes(adminRoleId) ? 'admin' : 'member';
}

/**
 * Accorde ou retire l'adhésion d'un utilisateur d'après ses rôles sur le
 * serveur Discord de l'organisation, à chaque connexion (ADR 0002, ADR 0030).
 * Ce n'est pas une commande : elle n'exige pas d'être admin, puisqu'elle sert à
 * le devenir. Chaque utilisateur connecté la lance pour lui-même.
 */
export function syncDiscordRole(
  { unitOfWork, clock, discord }: SyncDiscordRoleServices,
  userId: string,
  { organizationId, providerToken }: SyncDiscordRoleInput,
): Promise<SyncDiscordRoleOutcome> {
  return unitOfWork.run(organizationId, async (ports) => {
    const { organizations, memberships, identities, commandLog } = ports;
    const config = await organizations.discordConfig(organizationId);
    if (!config) {
      throw new CommandRejected('not_found', 'Cette organisation n’a pas de serveur Discord.');
    }
    const discordUserId = await identities.discordUserId(userId);
    if (discordUserId === undefined) {
      throw new CommandRejected('forbidden', 'Ce compte ne s’est pas connecté avec Discord.');
    }
    const member = await discord.guildMember(providerToken, config.guildId);
    // Sans membre (404), Discord ne dit pas à qui est le jeton : le seul effet
    // possible est alors de retirer sa propre adhésion.
    if (member && member.discordUserId !== discordUserId) {
      throw new CommandRejected('forbidden', 'Ce jeton Discord est celui d’un autre compte.');
    }
    const role = roleFrom(member, config.adminRoleId);
    const now = clock.now().toISOString();
    await memberships.setRole(organizationId, userId, role, now);
    await commandLog.append({
      organizationId,
      command: 'syncDiscordRole',
      actorUserId: userId,
      input: { discordUserId },
      outcome: { role },
      createdAt: now,
    });
    return { role };
  });
}
