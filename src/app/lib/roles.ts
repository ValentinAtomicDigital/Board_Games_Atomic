import type { Game, Match } from '../data/models';
import type { Tone } from './colors';

/** Couleurs des rôles, dans l'ordre du jeu : bleu pour Gentil/Villageois, rouge pour Méchant/Loup-Garou… */
const ROLE_TONES: readonly Tone[] = ['blue', 'red', 'violet', 'amber', 'green'];

export function roleTone(index: number): Tone {
  return index < 0 ? 'slate' : ROLE_TONES[index % ROLE_TONES.length];
}

/** Couleur d'un rôle d'après sa place dans le premier jeu qui le propose. */
export function roleToneIn(games: Game[], role: string): Tone {
  for (const g of games) {
    const index = g.roles?.indexOf(role) ?? -1;
    if (index >= 0) return roleTone(index);
  }
  return 'slate';
}

/** Tous les rôles des jeux donnés, sans doublon, dans l'ordre des jeux. */
export function allRoles(games: Game[]): string[] {
  return [...new Set(games.flatMap((g) => g.roles ?? []))];
}

/** Ne garde, dans chaque partie, que les joueurs qui tenaient ce rôle. */
export function withRole(matches: Match[], role: string): Match[] {
  return matches
    .map((m) => ({ ...m, bg_match_players: m.bg_match_players.filter((p) => p.role === role) }))
    .filter((m) => m.bg_match_players.length);
}

export interface RoleStats {
  role: string;
  played: number;
  wins: number;
  winRate: number;
}

/** Taux de victoire de chaque rôle (participations tenues dans ce rôle), dans l'ordre donné. */
export function roleStats(matches: Match[], roles: string[]): RoleStats[] {
  return roles.map((role) => {
    const seats = matches.flatMap((m) => m.bg_match_players.filter((p) => p.role === role));
    const wins = seats.filter((p) => p.is_winner).length;
    return { role, played: seats.length, wins, winRate: seats.length ? wins / seats.length : 0 };
  });
}
