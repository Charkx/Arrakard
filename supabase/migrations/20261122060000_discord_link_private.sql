-- Le compte Discord lié à une carte n'est plus public (ticket #52, ADR 0034).
--
-- Comme celui des inscrits (`registrations`), il ne sert qu'aux admins : le
-- public lit les joueurs sans cette colonne, et l'espace admin lit les profils
-- par une fonction réservée (ADR 0031).
revoke select on players from anon, authenticated;
grant select (id, organization_id, nickname, archived, merged_into, created_at)
  on players to anon, authenticated;

create function admin_profiles(org uuid)
returns table (player_id uuid, nickname text, discord_user_id text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_org_admin(org) then
    raise exception 'Réservé aux admins de l’organisation.' using errcode = '42501';
  end if;
  return query
  select p.id, p.nickname, p.discord_user_id
  from public.players p
  where p.organization_id = org and p.merged_into is null
  order by p.nickname, p.id;
end;
$$;

revoke execute on function admin_profiles(uuid) from public, anon;
grant execute on function admin_profiles(uuid) to authenticated;
