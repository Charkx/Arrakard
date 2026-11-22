-- ════════════════════════════════════════════════════════════════════════════
-- Le statut d'une édition (ticket #38, ADR 0013).
--
-- Le statut n'est jamais saisi : la page le déduit, par la règle du domaine
-- (`editionStatus`), de la date, de la clôture et des résultats publiés. La vue
-- de l'en-tête donne donc la clôture et la présence d'un match final.
-- Jusqu'aux brouillons (ticket #43), tout match en base est publié : le
-- ticket des brouillons ne comptera ici que les matchs publiés.
-- ════════════════════════════════════════════════════════════════════════════

-- Deux colonnes, à la fin : les colonnes existantes ne bougent pas.
create or replace view edition_page_view with (security_invoker = true) as
select
  e.organization_id,
  e.id as edition_id,
  e.name,
  e.type,
  e.date,
  e.display_number,
  e.location,
  e.url,
  e.description,
  e.arrakis_won,
  e.season_id,
  s.name as season_name,
  mvp.nickname as event_mvp_nickname,
  (select count(*)::int from matches m where m.edition_id = e.id) as match_count,
  e.closed_at,
  exists (select 1 from matches m where m.edition_id = e.id and m.is_final) as has_final
from editions e
left join seasons s on s.id = e.season_id
left join players mvp on mvp.id = e.event_mvp_player_id;
