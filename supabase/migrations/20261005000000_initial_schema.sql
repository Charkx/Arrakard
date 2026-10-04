-- ════════════════════════════════════════════════════════════════════════════
-- Arrakis v2 — schéma initial
--
-- ADR 0003 : faits (saisis par les commandes) et projections (recalculées).
-- ADR 0005 : aucune écriture directe des clients, sauf inscriptions en
--            libre-service ; tout le reste passe par les commandes.
-- ADR 0008 : chaque table porte un organization_id ; les clés étrangères sont
--            composites (organization_id, id) pour qu'aucune ligne ne puisse
--            référencer une ligne d'une autre organisation.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Organisations et adhésions ─────────────────────────────────────────────

create table organizations (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name                  text not null,
  -- Configuration propre à la structure (ADR 0008).
  discord_guild_id      text,
  discord_admin_role_id text,
  rating_rules          text not null default 'v1' check (rating_rules in ('v1', 'e1_e2')),
  created_at            timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('admin', 'member')),
  primary key (organization_id, user_id)
);

-- ─── Calendrier ─────────────────────────────────────────────────────────────

create table seasons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name            text not null,
  year            int not null,
  unique (organization_id, id),
  unique (organization_id, name)
);

create table splits (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  season_id       uuid not null,
  number          int not null check (number > 0),
  name            text not null,
  start_date      date,
  end_date        date,
  status          text not null default 'open' check (status in ('open', 'closed')),
  unique (organization_id, id),
  unique (organization_id, season_id, number),
  foreign key (organization_id, season_id) references seasons (organization_id, id) on delete cascade
);

-- Un seul split ouvert par organisation : c'est le split actif.
create unique index splits_one_open_per_organization on splits (organization_id) where status = 'open';

-- ─── Équipes et joueurs ─────────────────────────────────────────────────────

create table teams (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  tag             text not null check (length(tag) between 2 and 16),
  name            text not null,
  divisions       text[] not null default '{}' check (divisions <@ array['div1', 'div2']),
  logo_url        text,
  archived_at     timestamptz,
  unique (organization_id, id),
  unique (organization_id, tag)
);

create table players (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  nickname        text not null check (length(nickname) between 1 and 80),
  archived        boolean not null default false,
  merged_into     uuid,
  discord_user_id text,
  created_at      timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, discord_user_id),
  foreign key (organization_id, merged_into) references players (organization_id, id)
);

-- Graphies rencontrées à l'import (ADR 0004). Pas uniques : les homonymes existent.
create table player_aliases (
  organization_id uuid not null,
  player_id       uuid not null,
  alias           text not null check (alias = lower(alias)),
  primary key (organization_id, player_id, alias),
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade
);
create index player_aliases_lookup on player_aliases (organization_id, alias);

-- Historique des équipes : une ligne par passage, le passage en cours a left_on null.
create table team_memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  player_id       uuid not null,
  team_id         uuid not null,
  status          text not null check (status in ('starter', 'sub', 'coach')),
  joined_on       date not null,
  left_on         date check (left_on is null or left_on >= joined_on),
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade,
  foreign key (organization_id, team_id) references teams (organization_id, id) on delete cascade
);
create unique index team_memberships_one_current on team_memberships (player_id) where left_on is null;

-- ─── Éditions, matchs, performances ─────────────────────────────────────────

create table editions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references organizations (id) on delete cascade,
  name                   text not null,
  type                   text not null check (type in (
                           'league_div1', 'league_div2', 'inhouse', 'tournament',
                           'lan', 'external_lan', 'external_event')),
  date                   date not null,
  split_id               uuid,
  prestige               text not null default 'normal' check (prestige in ('normal', 'premium', 'championship')),
  weight_override        numeric check (weight_override > 0),
  weight_override_reason text,
  event_mvp_player_id    uuid,
  scoring                jsonb,
  display_number         int,
  location               text,
  url                    text,
  description            text,
  arrakis_won            boolean,
  source_file_hash       text,
  -- Contrôle de concurrence optimiste (ADR 0005).
  version                int not null default 1,
  created_at             timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, source_file_hash),
  -- E1 (ADR 0007) : une exception de multiplicateur est toujours justifiée.
  check ((weight_override is null) = (weight_override_reason is null)),
  foreign key (organization_id, split_id) references splits (organization_id, id),
  foreign key (organization_id, event_mvp_player_id) references players (organization_id, id)
);

create table matches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  edition_id       uuid not null,
  match_number     int not null check (match_number > 0),
  winner_team      text not null,
  duration_seconds int not null check (duration_seconds >= 0),
  mvp_player_id    uuid,
  matchday         int,
  is_final         boolean not null default false,
  unique (organization_id, id),
  unique (edition_id, match_number),
  foreign key (organization_id, edition_id) references editions (organization_id, id) on delete cascade,
  foreign key (organization_id, mvp_player_id) references players (organization_id, id)
);

