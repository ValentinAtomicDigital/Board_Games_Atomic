# Board Games Atomic

Reporting des jeux de société joués au bureau : joueurs, jeux, parties et classement.

**Stack** : Angular 21 (composants standalone, signals), Supabase (même projet que
`Atomic_Dashboard_Vue`), Vitest. DA reprise du dashboard (Poppins, lavande, lime).

## Lancer le projet

```bash
pnpm install
cp ../Atomic_Dashboard_Vue/.env .env   # même .env que le dashboard
pnpm start                             # http://localhost:5190
```

`scripts/env.mjs` convertit le `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en
`src/environments/env.generated.ts` avant chaque `start`, `build` et `test`. Ces deux fichiers
ne sont pas versionnés.

## Base de données

À faire une fois : coller `supabase/001_board_games.sql` dans Supabase > SQL Editor > Run.
Le script est relançable et ne touche à aucune table existante : tout est préfixé `bg_`.

| Table              | Contenu                                                      |
| ------------------ | ------------------------------------------------------------ |
| `bg_players`       | les joueurs (nom unique)                                     |
| `bg_games`         | les jeux (nom unique, nombre de joueurs min/max optionnel)   |
| `bg_matches`       | une partie : jeu, date, note                                 |
| `bg_match_players` | qui a joué la partie et qui l'a gagnée (`is_winner`)         |

Supprimer un joueur le retire de ses parties ; supprimer un jeu supprime ses parties
(`on delete cascade`). Une partie peut avoir plusieurs gagnants (jeux coopératifs, égalités).

> La clé `anon` est publique : le script ouvre la lecture et l'écriture des tables `bg_*`
> à quiconque l'a. Suffisant pour un outil interne ; ajouter une authentification Supabase
> si l'app est exposée publiquement.

## Fonctionnalités

- **Classement** par semaine, mois ou depuis toujours, filtrable par jeu.
- **Parties** : liste de la période, enregistrement d'une partie (un clic = a joué,
  deux clics = a gagné), suppression.
- **Jeux** et **Joueurs** : ajout et suppression.

## Tests

```bash
pnpm test   # périodes (semaine ISO, bornes de mois) et calcul du classement
```
