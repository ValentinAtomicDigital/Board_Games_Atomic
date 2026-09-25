import type { Match } from '../data/models';
import { leaderboard, playsByGame } from './stats';

const players = [
  { id: 1, name: 'Alex', department: null },
  { id: 2, name: 'Sam', department: null },
  { id: 3, name: 'Charlie', department: null },
];

const match = (id: number, gameId: number, winners: number[], losers: number[]): Match => ({
  id,
  game_id: gameId,
  played_on: '2026-09-25',
  notes: null,
  bg_match_players: [
    ...winners.map((player_id) => ({ player_id, is_winner: true })),
    ...losers.map((player_id) => ({ player_id, is_winner: false })),
  ],
});

describe('classement', () => {
  it('compte parties, victoires et taux de victoire', () => {
    const rows = leaderboard(players, [match(1, 1, [1], [2]), match(2, 1, [1, 2], [])]);
    expect(rows.map((r) => [r.player.name, r.played, r.wins, r.winRate])).toEqual([
      ['Alex', 2, 2, 1],
      ['Sam', 2, 1, 0.5],
      ['Charlie', 0, 0, 0],
    ]);
  });

  it('départage les égalités de victoires au taux de victoire', () => {
    const rows = leaderboard(players, [match(1, 1, [2], [1]), match(2, 1, [1], [3]), match(3, 1, [], [1])]);
    expect(rows[0].player.name).toBe('Sam'); // 1/1 devant Alex 1/3
  });

  it('ignore les joueurs supprimés', () => {
    expect(leaderboard(players, [match(1, 1, [99], [1])]).find((r) => r.player.id === 1)?.played).toBe(1);
  });

  it('compte les parties par jeu', () => {
    const counts = playsByGame([match(1, 1, [1], []), match(2, 1, [1], []), match(3, 2, [2], [])]);
    expect([...counts]).toEqual([
      [1, 2],
      [2, 1],
    ]);
  });
});
