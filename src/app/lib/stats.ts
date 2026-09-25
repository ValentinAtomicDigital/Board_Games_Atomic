import type { Match, Player } from '../data/models';
import { DEPARTMENTS } from './departments';

export interface PlayerStats {
  player: Player;
  played: number;
  wins: number;
  /** Taux de victoire entre 0 et 1 */
  winRate: number;
  /** Victoires par rôle tenu (null = jeu sans rôle) */
  winsByRole: Map<string | null, number>;
}

/**
 * Classement des joueurs sur un ensemble de parties : victoires, puis taux de victoire,
 * puis nombre de parties. Les joueurs sans partie sont listés en dernier.
 */
export function leaderboard(players: Player[], matches: Match[]): PlayerStats[] {
  const byId = new Map<number, PlayerStats>(
    players.map((p) => [
      p.id,
      { player: p, played: 0, wins: 0, winRate: 0, winsByRole: new Map() },
    ]),
  );
  for (const match of matches) {
    for (const p of match.bg_match_players) {
      const row = byId.get(p.player_id);
      if (!row) continue;
      row.played++;
      if (!p.is_winner) continue;
      row.wins++;
      row.winsByRole.set(p.role, (row.winsByRole.get(p.role) ?? 0) + 1);
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

export interface DepartmentStats {
  department: (typeof DEPARTMENTS)[number];
  members: number;
  /** Participations : une partie à 3 joueurs du même pôle compte 3 fois */
  played: number;
  wins: number;
  winRate: number;
}

/** Taux de victoire de chaque département, du meilleur au moins bon ; ceux sans partie en dernier. */
export function departmentStats(players: Player[], matches: Match[]): DepartmentStats[] {
  const rows = leaderboard(players, matches);
  return DEPARTMENTS.map((department) => {
    const members = rows.filter((r) => r.player.department === department.id);
    const played = members.reduce((n, r) => n + r.played, 0);
    const wins = members.reduce((n, r) => n + r.wins, 0);
    return {
      department,
      members: members.length,
      played,
      wins,
      winRate: played ? wins / played : 0,
    };
  }).sort(
    (a, b) =>
      Number(b.played > 0) - Number(a.played > 0) || b.winRate - a.winRate || b.wins - a.wins,
  );
}
