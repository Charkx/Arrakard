-- ════════════════════════════════════════════════════════════════════════════
-- Brouillons et publications (ADR 0012, ADR 0028, ticket #43).
--
-- Un match saisi ou importé est d'abord un brouillon : enregistré, mais
-- invisible du public. Une commande publie les brouillons d'une édition, et
-- chaque publication est un fait : quelle édition, quels matchs, quand, par qui.
-- ════════════════════════════════════════════════════════════════════════════

-- Par défaut publié : les matchs migrés de la v1 le restent.
alter table matches add column draft boolean not null default false;
create index matches_drafts on matches (edition_id) where draft;

create table publications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  edition_id      uuid not null,
  published_by    uuid not null references auth.users (id),
  published_at    timestamptz not null default now(),
  -- Les matchs que cette publication a rendus publics.
  match_ids       uuid[] not null,
  foreign key (organization_id, edition_id) references editions (organization_id, id) on delete cascade
);

alter table publications enable row level security;
revoke all on publications from anon, authenticated;
-- Publique, sauf l'auteur : un identifiant de connexion ne se montre pas au public.
grant select (id, organization_id, edition_id, published_at, match_ids) on publications to anon, authenticated;
create policy "lecture publique" on publications for select using (true);

-- Le public ne voit que les matchs publiés, et leurs performances. Les vues
-- sont lues avec les droits du visiteur (security_invoker) : elles ignorent
-- donc les brouillons sans être réécrites. Les commandes, elles, passent par
-- une connexion directe (ADR 0023).
drop policy "lecture publique" on matches;
create policy "matchs publiés" on matches for select using (not draft);

drop policy "lecture publique" on performances;
create policy "performances des matchs publiés" on performances for select using (
  exists (select 1 from matches m where m.id = performances.match_id and not m.draft)
);
