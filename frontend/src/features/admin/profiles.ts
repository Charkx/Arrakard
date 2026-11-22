/** Un profil de joueur non fusionné, tel que l'espace admin le liste. */
export interface AdminProfile {
  readonly id: string;
  readonly nickname: string;
  /** Le compte Discord lié à sa carte, ou null. */
  readonly discordUserId: string | null;
}
