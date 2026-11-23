-- Les décisions d'import (ticket #46, ADR 0039).
--
-- Les joueurs tels que l'import les voit : pseudo, alias, équipe et statut
-- actuels. Le site s'en sert pour montrer à l'admin les cas à décider, et le
-- serveur pour décider ; tout y est déjà public. L'empreinte d'un fichier
-- importé va dans `editions.source_file_hash`, qui existe depuis la v1.

create view import_directory with (security_invoker = true) as
select
  p.organization_id,
  p.id as player_id,
  p.nickname,
  p.archived,
  coalesce(array_agg(a.alias order by a.alias) filter (where a.alias is not null), '{}') as aliases,
  t.tag as team_tag,
  m.status
from players p
left join player_aliases a on a.organization_id = p.organization_id and a.player_id = p.id
left join team_memberships m
  on m.organization_id = p.organization_id and m.player_id = p.id and m.left_on is null
left join teams t on t.organization_id = m.organization_id and t.id = m.team_id
where p.merged_into is null
group by p.organization_id, p.id, t.tag, m.status;

revoke all on import_directory from anon, authenticated;
grant select on import_directory to anon, authenticated;
