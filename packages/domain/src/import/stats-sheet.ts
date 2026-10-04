import { ROLES, type MatchResult, type Role } from '../performance';

/** Une ligne brute de la feuille, telle que l'extrait la bibliothèque Excel. */
export type SheetRow = Readonly<Record<string, unknown>>;

export interface SheetSide {
  readonly team: string;
  readonly result: MatchResult;
  /** Nom tel qu'écrit dans la feuille (« ARK Meta ») : résolu plus tard. */
  readonly rawName: string;
  readonly champion: string;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly gold: number;
}

export interface SheetLine {
  readonly role: Role;
  readonly sides: readonly [SheetSide, SheetSide];
}

export interface SheetMatch {
  readonly matchNumber: number;
  readonly winnerTeam: string;
  readonly durationSeconds: number;
  readonly lines: readonly SheetLine[];
}

export interface StatsSheet {
  readonly matches: readonly SheetMatch[];
  readonly warnings: readonly string[];
}

export type SheetParseResult =
  | { readonly ok: true; readonly sheet: StatsSheet }
  | { readonly ok: false; readonly error: string };

const REQUIRED_COLUMNS = [
  'MATCH',
  'GAGNANT',
  'DURÉE',
  'EQUIPE',
  'POSTE',
  'NOM DU JOUEUR',
  'CHAMPION',
  'K',
  'D',
  'A',
  'GOLD',
] as const;

const ROLE_SYNONYMS: Readonly<Record<string, Role>> = {
  TOP: 'TOP',
  JGL: 'JGL',
  JUNGLE: 'JGL',
  MID: 'MID',
  MIDDLE: 'MID',
  ADC: 'ADC',
  BOT: 'ADC',
  SUP: 'SUP',
  SUPP: 'SUP',
  SUPPORT: 'SUP',
};

/** Garde-fous contre un fichier modifié (champs de plusieurs milliers de caractères). */
const MAX_LENGTH = { team: 16, name: 80, champion: 32 } as const;

/**
 * Durée Excel « minutes.secondes » en secondes : 33.11 → 33 min 11 s ;
 * 33.5 → 33 min 50 s (Excel a perdu le zéro final). Corrige la v1, qui
 * transformait 33.05 en 33 min 50 s.
 */
export function parseDuration(raw: number): number {
  const minutes = Math.floor(raw);
  return minutes * 60 + Math.round((raw - minutes) * 100);
}

/** Lit la feuille LIGUE1_STATS : une ligne par rôle, équipe A puis équipe B (« .1 » ou « _1 »). */
export function parseStatsSheet(rows: readonly SheetRow[]): SheetParseResult {
  const headerError = validateHeader(rows);
  if (headerError) return { ok: false, error: headerError };

  const warnings: string[] = [];
  const groups = new Map<number, { first: SheetRow; rows: SheetRow[] }>();
  for (const row of rows) {
    const matchNumber = numeric(row.MATCH);
    const isTotalsRow = !matchNumber || text(row['NOM DU JOUEUR']) === '';
    if (isTotalsRow) continue;
    const group = groups.get(matchNumber);
    if (group) group.rows.push(row);
    else groups.set(matchNumber, { first: row, rows: [row] });
  }

  if (groups.size === 0) {
    return {
      ok: false,
      error: `Aucun match exploitable : ${rows.length} ligne(s) lues. Vérifie que les colonnes MATCH et NOM DU JOUEUR sont remplies.`,
    };
  }

  const matches = [...groups]
    .sort(([a], [b]) => a - b)
    .map(([matchNumber, group]) => parseMatch(matchNumber, group, warnings));

  return { ok: true, sheet: { matches, warnings } };
}

function validateHeader(rows: readonly SheetRow[]): string | null {
  const first = rows[0];
  if (first === undefined) return 'Feuille vide : aucune ligne de données après l’en-tête.';

  const columns = Object.keys(first);
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  const problems: string[] = [];
  if (missing.length > 0) problems.push(`colonne(s) manquante(s) : ${missing.join(', ')}`);
  if (!columns.some((c) => c.endsWith('.1') || c.endsWith('_1'))) {
    problems.push('aucune colonne pour l’équipe B (suffixe « .1 » ou « _1 »)');
  }
  return problems.length > 0 ? `Format de feuille invalide : ${problems.join(' ; ')}.` : null;
}

function parseMatch(
  matchNumber: number,
  group: { readonly first: SheetRow; readonly rows: readonly SheetRow[] },
  warnings: string[],
): SheetMatch {
  const lines: SheetLine[] = [];
  for (const row of group.rows) {
    const rawRole = text(row.POSTE);
    const role = ROLE_SYNONYMS[rawRole.toUpperCase()];
    if (role === undefined) {
      warnings.push(`Match ${matchNumber} : poste « ${rawRole} » inconnu, ligne ignorée.`);
      continue;
    }
    lines.push({ role, sides: [side(row, 'A'), side(row, 'B')] });
  }
  if (lines.length !== ROLES.length) {
    warnings.push(`Match ${matchNumber} : ${lines.length} ligne(s) au lieu de 5.`);
  }
  lines.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));

  // Les infos de match sont portées par la première ligne du groupe.
  return {
    matchNumber,
    winnerTeam: text(group.first.GAGNANT),
    durationSeconds: parseDuration(numeric(group.first['DURÉE'])),
    lines,
  };
}

function side(row: SheetRow, team: 'A' | 'B'): SheetSide {
  const get = (column: string): unknown =>
    team === 'A' ? row[column] : (row[`${column}.1`] ?? row[`${column}_1`]);
  return {
    team: text(get('EQUIPE')).slice(0, MAX_LENGTH.team),
    result: text(get('WIN/LOSE')).toUpperCase() === 'WIN' ? 'win' : 'loss',
    rawName: text(get('NOM DU JOUEUR')).slice(0, MAX_LENGTH.name),
    champion: text(get('CHAMPION')).slice(0, MAX_LENGTH.champion),
    kills: integer(get('K')),
    deaths: integer(get('D')),
    assists: integer(get('A')),
    gold: integer(get('GOLD')),
  };
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

/** Valeur numérique de la cellule ; 0 si elle est vide ou illisible. */
function numeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function integer(value: unknown): number {
  return Math.round(numeric(value));
}
