-- ════════════════════════════════════════════════════════════════════════════
-- La première commande : clôturer une édition (cas d'usage A3, ticket #39).
--
-- La clôture est un fait daté (ADR 0013) : une édition que les faits ne
-- suffisent pas à terminer, une ligue sans finale ou un tournoi interrompu.
-- Chaque commande validée laisse une ligne au journal des commandes (ADR 0009).
-- ════════════════════════════════════════════════════════════════════════════

alter table editions add column closed_at timestamptz;

create table command_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  -- Nom métier de la commande : closeEdition, importEdition…
  command         text not null,
  actor_user_id   uuid not null references auth.users (id),
  -- L'entrée validée par le contrat, et le résumé de ce qui a été écrit.
  input           jsonb not null,
  outcome         jsonb not null,
  created_at      timestamptz not null default now()
);
create index command_log_organization_created_at on command_log (organization_id, created_at);

-- Lisible par les admins de l'organisation, en ajout seul : aucun rôle du
-- navigateur ne l'écrit, seules les commandes le font, par une connexion directe.
alter table command_log enable row level security;
revoke all on command_log from anon, authenticated;
grant select on command_log to authenticated;
create policy "admins de l'organisation" on command_log
  for select to authenticated using (is_org_admin(organization_id));
