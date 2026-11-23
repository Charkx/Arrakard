import { z } from 'zod';
import { editionAtVersion } from './edition.ts';

const count = z.int().min(0).max(100_000);

/** Ce qu'un admin saisit d'un joueur dans un match. */
const entrySide = z.strictObject({
  playerId: z.guid(),
  champion: z.string().trim().min(1).max(40),
  kills: count,
  deaths: count,
  assists: count,
  gold: count,
});

/**
 * L'entrée de « saisir un match » : la forme seulement. Ce qui rend une
 * feuille cohérente (chaque rôle une fois, un joueur une seule fois) se
 * vérifie dans le domaine (`matchEntryProblems`).
 */
export const recordMatchRequest = editionAtVersion.extend({
  durationSeconds: z
    .int()
    .min(1)
    .max(4 * 3600),
  winner: z.enum(['A', 'B']),
  teams: z.tuple([z.string().trim().min(1).max(40), z.string().trim().min(1).max(40)]),
  lines: z
    .array(
      z.strictObject({
        role: z.enum(['TOP', 'JGL', 'MID', 'ADC', 'SUP']),
        sides: z.tuple([entrySide, entrySide]),
      }),
    )
    .length(5),
});

export type RecordMatchRequest = z.infer<typeof recordMatchRequest>;
