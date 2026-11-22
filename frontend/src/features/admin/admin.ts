import { editionStatus, type EditionStatus, type EditionType } from '@arrakis/backend/domain';

/** Une édition telle que l'espace admin la liste (`admin_editions`). */
export interface AdminEdition {
  readonly editionId: string;
  readonly name: string;
  readonly type: EditionType;
  /** Date ISO (AAAA-MM-JJ). */
  readonly date: string;
  readonly seasonId: string | null;
  readonly seasonName: string | null;
  readonly seasonStatus: 'open' | 'closed' | null;
  readonly closedAt: string | null;
  readonly hasPublishedResults: boolean;
  readonly hasPublishedFinal: boolean;
  /** Ses matchs en brouillon, que le public ne voit pas (ADR 0028). */
  readonly draftCount: number;
}

/** Une saison de l'espace admin, ou les éditions hors saison (`seasonName` null). */
export interface AdminSeasonSection {
  readonly seasonId: string | null;
  readonly seasonName: string | null;
  readonly open: boolean;
  readonly editions: readonly (AdminEdition & { readonly status: EditionStatus })[];
}

/**
 * Range les éditions par saison : la saison en cours d'abord, puis les plus
 * récentes, les éditions hors saison à la fin. Dans une saison, la plus
 * récente en haut, avec son statut déduit au jour `today` (ADR 0027).
 */
export function bySeason(editions: readonly AdminEdition[], today: string): AdminSeasonSection[] {
  const sections = new Map<string | null, AdminEdition[]>();
  for (const edition of editions) {
    const list = sections.get(edition.seasonId) ?? [];
    list.push(edition);
    sections.set(edition.seasonId, list);
  }
  const latest = (list: readonly AdminEdition[]) =>
    list.reduce((max, e) => (e.date > max ? e.date : max), '');
  return [...sections.entries()]
    .map(([seasonId, list]) => ({ seasonId, list, first: list[0] }))
    .sort((a, b) => {
      if ((a.seasonId === null) !== (b.seasonId === null)) return a.seasonId === null ? 1 : -1;
      const aOpen = a.first?.seasonStatus === 'open';
      const bOpen = b.first?.seasonStatus === 'open';
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      return latest(b.list).localeCompare(latest(a.list));
    })
    .map(({ seasonId, list, first }) => ({
      seasonId,
      seasonName: first?.seasonName ?? null,
      open: first?.seasonStatus === 'open',
      editions: [...list]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => ({ ...e, status: editionStatus(e, today) })),
    }));
}
