import type { Anomaly } from './plan.ts';
import type { V1Dump, V1Edition } from './v1.ts';
import type { V2Season } from './v2.ts';

/** Le calendrier v2 tiré de la v1 : les saisons, et ce qui y rattache les éditions. */
export interface Calendar {
  readonly seasons: readonly V2Season[];
  /** Split v1 → saison v2 : la référence v1 note par split, la v2 par saison. */
  readonly seasonIdBySplitId: ReadonlyMap<string, string>;
  /** Début de la saison active, s'il y en a une. */
  readonly activeSeasonStart: string | null;
  /**
   * Saison d'une édition : celle de son split v1. Une édition sans split ne
   * comptait dans aucune note de split : elle reste hors saison, pour que les
   * notes ne changent pas.
   */
  seasonIdOf(edition: V1Edition): string | null;
}

/**
 * La v2 n'a qu'un niveau de période (ADR 0014) : chaque saison reprend les
 * dates et l'état de son unique split v1.
 */
export function planCalendar(dump: V1Dump, report: Anomaly[]): Calendar {
  const seasonIds = new Set(dump.seasons.map((s) => s.id));
  for (const split of dump.splits) {
    if (!seasonIds.has(split.season_id)) {
      throw new Error(`Split ${split.id} : saison ${split.season_id} introuvable.`);
    }
  }

  const splitsBySeason = Map.groupBy(dump.splits, (s) => s.season_id);
  const seasons = dump.seasons.map(({ id, name, year }): V2Season => {
    const splits = splitsBySeason.get(id) ?? [];
    if (splits.length > 1) {
      throw new Error(
        `Saison ${id} : ${splits.length} splits en v1 (${splits.map((s) => s.id).join(', ')}). La v2 n’a qu’un niveau de période (ADR 0014).`,
      );
    }
    const [split] = splits;
    if (!split) {
      report.push({
        code: 'season-without-split',
        message: `Saison ${id} (${name}) : aucun split en v1, reprise clôturée et sans dates.`,
      });
      return { id, name, year, start_date: null, end_date: null, status: 'closed' };
    }
    return {
      id,
      name,
      year,
      start_date: split.start_date,
      end_date: split.end_date,
      status: split.is_active ? 'open' : 'closed',
    };
  });

  const seasonIdBySplitId = new Map(dump.splits.map((s) => [s.id, s.season_id]));

  return {
    seasons,
    seasonIdBySplitId,
    activeSeasonStart: dump.splits.find((s) => s.is_active)?.start_date ?? null,
    seasonIdOf(edition) {
      if (edition.split_id === null) {
        report.push({
          code: 'edition-outside-season',
          message: `Édition ${edition.id} : sans split en v1 (saison v1 ${edition.season_id}), migrée hors saison : elle ne compte dans aucune note de saison.`,
        });
        return null;
      }
      const seasonId = seasonIdBySplitId.get(edition.split_id);
      if (seasonId === undefined) {
        throw new Error(`Édition ${edition.id} : split ${edition.split_id} introuvable.`);
      }
      if (seasonId !== edition.season_id) {
        report.push({
          code: 'season-mismatch',
          message: `Édition ${edition.id} : rattachée à la saison ${edition.season_id}, mais son split ${edition.split_id} appartient à la saison ${seasonId}. Saison ${seasonId} retenue.`,
        });
      }
      return seasonId;
    },
  };
}
