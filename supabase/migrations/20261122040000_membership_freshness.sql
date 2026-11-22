-- Un rôle admin vient de Discord et ne vaut que 7 jours après sa dernière
-- vérification, la durée d'un jeton Discord (ADR 0030) : un ancien admin qui
-- ne repasse pas par la synchronisation perd ses droits de lui-même.

alter table organization_members
  add column synced_at timestamptz not null default now();

-- La règle, écrite une seule fois : les droits de la base et les commandes
-- (backend/src/infrastructure/commands.ts) l'appellent.
create function is_admin_of(org uuid, member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = member and m.role = 'admin'
      and m.synced_at > now() - interval '7 days'
  );
$$;

-- Personne ne sonde depuis l'API qui est admin d'où.
revoke execute on function is_admin_of(uuid, uuid) from public, anon, authenticated;

create or replace function is_org_admin(org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin_of(org, auth.uid());
$$;
