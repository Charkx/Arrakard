-- Une édition archivée disparaît des pages publiques (ticket #49, ADR 0035).
--
-- Seule une édition sans match s'archive : ses notes ne bougent donc pas.
-- Elle sort aussi de la liste de l'espace admin : elle ne change plus.
alter table editions add column archived_at timestamptz;

drop policy "lecture publique" on editions;
create policy "lecture publique" on editions for select using (archived_at is null);

create or replace function admin_editions(org uuid)
returns table (
  edition_id    uuid,
  name          text,
  type          text,
  date          date,
  season_id     uuid,
  season_name   text,
  season_status text,
  closed_at     timestamptz,
  has_published_results boolean,
  has_published_final   boolean,
  draft_count   int
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_org_admin(org) then
    raise exception 'Réservé aux admins de l’organisation.' using errcode = '42501';
  end if;
  return query
  select
    e.id, e.name, e.type, e.date, e.season_id, s.name, s.status, e.closed_at,
    coalesce(m.published, false), coalesce(m.published_final, false), coalesce(m.drafts, 0)
  from public.editions e
  left join public.seasons s on s.id = e.season_id
  left join lateral (
    select
      bool_or(not x.draft) as published,
      bool_or(not x.draft and x.is_final) as published_final,
      (count(*) filter (where x.draft))::int as drafts
    from public.matches x
    where x.edition_id = e.id
  ) m on true
  where e.organization_id = org and e.archived_at is null;
end;
$$;

