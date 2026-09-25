-- Département de chaque joueur : 3D, Design, Dev, Prod ou Office.
-- À coller dans Supabase > SQL Editor > Run. Relançable.

alter table bg_players
  add column if not exists department text
  check (department in ('3d', 'design', 'dev', 'prod', 'office'));

-- Répartition de départ (les managers sont rangés dans le pôle qu'ils dirigent)
update bg_players set department = d.department
from (values
  ('Guillaume BIÈCHE', '3d'),
  ('Florian ROUSSY', '3d'),
  ('Florian VECCHIONE', '3d'),
  ('Gabriel PICARD', 'design'),
  ('Tom LE MASSON BANNING LOVER', 'design'),
  ('Dorian LEGIEMBLE', 'design'),
  ('Clotilde LOURDIN', 'design'),
  ('Manon VILLERMET', 'design'),
  ('Mathilde DUSSOL DE AZEVEDO', 'design'),
  ('Nicolas GAUVIN', 'dev'),
  ('Valentin BOUTOURIA CORDIER', 'dev'),
  ('Alexis HUBERT', 'dev'),
  ('Axel PUECH', 'dev'),
  ('Axel LUZAYADIO NKODI', 'prod'),
  ('Imene KHOUADJA', 'prod'),
  ('Yves-Armand POKOSSY', 'prod'),
  ('Elisabeth EON', 'office'),
  ('Tina GUEDON', 'office'),
  ('Mélanie DETTORI-CAMPUS', 'office'),
  ('Karolina GEWORGJAN', 'office'),
  ('Maya RAKOTONIAINA', 'office'),
  ('Antoine VU', 'office'),
  ('Alain XERRI', 'office')
) as d (name, department)
where bg_players.name = d.name and bg_players.department is null;
