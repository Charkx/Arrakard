import { ROLES, type EntrySide, type MatchEntry } from '@arrakis/backend/domain';

/** Une place vide : ni joueur, ni champion, des statistiques à zéro. */
const emptySide = (): EntrySide => ({
  playerId: '',
  champion: '',
  kills: 0,
  deaths: 0,
  assists: 0,
  gold: 0,
});

/** Une feuille vierge : cinq lignes du TOP au SUP. Le vainqueur se choisit à part. */
export function blankMatch(): MatchEntry {
  return {
    durationSeconds: 0,
    winner: 'A',
    teams: ['', ''],
    lines: ROLES.map((role) => ({ role, sides: [emptySide(), emptySide()] as const })),
  };
}

/** « 32:10 » en secondes, ou null si ce n'est pas une durée minutes:secondes non nulle. */
export function parseClock(text: string): number | null {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(text.trim());
  if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  return seconds > 0 ? seconds : null;
}
