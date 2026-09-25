import type { Game } from '../data/models';

/** Nombre de joueurs d'un jeu : « 4–8 », « 3 », « 2+ », « ≤ 6 » ou « — ». */
export function playerRange(g: Game): string {
  const { min_players: min, max_players: max } = g;
  if (min && max) return min === max ? `${min}` : `${min}–${max}`;
  return min ? `${min}+` : max ? `≤ ${max}` : '—';
}

/** Vrai si le nombre de joueurs respecte le min/max du jeu (bornes absentes = pas de limite). */
export function fitsPlayerCount(g: Game, count: number): boolean {
  return (!g.min_players || count >= g.min_players) && (!g.max_players || count <= g.max_players);
}
