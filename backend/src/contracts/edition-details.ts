import { z } from 'zod';
import { editionAtVersion } from './edition.ts';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((text) => (text === '' ? null : text))
    .nullable();

/** Ce qu'un admin saisit d'une édition, à la création comme à la modification. */
export const editionDetails = {
  organizationId: z.guid(),
  name: z.string().trim().min(1).max(80),
  type: z.enum([
    'league_div1',
    'league_div2',
    'inhouse',
    'tournament',
    'lan',
    'external_lan',
    'external_event',
  ]),
  date: z.iso.date(),
  seasonId: z.guid().nullable(),
  prestige: z.enum(['normal', 'premium', 'championship']),
  location: optionalText(120),
  url: z.url({ protocol: /^https?$/ }).nullable(),
  description: optionalText(2000),
  arrakisWon: z.boolean().nullable(),
  participantIds: z
    .array(z.guid())
    .refine((ids) => new Set(ids).size === ids.length, 'Participant en double.'),
};

/** L'entrée de « créer une édition ». */
export const createEditionRequest = z.strictObject(editionDetails);

/** L'entrée de « modifier une édition », à la version que l'admin a sous les yeux. */
export const updateEditionRequest = z.strictObject({
  ...editionDetails,
  editionId: z.guid(),
  version: z.int().min(1),
});

/** L'entrée de « archiver une édition ». */
export const archiveEditionRequest = editionAtVersion;

export type CreateEditionRequest = z.infer<typeof createEditionRequest>;
export type UpdateEditionRequest = z.infer<typeof updateEditionRequest>;
export type ArchiveEditionRequest = z.infer<typeof archiveEditionRequest>;
