import type { Department } from '../lib/departments';

export interface Player {
  id: number;
  name: string;
  department: Department | null;
}

export interface Game {
  id: number;
  name: string;
  min_players: number | null;
  max_players: number | null;
  /** Rôles / camps proposés (le premier est le rôle par défaut), null si le jeu n'en a pas */
  roles: string[] | null;
}

export interface Participant {
  player_id: number;
  is_winner: boolean;
  role: string | null;
}

export interface Match {
  id: number;
  game_id: number;
  /** Date au format YYYY-MM-DD */
  played_on: string;
  notes: string | null;
  bg_match_players: Participant[];
}

export interface NewMatch {
  gameId: number;
  playedOn: string;
  notes: string;
  participants: Participant[];
}
