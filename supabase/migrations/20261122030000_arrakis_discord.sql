-- Le serveur Discord d'Arrakis et son rôle admin (Q18, ADR 0008, ADR 0030).
-- L'organisation d'essai a la même configuration (ADR 0021). Les organisations
-- créées plus tard par l'outil de migration les reçoivent de lui.
update organizations
set discord_guild_id = '1031291061936595015',
    discord_admin_role_id = '1514024774131519638'
where slug in ('arrakis', 'arrakis-essai') and discord_guild_id is null;
