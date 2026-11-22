/** Rôle (glossaire) : un seul énuméré dans tout le code. */
export type Role = 'TOP' | 'JGL' | 'MID' | 'ADC' | 'SUP';

export const ROLES: readonly Role[] = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];

export type MatchResult = 'win' | 'loss';

/**
 * Performance d'un joueur dans un match, telle que la consomment les calculs
 * de note et de statistiques (glossaire : « Performance »).
 */
export interface Performance {
  readonly role: Role;
  readonly result: MatchResult;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gold: number;
  /** Or par minute. */
  readonly gpm: number;
  /** Multiplicateur de prestige de l'édition (1 = normal). */
  readonly weight: number;
}
