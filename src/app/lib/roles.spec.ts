import type { Game, Match } from '../data/models';
import { allRoles, roleStats, roleToneIn, withRole } from './roles';

const games: Game[] = [
  { id: 1, name: 'Time Bomb', min_players: 4, max_players: 8, roles: ['Gentil', 'Méchant'] },
  { id: 2, name: 'Perudo', min_players: 2, max_players: 6, roles: null },
  {
    id: 3,
    name: 'Loup-Garou',
    min_players: 8,
    max_players: 18,
    roles: ['Villageois', 'Loup-Garou'],
  },
];

const match = (id: number, seats: [number, string | null, boolean][]): Match => ({
  id,
  game_id: 1,
  played_on: '2026-09-25',
  notes: null,
  bg_match_players: seats.map(([player_id, role, is_winner]) => ({ player_id, role, is_winner })),
});

const matches = [
  match(1, [
    [1, 'Méchant', true],
    [2, 'Gentil', false],
    [3, 'Gentil', false],
  ]),
  match(2, [
    [1, 'Gentil', true],
    [2, 'Méchant', false],
  ]),
  match(3, [[4, null, true]]),
];

describe('rôles', () => {
  it('liste les rôles de tous les jeux, sans doublon', () => {
    expect(allRoles(games)).toEqual(['Gentil', 'Méchant', 'Villageois', 'Loup-Garou']);
  });

  it('colore un rôle selon sa place dans son jeu', () => {
    expect(roleToneIn(games, 'Gentil')).toBe(roleToneIn(games, 'Villageois'));
    expect(roleToneIn(games, 'Méchant')).not.toBe(roleToneIn(games, 'Gentil'));
    expect(roleToneIn(games, 'Inconnu')).toBe('slate');
  });

  it('calcule le taux de victoire de chaque rôle', () => {
    expect(roleStats(matches, ['Gentil', 'Méchant'])).toEqual([
      { role: 'Gentil', played: 3, wins: 1, winRate: 1 / 3 },
      { role: 'Méchant', played: 2, wins: 1, winRate: 0.5 },
    ]);
  });

  it('filtre les parties sur un rôle, en retirant celles où personne ne le tenait', () => {
    const mechants = withRole(matches, 'Méchant');
    expect(mechants.map((m) => m.bg_match_players.map((p) => p.player_id))).toEqual([[1], [2]]);
  });
});
