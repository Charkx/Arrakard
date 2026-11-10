/**
 * Extraction du golden master v1 (ADR 0006).
 *
 * Lit les matchs de la production v1 (lecture publique Supabase, comme le
 * fait le site v1), calcule pour chaque split et chaque joueur la note et les
 * statistiques AVEC LE CODE V1, puis écrit une fixture anonymisée que le
 * domaine v2 doit reproduire à l'identique.
 *
 * Usage (depuis la racine du dépôt), au choix :
 *   V1_REPO=../arrakis-cards SUPABASE_URL=… SUPABASE_ANON_KEY=… \
 *     pnpm golden-master:extract
 *   V1_REPO=../arrakis-cards V1_EXPORT=../arrakis-cards/localStorage_export.json \
 *     pnpm golden-master:extract
 *
 *   V1_REPO=../arrakis-cards V1_BACKUP=../backups/v1-rest-2026-10-05 \
 *     pnpm golden-master:extract
 *
 * V1_EXPORT : export localStorage de la v1 (clé `arrakis_editions`), lu dans
 * l'ordre stocké, comme le faisait la v1 en mode local.
 * V1_BACKUP : sauvegarde REST (un fichier JSON par table), lue dans l'ordre
 * de l'export, qui est celui que la v1 voit.
 *
 * V1_REFERENCE=<fichier> : au lieu du golden master anonymisé, écrit une
 * référence NON anonymisée (clés de joueur réelles) pour vérifier la
 * migration (packages/migrate-v1). Données réelles : jamais dans git
 * (`*.local.json` est ignoré).
 *
 * Les données sont lues dans l'ordre où la v1 les lit (select paginé sans
 * ORDER BY) : la forme récente et le départage du rôle dominant en dépendent
 * (anomalies A5 et A6).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUTPUT = resolve(import.meta.dirname, '../../packages/domain/src/golden-master/v1.json');

const { V1_REPO, V1_EXPORT, V1_BACKUP, V1_REFERENCE, SUPABASE_URL, SUPABASE_ANON_KEY } =
  process.env;
if (!V1_REPO || (!V1_EXPORT && !V1_BACKUP && (!SUPABASE_URL || !SUPABASE_ANON_KEY))) {
  throw new Error(
    'V1_REPO, et V1_EXPORT, V1_BACKUP ou SUPABASE_URL + SUPABASE_ANON_KEY, sont requis.',
  );
}

type Row = Record<string, unknown>;

// ── Code v1, importé tel quel ───────────────────────────────────────────────
const v1 = resolve(V1_REPO);
const { computePlayerStatsFromMatches, normalizedPlayerName } = (await import(
  `${v1}/src/lib/rating.ts`
)) as {
  computePlayerStatsFromMatches: (
    name: string,
    matches: V1Match[],
    weightOf: (m: V1Match) => number,
  ) => V1Stats;
  normalizedPlayerName: (name: string) => string;
};
const { rowToEdition, rowToMatch, rowToMatchRow } = (await import(
  `${v1}/src/lib/repos/supabase/mappers.ts`
)) as {
  rowToEdition: (r: Row, matches: V1Match[]) => V1Edition;
  rowToMatch: (r: Row, rows: V1MatchRow[]) => V1Match;
  rowToMatchRow: (r: Row) => V1MatchRow;
};
const { PRESTIGE_MULTIPLIER } = (await import(`${v1}/src/types/index.ts`)) as {
  PRESTIGE_MULTIPLIER: Record<string, number>;
};

interface V1Perf {
  playerName: string;
  role: string;
  result: 'WIN' | 'LOSE';
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  gpm: number;
}
interface V1MatchRow {
  teamA: V1Perf;
  teamB: V1Perf;
}
interface V1Match {
  id: string;
  editionId: string;
  matchNumber: number;
  rows: V1MatchRow[];
}
interface V1Edition {
  id: string;
  prestige: string;
  splitId?: string;
  matches: V1Match[];
}
interface V1Stats {
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kda: number;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  avgGold: number;
  avgGPM: number;
  impact: number;
  consistance: number;
  clutch: number;
  rating: number;
  tier: string;
  recentForm: string;
}

// ── Lecture identique à la v1 (fetchAll : pages de 1000, sans tri) ─────────
async function fetchAll(table: string): Promise<Row[]> {
  const url = SUPABASE_URL ?? '';
  const key = SUPABASE_ANON_KEY ?? '';
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + 999}`,
      },
    });
    if (!res.ok) throw new Error(`${table} : HTTP ${res.status}`);
    const page = (await res.json()) as Row[];
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

const editions = V1_EXPORT
  ? readEditionsFromExport(V1_EXPORT)
  : V1_BACKUP
    ? readEditionsFromBackup(V1_BACKUP)
    : await readEditionsFromSupabase();

function readEditionsFromBackup(dir: string): V1Edition[] {
  const table = (name: string) =>
    JSON.parse(readFileSync(resolve(dir, `${name}.json`), 'utf8')) as Row[];
  return buildEditions(table('editions'), table('matches'), table('match_rows'));
}

function readEditionsFromExport(path: string): V1Edition[] {
  const data = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const raw = data.arrakis_editions;
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as V1Edition[];
}

// Reconstruction de l'arbre exactement comme editionsRepo.getAll() en v1.
async function readEditionsFromSupabase(): Promise<V1Edition[]> {
  const [editionRows, matchRows, rowRows] = await Promise.all([
    fetchAll('editions'),
    fetchAll('matches'),
    fetchAll('match_rows'),
  ]);
  return buildEditions(editionRows, matchRows, rowRows);
}

function buildEditions(editionRows: Row[], matchRows: Row[], rowRows: Row[]): V1Edition[] {
  const rowsByMatch = new Map<string, V1MatchRow[]>();
  for (const r of rowRows) {
    const key = r.match_id as string;
    rowsByMatch.set(key, [...(rowsByMatch.get(key) ?? []), rowToMatchRow(r)]);
  }
  const matchesByEdition = new Map<string, V1Match[]>();
  for (const m of matchRows) {
    const key = m.edition_id as string;
    const match = rowToMatch(m, rowsByMatch.get(m.id as string) ?? []);
    matchesByEdition.set(key, [...(matchesByEdition.get(key) ?? []), match]);
  }
  for (const matches of matchesByEdition.values()) {
    matches.sort((a, b) => a.matchNumber - b.matchNumber);
  }
  return editionRows.map((e) => rowToEdition(e, matchesByEdition.get(e.id as string) ?? []));
}

// ── Anonymisation : un identifiant stable par joueur (nom normalisé v1) ────
const anonymous = new Map<string, string>();
const anonymize = (key: string): string => {
  const known = anonymous.get(key);
  if (known) return known;
  const id = `p${String(anonymous.size + 1).padStart(3, '0')}`;
  anonymous.set(key, id);
  return id;
};

// ── Un cas par split : performances (ordre v1) + résultats v1 attendus ─────
const weightOf = (m: V1Match) => {
  const edition = editions.find((e) => e.id === m.editionId);
  return edition ? (PRESTIGE_MULTIPLIER[edition.prestige] ?? 1) : 1;
};
const splitIds = [
  ...new Set(editions.map((e) => e.splitId).filter((s): s is string => !!s)),
].sort();

const splits = splitIds.map((splitId, index) => {
  const matches = editions.filter((e) => e.splitId === splitId).flatMap((e) => e.matches);

  const performances: unknown[] = [];
  const nameByKey = new Map<string, string>();
  for (const match of matches) {
    for (const row of match.rows) {
      for (const p of [row.teamA, row.teamB]) {
        const key = normalizedPlayerName(p.playerName);
        if (!key) continue;
        nameByKey.set(key, nameByKey.get(key) ?? p.playerName);
        performances.push({
          player: anonymize(key),
          role: p.role,
          result: p.result === 'WIN' ? 'win' : 'loss',
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          gold: p.gold,
          gpm: p.gpm,
          weight: weightOf(match),
        });
      }
    }
  }

  const expected: Record<string, unknown> = {};
  for (const [key, name] of nameByKey) {
    const s = computePlayerStatsFromMatches(name, matches, weightOf);
    expected[anonymize(key)] = {
      rating: {
        rating: s.rating,
        impact: s.impact,
        consistency: s.consistance,
        clutch: s.clutch,
        tier: s.tier,
      },
      stats: {
        games: s.games,
        wins: s.wins,
        losses: s.losses,
        winrate: s.winrate,
        kda: s.kda,
        kills: s.totalKills,
        deaths: s.totalDeaths,
        assists: s.totalAssists,
        avgGold: s.avgGold,
        avgGpm: s.avgGPM,
        recentForm: s.recentForm,
      },
    };
  }

  return { split: `split-${index + 1}`, performances, expected };
});

if (V1_REFERENCE) {
  const reference = splitIds.map((splitId) => {
    const matches = editions.filter((e) => e.splitId === splitId).flatMap((e) => e.matches);
    const keys = new Map<string, string>();
    for (const row of matches.flatMap((m) => m.rows)) {
      for (const p of [row.teamA, row.teamB]) {
        const key = normalizedPlayerName(p.playerName);
        if (key) keys.set(key, keys.get(key) ?? p.playerName);
      }
    }
    const players = [...keys].map(([key, name]) => {
      const s = computePlayerStatsFromMatches(name, matches, weightOf);
      return {
        key,
        rating: s.rating,
        impact: s.impact,
        consistency: s.consistance,
        clutch: s.clutch,
        games: s.games,
        wins: s.wins,
        losses: s.losses,
      };
    });
    return { splitId, players };
  });
  writeFileSync(resolve(V1_REFERENCE), JSON.stringify({ splits: reference }) + '\n');
  console.log(`Référence v1 non anonymisée : ${reference.length} splits → ${V1_REFERENCE}`);
  process.exit(0);
}

writeFileSync(
  OUTPUT,
  JSON.stringify({ formula: 'v1', extractedAt: new Date().toISOString().slice(0, 10), splits }) +
    '\n',
);
console.log(
  `Golden master : ${splits.length} splits, ${anonymous.size} joueurs, ` +
    `${splits.reduce((n, s) => n + s.performances.length, 0)} performances → ${OUTPUT}`,
);
