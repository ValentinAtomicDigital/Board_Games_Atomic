-- Rôles / camps : certains jeux (Loup-Garou, Time Bomb) se jouent en équipes.
-- À coller dans Supabase > SQL Editor > Run. Relançable, ne supprime rien.

-- Rôles proposés pour un jeu, dans l'ordre d'affichage. Le premier est le rôle par défaut
-- (le plus fréquent : Villageois, Gentil). Vide = jeu sans rôles.
alter table bg_games add column if not exists roles text[];

-- Rôle tenu par un joueur dans une partie
alter table bg_match_players add column if not exists role text;

update bg_games set roles = array['Villageois', 'Loup-Garou', 'Solitaire']
where name = 'Loup-Garou' and roles is null;

update bg_games set roles = array['Gentil', 'Méchant']
where name = 'Time Bomb' and roles is null;
