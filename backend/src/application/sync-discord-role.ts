import { CommandRejected, type Clock, type UnitOfWork } from './command.ts';

/** Le rôle d'un utilisateur dans une organisation (ADR 0008). */
export type MemberRole = 'admin' | 'member';

/** Le serveur Discord d'une organisation, et le rôle qui y fait un admin (ADR 0008). */
export interface DiscordConfig {
  readonly guildId: string;
  readonly adminRoleId: string;
}

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
 * Ce n'est pas une commande d'admin : n'importe quel utilisateur connecté la
 * lance pour lui-même.
 */
export function syncDiscordRole(
  { unitOfWork, clock, discord }: SyncDiscordRoleServices,
  userId: string,
  { organizationId, providerToken }: SyncDiscordRoleInput,
): Promise<SyncDiscordRoleOutcome> {
  return unitOfWork.run(organizationId, async ({ organizations, memberships, commandLog }) => {
    const config = await organizations.discordConfig(organizationId);
    if (!config) {
      throw new CommandRejected('not_found', 'Cette organisation n’a pas de serveur Discord.');
    }
    const discordUserId = await memberships.discordUserId(userId);
    if (discordUserId === undefined) {
      throw new CommandRejected('forbidden', 'Ce compte ne s’est pas connecté avec Discord.');
    }
    const member = await discord.guildMember(providerToken, config.guildId);
    if (member && member.discordUserId !== discordUserId) {
      throw new CommandRejected('forbidden', 'Ce jeton Discord est celui d’un autre compte.');
    }
    const role = roleFrom(member, config.adminRoleId);
    await memberships.setRole(organizationId, userId, role);
    await commandLog.append({
      organizationId,
      command: 'syncDiscordRole',
      actorUserId: userId,
      input: { discordUserId },
      outcome: { role },
      createdAt: clock.now().toISOString(),
    });
    return { role };
  });
}
