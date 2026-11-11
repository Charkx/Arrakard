-- ════════════════════════════════════════════════════════════════════════════
-- Une seule période de compétition : la saison (ADR 0014).
--
-- La saison reprend les dates et l'état que portait le split. Les éditions et
-- les notes par joueur se rattachent à une saison. La table des splits
-- disparaît.
--
-- Aucune donnée n'est reprise : aucune base v2 n'a encore reçu de lignes.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── La saison porte ses dates et son état ──────────────────────────────────

alter table seasons
  add column start_date date,
  add column end_date   date,
  add column status     text not null default 'open' check (status in ('open', 'closed'));

-- Une seule saison ouverte par organisation : c'est la saison active.
create unique index seasons_one_open_per_organization on seasons (organization_id) where status = 'open';

-- ─── Une édition se rattache à une saison, ou à aucune ──────────────────────
-- Sans saison, c'est une édition hors saison.

alter table editions
  drop column split_id,
  add column season_id uuid,
  add foreign key (organization_id, season_id) references seasons (organization_id, id);

-- ─── Les notes se rangent par saison ────────────────────────────────────────
-- Projection (ADR 0003) : elle se recalcule à partir des faits. On la recrée
-- donc au lieu de la transformer.

drop table player_split_ratings;

create table player_season_ratings (
  organization_id uuid not null,
  season_id       uuid not null,
  player_id       uuid not null,
  rating          int not null,
  impact          int not null,
  consistency     int not null,
  clutch          int not null,
  tier            text not null,
  games           int not null,
  wins            int not null,
  losses          int not null,
  winrate         int not null,
  kda             numeric not null,
  kills           int not null,
  deaths          int not null,
  assists         int not null,
  avg_gold        int not null,
  avg_gpm         int not null,
  recent_form     text not null,
  previous_rating int,
  primary key (season_id, player_id),
  foreign key (organization_id, season_id) references seasons (organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade
);

-- Supabase accorde tout par défaut à une nouvelle table : on repart de zéro,
-- puis on n'ouvre que la lecture.
alter table player_season_ratings enable row level security;
revoke all on player_season_ratings from anon, authenticated;
grant select on player_season_ratings to anon, authenticated;
create policy "lecture publique" on player_season_ratings for select using (true);

-- ─── Plus de splits ─────────────────────────────────────────────────────────
-- En dernier : plus rien ne les cite.

drop table splits;
