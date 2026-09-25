-- Joueurs et jeux de départ du bureau Atomic.
-- À coller dans Supabase > SQL Editor > Run. Relançable : les noms déjà présents sont ignorés.

insert into bg_players (name) values
  ('Guillaume BIÈCHE'),
  ('Valentin BOUTOURIA CORDIER'),
  ('Mélanie DETTORI-CAMPUS'),
  ('Mathilde DUSSOL DE AZEVEDO'),
  ('Elisabeth EON'),
  ('Nicolas GAUVIN'),
  ('Karolina GEWORGJAN'),
  ('Tina GUEDON'),
  ('Alexis HUBERT'),
  ('Imene KHOUADJA'),
  ('Tom LE MASSON BANNING LOVER'),
  ('Dorian LEGIEMBLE'),
  ('Clotilde LOURDIN'),
  ('Axel LUZAYADIO NKODI'),
  ('Gabriel PICARD'),
  ('Yves-Armand POKOSSY'),
  ('Axel PUECH'),
  ('Maya RAKOTONIAINA'),
  ('Florian ROUSSY'),
  ('Florian VECCHIONE'),
  ('Manon VILLERMET'),
  ('Antoine VU'),
  ('Alain XERRI')
on conflict (name) do nothing;

insert into bg_games (name, min_players, max_players) values
  ('Time Bomb', 4, 8),
  ('The Gang', 3, 6),
  ('Perudo', 2, 6),
  ('Loup-Garou', 8, 18)
on conflict (name) do nothing;
