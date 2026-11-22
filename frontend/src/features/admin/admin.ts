import {
  editionStatus,
  type EditionStatus,
  type EditionStatusFacts,
} from '@arrakis/backend/domain';
import type { SignedInUser } from '../../data/auth-source.ts';

/** Un admin dont le rôle a été revérifié depuis moins de 7 jours (ADR 0030). */
export function isFreshAdmin(user: SignedInUser | null): user is SignedInUser {
  return user?.role === 'admin' && !user.adminExpired;
}

/** Ouverte (la saison active) ou clôturée. */
export type SeasonStatus = 'open' | 'closed';

/** La saison d'une édition. */
export interface AdminSeason {
  readonly id: string;
  readonly name: string;
  readonly status: SeasonStatus;
}

/** Une édition telle que l'espace admin la liste (`admin_editions`). */
export interface AdminEdition extends EditionStatusFacts {
  readonly editionId: string;
  readonly name: string;
  /** Sa saison, ou null pour une édition hors saison. */
  readonly season: AdminSeason | null;
  /** Ses matchs en brouillon, que le public ne voit pas (ADR 0028). */
  readonly draftCount: number;
}

/** Une saison de l'espace admin, ou les éditions hors saison (`season` null). */
export interface AdminSeasonSection {
  readonly season: AdminSeason | null;
  readonly editions: readonly (AdminEdition & { readonly status: EditionStatus })[];
}

/**
 * Range les éditions par saison : la saison en cours d'abord, puis les plus
 * récentes, les éditions hors saison à la fin. Dans une saison, la plus
 * récente en haut, avec son statut déduit au jour `today` (ADR 0027).
 */
export function bySeason(editions: readonly AdminEdition[], today: string): AdminSeasonSection[] {
  const sections = new Map<string | null, { season: AdminSeason | null; list: AdminEdition[] }>();
  for (const edition of editions) {
    const key = edition.season?.id ?? null;
    const section = sections.get(key) ?? { season: edition.season, list: [] };
    section.list.push(edition);
    sections.set(key, section);
  }
  const latest = (list: readonly AdminEdition[]) =>
    list.reduce((max, e) => (e.date > max ? e.date : max), '');
  /** Rang d'une saison : la saison en cours, puis les clôturées, puis hors saison. */
  const rank = (season: AdminSeason | null) => {
    if (season === null) return 2;
    return season.status === 'open' ? 0 : 1;
  };
  return [...sections.values()]
    .sort((a, b) => rank(a.season) - rank(b.season) || latest(b.list).localeCompare(latest(a.list)))
    .map(({ season, list }) => ({
      season,
      editions: [...list]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => ({ ...e, status: editionStatus(e, today) })),
    }));
}
