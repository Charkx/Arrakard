-- La liste des éditions de l'espace admin (ticket #42, ADR 0031).
--
-- Elle compte les brouillons, que le public ne voit pas (ADR 0028) : c'est une
-- fonction aux droits de son propriétaire, qui refuse quiconque n'est pas admin
-- de l'organisation (`is_org_admin`, fraîcheur comprise, ADR 0030). Les tables
-- et les vues, elles, cachent toujours les brouillons. Le statut de chaque
-- édition se déduit à l'affichage (ADR 0027).
create function admin_editions(org uuid)
returns table (
  edition_id    uuid,
  name          text,
  type          text,
  date          date,
  season_id     uuid,
  season_name   text,
  season_status text,
  closed_at     timestamptz,
  has_results   boolean,
  has_final     boolean,
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
    exists (select 1 from public.matches m where m.edition_id = e.id and not m.draft),
    exists (select 1 from public.matches m where m.edition_id = e.id and not m.draft and m.is_final),
    (select count(*)::int from public.matches m where m.edition_id = e.id and m.draft)
  from public.editions e
  left join public.seasons s on s.id = e.season_id
  where e.organization_id = org;
end;
$$;

revoke execute on function admin_editions(uuid) from public, anon;
grant execute on function admin_editions(uuid) to authenticated;
