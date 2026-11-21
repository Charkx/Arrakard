import type { MatchResult, Role } from './performance.ts';
import type { ScoringRules } from './standings/event-standings.ts';

/** Faits : ce qui a été saisi. Seules les commandes les écrivent (ADR 0003). */

export type EditionType =
  | 'league_div1'
  | 'league_div2'
  | 'inhouse'
  | 'tournament'
  | 'lan'
  | 'external_lan'
  | 'external_event';

export type Prestige = 'normal' | 'premium' | 'championship';

/** Période de compétition : une note ne compte que les matchs d'une saison (ADR 0014). */
export interface SeasonFact {
  readonly id: string;
}

export interface EditionFact {
  readonly id: string;
  readonly type: EditionType;
  /** Date ISO (AAAA-MM-JJ). */
  readonly date: string;
  /** Saison de l'édition ; null si elle est hors saison et ne compte dans aucune note de saison. */
  readonly seasonId: string | null;
  /** Prestige saisi (règles v1). */
  readonly prestige: Prestige;
  /** Exception au multiplicateur du type (règles E1), toujours justifiée. */
  readonly weightOverride?: { readonly multiplier: number; readonly reason: string };
  readonly eventMvpPlayerId?: string;
  readonly scoring?: ScoringRules;
}

export interface MatchFact {
  readonly id: string;
  readonly editionId: string;
  readonly matchNumber: number;
  readonly winnerTeam: string;
  readonly durationSeconds: number;
  readonly mvpPlayerId?: string;
}

export interface PerformanceFact {
  readonly matchId: string;
  /** Position de la ligne de rôle dans le match (0 = TOP … 4 = SUP). */
  readonly line: number;
  readonly side: 'A' | 'B';
  readonly playerId: string;
  readonly team: string;
  readonly role: Role;
  readonly champion: string;
  readonly result: MatchResult;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gold: number;
}

export interface PlayerFact {
  readonly id: string;
  readonly nickname: string;
}

export interface Facts {
  readonly seasons: readonly SeasonFact[];
  readonly editions: readonly EditionFact[];
  readonly matches: readonly MatchFact[];
  readonly performances: readonly PerformanceFact[];
  readonly players: readonly PlayerFact[];
}
