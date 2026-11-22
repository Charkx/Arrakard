/** Le rôle d'un utilisateur dans l'organisation (ADR 0008). */
export type MemberRole = 'admin' | 'member';

/** L'utilisateur connecté, et son rôle ; `null` s'il n'est pas sur le serveur Discord. */
export interface SignedInUser {
  readonly name: string;
  readonly role: MemberRole | null;
}

/** La connexion. Le site passe par Supabase Auth ; les tests, par une connexion simulée. */
export interface AuthSource {
  /**
   * L'utilisateur connecté, ou null. Au retour de Discord, termine la
   * connexion et fait revérifier son rôle par le serveur (ADR 0030).
   */
  currentUser(): Promise<SignedInUser | null>;
  /** Part se connecter chez Discord ; le site revient ensuite sur `/login`. */
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

/**
 * Une connexion chargée au premier usage : la bibliothèque de connexion
 * n'alourdit pas les pages publiques (ADR 0024).
 */
export function lazyAuthSource(load: () => Promise<AuthSource>): AuthSource {
  let loaded: Promise<AuthSource> | undefined;
  const source = () => (loaded ??= load());
  return {
    currentUser: async () => (await source()).currentUser(),
    signIn: async () => (await source()).signIn(),
    signOut: async () => (await source()).signOut(),
  };
}
