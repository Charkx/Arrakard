/** Le rôle d'un utilisateur dans une organisation (ADR 0008). */
export type MemberRole = 'admin' | 'member';

/** Le serveur Discord d'une organisation, et le rôle qui y fait un admin (ADR 0008). */
export interface DiscordConfig {
  readonly guildId: string;
  readonly adminRoleId: string;
}

/** Les adhésions : qui est admin ou membre de quelle organisation (ADR 0008). */
export interface MembershipRepository {
  /**
   * Est-il admin de l'organisation ? Un rôle admin non revérifié depuis 7
   * jours ne compte plus (ADR 0030).
   */
  isAdmin(organizationId: string, userId: string): Promise<boolean>;
  /** Donne ce rôle, vérifié à cette date ISO ; `null` retire l'adhésion. */
  setRole(
    organizationId: string,
    userId: string,
    role: MemberRole | null,
    syncedAt: string,
  ): Promise<void>;
}

/** Les comptes avec lesquels un utilisateur s'est connecté (Supabase Auth). */
export interface IdentityRepository {
  /** Son identifiant Discord, ou `undefined` s'il ne s'est pas connecté avec Discord. */
  discordUserId(userId: string): Promise<string | undefined>;
}
