-- Reporting des jeux de société du bureau.
-- À coller dans Supabase > SQL Editor > Run (relançable sans perte de données).
--
-- Toutes les tables sont préfixées "bg_" : le script ne crée, ne modifie ni ne supprime
-- aucune table du dashboard (Users, Mirror, …).

begin;

-- Joueurs (collègues)
create table if not exists bg_players (
  id         bigint generated always as identity primary key,
  name       text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

-- Jeux de la ludothèque
create table if not exists bg_games (
  id          bigint generated always as identity primary key,
  name        text not null unique check (length(trim(name)) > 0),
  min_players smallint check (min_players > 0),
  max_players smallint check (max_players >= min_players),
  created_at  timestamptz not null default now()
);

-- Une partie jouée
create table if not exists bg_matches (
  id         bigint generated always as identity primary key,
  game_id    bigint not null references bg_games (id) on delete cascade,
  played_on  date not null default current_date,
  notes      text,
  created_at timestamptz not null default now()
);

-- Qui a joué la partie, et qui l'a gagnée (plusieurs gagnants possibles : jeux coop, égalités)
create table if not exists bg_match_players (
  match_id  bigint not null references bg_matches (id) on delete cascade,
  player_id bigint not null references bg_players (id) on delete cascade,
  is_winner boolean not null default false,
  primary key (match_id, player_id)
);

create index if not exists bg_matches_played_on_idx on bg_matches (played_on desc);
create index if not exists bg_match_players_player_idx on bg_match_players (player_id);

-- Accès depuis le navigateur avec la clé anon : outil interne, tout le monde peut lire
-- et écrire les tables bg_*, et seulement celles-là.
alter table bg_players       enable row level security;
alter table bg_games         enable row level security;
alter table bg_matches       enable row level security;
alter table bg_match_players enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bg_players', 'bg_games', 'bg_matches', 'bg_match_players'] loop
    execute format('drop policy if exists "bg anon full access" on %I', t);
    execute format(
      'create policy "bg anon full access" on %I for all to anon, authenticated using (true) with check (true)',
      t
    );
    execute format('grant select, insert, update, delete on %I to anon, authenticated', t);
  end loop;
end $$;

commit;
