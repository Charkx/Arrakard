export interface SeasonMvpEvent {
  readonly eventMvpPlayerId?: string;
  /** Un identifiant par match où le joueur a été désigné MVP. */
  readonly matchMvpPlayerIds: readonly string[];
}

export interface SeasonMvpRow {
  readonly rank: number;
  readonly playerId: string;
  /** Titres de MVP de soirée : seul critère du règlement. */
  readonly titles: number;
  /** MVP de match, à titre informatif et pour départager. */
  readonly matchMvps: number;
}

const collator = new Intl.Collator('fr', { sensitivity: 'base' });

/**
 * Classement MVP sur une période (règlement, art. 1 : seul le titre de MVP de
 * soirée se cumule). Départage : MVP de match, puis pseudo.
 */
export function rankSeasonMvps(
  events: readonly SeasonMvpEvent[],
  nicknameOf: (playerId: string) => string,
): SeasonMvpRow[] {
  const titles = countBy(events.flatMap((e) => (e.eventMvpPlayerId ? [e.eventMvpPlayerId] : [])));
  const matchMvps = countBy(events.flatMap((e) => e.matchMvpPlayerIds));

  return [...titles]
    .map(([playerId, count]) => ({
      playerId,
      titles: count,
      matchMvps: matchMvps.get(playerId) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.titles - a.titles ||
        b.matchMvps - a.matchMvps ||
        collator.compare(nicknameOf(a.playerId), nicknameOf(b.playerId)),
    )
    .map((row, index) => ({ rank: index + 1, ...row }));
}

function countBy(ids: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}
