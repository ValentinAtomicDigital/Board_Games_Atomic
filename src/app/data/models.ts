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
}

export interface Participant {
  player_id: number;
  is_winner: boolean;
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
