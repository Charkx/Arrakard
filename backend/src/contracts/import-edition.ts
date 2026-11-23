import { z } from 'zod';
import { editionAtVersion } from './edition.ts';

/** Une cellule de la feuille, telle que la bibliothèque Excel la lit. */
const cell = z.union([z.string().max(200), z.number(), z.boolean(), z.null()]);

/**
 * L'entrée d'« importer un fichier Excel » : les lignes de la feuille, chacune
 * avec son numéro dans le fichier. La forme seulement, avec des bornes contre
 * un fichier démesuré ; ce que veulent dire les colonnes se lit dans le
 * domaine (`parseNumberedStatsSheet`).
 */
/** Ce que l'admin a décidé des cas que l'import ne reconnaît pas seul (ADR 0039). */
const decisions = z.strictObject({
  /** Par clé de pseudo : le relier à un joueur existant, ou créer un joueur. */
  names: z.record(
    z.string().max(80),
    z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('existing'), playerId: z.guid() }),
      z.strictObject({ kind: z.literal('new') }),
    ]),
  ),
  /** Par tag : créer l'équipe, ou l'ignorer. */
  unknownTeams: z.record(z.string().max(16), z.enum(['create', 'ignore'])),
  /** Par joueur : appliquer son transfert, ou l'ignorer. */
  transfers: z.record(z.guid(), z.enum(['apply', 'ignore'])),
});

export const importEditionRequest = editionAtVersion.extend({
  decisions: decisions.optional(),
  rows: z
    .array(
      z.strictObject({
        line: z.int().min(1).max(100_000),
        cells: z
          .record(z.string().max(40), cell)
          .refine((cells) => Object.keys(cells).length <= 64, 'Trop de colonnes.'),
      }),
    )
    .min(1)
    .max(2000),
});

export type ImportEditionRequest = z.infer<typeof importEditionRequest>;
