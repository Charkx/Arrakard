import type { z } from 'zod';
import { editionAtVersion } from './edition.ts';

/** L'entrée de la commande « clôturer une édition ». */
export const closeEditionRequest = editionAtVersion;

export type CloseEditionRequest = z.infer<typeof closeEditionRequest>;
