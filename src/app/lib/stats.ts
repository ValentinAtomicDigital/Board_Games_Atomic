import type { Match, Player } from '../data/models';

export interface PlayerStats {
  player: Player;
  played: number;
  wins: number;
  /** Taux de victoire entre 0 et 1 */
  winRate: number;
}

/**
 * Classement des joueurs sur un ensemble de parties : victoires, puis taux de victoire,
 * puis nombre de parties. Les joueurs sans partie sont listés en dernier.
 */
export function leaderboard(players: Player[], matches: Match[]): PlayerStats[] {
  const byId = new Map(players.map((p) => [p.id, { player: p, played: 0, wins: 0, winRate: 0 }]));
  for (const match of matches) {
    for (const p of match.bg_match_players) {
      const row = byId.get(p.player_id);
      if (!row) continue;
      row.played++;
      if (p.is_winner) row.wins++;
    }
  }
  const rows = [...byId.values()];
  for (const row of rows) row.winRate = row.played ? row.wins / row.played : 0;
  return rows.sort(
    (a, b) =>
      Number(b.played > 0) - Number(a.played > 0) ||
      b.wins - a.wins ||
      b.winRate - a.winRate ||
      b.played - a.played ||
      a.player.name.localeCompare(b.player.name),
  );
}

/** Nombre de parties jouées par jeu. */
export function playsByGame(matches: Match[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const m of matches) counts.set(m.game_id, (counts.get(m.game_id) ?? 0) + 1);
  return counts;
}
