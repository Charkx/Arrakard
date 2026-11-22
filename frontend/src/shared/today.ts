/** Le jour qu'il est à Arrakis (AAAA-MM-JJ), pour déduire le statut d'une édition (ADR 0027). */
export function todayInParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
}
