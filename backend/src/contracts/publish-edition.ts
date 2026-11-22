import type { z } from 'zod';
import { editionAtVersion } from './edition.ts';

/** L'entrée de la commande « publier une édition » : ses brouillons, tous à la fois. */
export const publishEditionRequest = editionAtVersion;

export type PublishEditionRequest = z.infer<typeof publishEditionRequest>;