create table performances (
  organization_id uuid not null,
  match_id        uuid not null,
  line            smallint not null check (line between 0 and 4),
  side            char(1) not null check (side in ('A', 'B')),
  player_id       uuid not null,
  team            text not null,
  role            text not null check (role in ('TOP', 'JGL', 'MID', 'ADC', 'SUP')),
  champion        text not null,
  result          text not null check (result in ('win', 'loss')),
  kills           int not null check (kills >= 0),
  deaths          int not null check (deaths >= 0),
  assists         int not null check (assists >= 0),
  gold            int not null check (gold >= 0),
  primary key (match_id, line, side),
  -- Un joueur une seule fois par match (cohérent avec la règle de fusion).
  unique (match_id, player_id),
  foreign key (organization_id, match_id) references matches (organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references players (organization_id, id)
);
create index performances_player on performances (organization_id, player_id);

-- Participants des événements externes, qui n'ont pas de matchs.
create table edition_participants (
  organization_id uuid not null,
  edition_id      uuid not null,
  player_id       uuid not null,
  primary key (edition_id, player_id),
  foreign key (organization_id, edition_id) references editions (organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade
);

-- ─── Joueurs connectés ──────────────────────────────────────────────────────

create table card_customizations (
  organization_id uuid not null,
  player_id       uuid primary key,
  title           text,
  selected_badges text[] not null default '{}' check (cardinality(selected_badges) <= 3),
  background      text,
  riot_accounts   jsonb not null default '[]',
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade
);

create table registrations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  edition_id      uuid not null,
  discord_user_id text not null,
  pseudo          text not null check (length(pseudo) between 1 and 80),
  role            text not null check (role in ('TOP', 'JGL', 'MID', 'ADC', 'SUP', 'FILL')),
  secondary_role  text check (secondary_role in ('TOP', 'JGL', 'MID', 'ADC', 'SUP', 'FILL')),
  rank            text check (length(rank) <= 40),
  opgg            text check (length(opgg) <= 200),
  alt_riot_id     text check (length(alt_riot_id) <= 40),
  speaks_english  boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (edition_id, discord_user_id),
  foreign key (organization_id, edition_id) references editions (organization_id, id) on delete cascade
);

-- ─── Projections (écrites uniquement par le recalcul, ADR 0003) ─────────────

create table player_split_ratings (
  organization_id uuid not null,
  split_id        uuid not null,
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
  primary key (split_id, player_id),
  foreign key (organization_id, split_id) references splits (organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade
);

create table player_edition_history (
  organization_id uuid not null,
  edition_id      uuid not null,
  player_id       uuid not null,
  career_rating   int not null,
  result          text not null,
  games           int not null,
  wins            int not null,
  kda             numeric not null,
  kills           int not null,
  deaths          int not null,
  assists         int not null,
  primary key (edition_id, player_id),
  foreign key (organization_id, edition_id) references editions (organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade
);

create table edition_standings (
  organization_id uuid not null,
  edition_id      uuid not null,
  player_id       uuid not null,
  rank            int not null,
  team            text not null,
  role            text not null,
  champion        text not null,
  games           int not null,
  wins            int not null,
  losses          int not null,
  kills           int not null,
  deaths          int not null,
  assists         int not null,
  is_event_mvp    boolean not null,
  match_mvp_count int not null,
  result_points   int not null,
  stat_points     int not null,
  mvp_points      int not null,
  points          int not null,
  primary key (edition_id, player_id),
  foreign key (organization_id, edition_id) references editions (organization_id, id) on delete cascade,
  foreign key (organization_id, player_id) references players (organization_id, id) on delete cascade
);

-- ─── Fonctions d'autorisation ───────────────────────────────────────────────

-- Snowflake Discord de l'utilisateur, lu depuis auth.identities (non
-- modifiable par l'utilisateur, contrairement à user_metadata : cf. v1 0018).
create function auth_discord_user_id() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(i.identity_data ->> 'provider_id', i.identity_data ->> 'sub')
  from auth.identities i
  where i.user_id = auth.uid() and i.provider = 'discord'
  limit 1;
$$;

-- L'utilisateur connecté est-il admin de cette organisation ? (ADR 0008)
create function is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- ─── Droits ─────────────────────────────────────────────────────────────────
-- Par défaut, Supabase accorde tout à anon et authenticated : on repart de zéro.

revoke all on all tables in schema public from anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations', 'organization_members', 'seasons', 'splits', 'teams',
    'players', 'player_aliases', 'team_memberships', 'editions', 'matches',
    'performances', 'edition_participants', 'card_customizations',
    'registrations', 'player_split_ratings', 'player_edition_history',
    'edition_standings'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;

  -- Lecture publique : le site d'une structure est public.
  foreach t in array array[
    'organizations', 'seasons', 'splits', 'teams', 'players', 'player_aliases',
    'team_memberships', 'editions', 'matches', 'performances',
    'edition_participants', 'card_customizations', 'player_split_ratings',
    'player_edition_history', 'edition_standings'
  ] loop
    execute format('grant select on %I to anon, authenticated', t);
    execute format('create policy "lecture publique" on %I for select using (true)', t);
  end loop;
end $$;

-- Adhésions : chacun ne voit que les siennes.
grant select on organization_members to authenticated;
create policy "ses propres adhésions" on organization_members
  for select to authenticated using (user_id = auth.uid());

-- Inscriptions : liste publique sans l'identifiant Discord.
grant select (id, organization_id, edition_id, pseudo, role, secondary_role, rank, opgg, created_at)
  on registrations to anon, authenticated;
create policy "lecture publique" on registrations for select using (true);

-- Libre-service : un joueur connecté gère sa propre inscription.
grant insert (organization_id, edition_id, discord_user_id, pseudo, role, secondary_role, rank, opgg, alt_riot_id, speaks_english),
      update (pseudo, role, secondary_role, rank, opgg, alt_riot_id, speaks_english),
      delete
  on registrations to authenticated;
create policy "s'inscrire soi-même" on registrations for insert to authenticated
  with check (discord_user_id = auth_discord_user_id());
create policy "modifier son inscription" on registrations for update to authenticated
  using (discord_user_id = auth_discord_user_id())
  with check (discord_user_id = auth_discord_user_id());
create policy "annuler son inscription" on registrations for delete to authenticated
  using (discord_user_id = auth_discord_user_id());
