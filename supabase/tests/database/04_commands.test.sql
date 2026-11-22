-- Les commandes : la clôture d'une édition (ADR 0013) et le journal des
-- commandes (ADR 0009), lisible par les seuls admins de l'organisation, en
-- ajout seul, et jamais écrit depuis le navigateur (ADR 0005).
begin;
select plan(12);

-- Structure
select has_column('public', 'editions', 'closed_at', 'une édition porte sa date de clôture');
select col_type_is('public', 'editions', 'closed_at', 'timestamp with time zone', 'la clôture est datée à l''instant près');
select col_is_null('public', 'editions', 'closed_at', 'une édition n''est pas clôturée par défaut');
select has_table('public', 'command_log', 'journal des commandes');
select columns_are('public', 'command_log',
  array['id', 'organization_id', 'command', 'actor_user_id', 'input', 'outcome', 'created_at'],
  'le journal a les colonnes de l''ADR 0009');

-- ── Données ──────────────────────────────────────────────────────────────────
insert into organizations (id, slug, name) values
  ('00000000-0000-0000-0000-00000000000a', 'essai-arrakis', 'Arrakis'),
  ('00000000-0000-0000-0000-00000000000b', 'essai-autre', 'Autre structure');
insert into auth.users (id, email) values
  ('50000000-0000-0000-0000-000000000001', 'admin@essai.local'),
  ('50000000-0000-0000-0000-000000000002', 'membre@essai.local');
insert into organization_members (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-000000000002', 'member');
insert into command_log (organization_id, command, actor_user_id, input, outcome) values
  ('00000000-0000-0000-0000-00000000000a', 'closeEdition', '50000000-0000-0000-0000-000000000001', '{}', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'closeEdition', '50000000-0000-0000-0000-000000000001', '{}', '{}');

-- ── Visiteur ─────────────────────────────────────────────────────────────────
set local role anon;
select throws_ok($$ select count(*) from command_log $$, '42501', null, 'un visiteur ne lit pas le journal');
select throws_ok(
  $$ insert into command_log (organization_id, command, actor_user_id, input, outcome)
     values ('00000000-0000-0000-0000-00000000000a', 'x', '50000000-0000-0000-0000-000000000001', '{}', '{}') $$,
  '42501', null, 'un visiteur n''écrit pas au journal');
reset role;

-- ── Membre ───────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "50000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from command_log), 0, 'un simple membre ne voit aucune ligne du journal');
reset role;

-- ── Admin ────────────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub": "50000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is(
  (select array_agg(distinct organization_id) from command_log),
  array['00000000-0000-0000-0000-00000000000a'::uuid],
  'un admin ne lit que le journal de son organisation');
select throws_ok(
  $$ insert into command_log (organization_id, command, actor_user_id, input, outcome)
     values ('00000000-0000-0000-0000-00000000000a', 'x', '50000000-0000-0000-0000-000000000001', '{}', '{}') $$,
  '42501', null, 'même un admin n''écrit pas au journal : seules les commandes le font');
select throws_ok($$ delete from command_log $$, '42501', null, 'le journal ne s''efface pas');
select throws_ok(
  $$ update editions set closed_at = now() $$,
  '42501', null, 'un admin ne clôture pas une édition directement : il passe par la commande');
reset role;

select * from finish();
rollback;
