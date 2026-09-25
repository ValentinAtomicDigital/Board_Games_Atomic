import { Injectable, computed, signal } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../environments/env.generated';
import type { Department } from '../lib/departments';
import type { Game, Match, NewMatch, Player } from './models';

/** État partagé de l'app : joueurs, jeux et parties, lus et écrits dans les tables bg_* de Supabase. */
@Injectable({ providedIn: 'root' })
export class BoardGamesStore {
  private readonly db: SupabaseClient | null =
    env.supabaseUrl && env.supabaseAnonKey ? createClient(env.supabaseUrl, env.supabaseAnonKey) : null;

  readonly configured = this.db !== null;
  readonly players = signal<Player[]>([]);
  readonly games = signal<Game[]>([]);
  readonly matches = signal<Match[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly playersById = computed(() => new Map(this.players().map((p) => [p.id, p])));
  readonly gamesById = computed(() => new Map(this.games().map((g) => [g.id, g])));

  async load(): Promise<void> {
    this.loading.set(true);
    await this.run(async (db) => {
      const [players, games, matches] = await Promise.all([
        db.from('bg_players').select('id, name, department').order('name'),
        db.from('bg_games').select('id, name, min_players, max_players').order('name'),
        db
          .from('bg_matches')
          .select('id, game_id, played_on, notes, bg_match_players(player_id, is_winner)')
          .order('played_on', { ascending: false })
          .order('id', { ascending: false }),
      ]);
      for (const res of [players, games, matches]) if (res.error) throw res.error;
      this.players.set(players.data as Player[]);
      this.games.set(games.data as Game[]);
      this.matches.set(matches.data as Match[]);
    });
    this.loading.set(false);
  }

  addPlayer(name: string, department: Department | null) {
    return this.mutate((db) => db.from('bg_players').insert({ name: name.trim(), department }));
  }

  setDepartment(id: number, department: Department | null) {
    return this.mutate((db) => db.from('bg_players').update({ department }).eq('id', id));
  }

  deletePlayer(id: number) {
    return this.mutate((db) => db.from('bg_players').delete().eq('id', id));
  }

  addGame(name: string, minPlayers: number | null, maxPlayers: number | null) {
    return this.mutate((db) =>
      db.from('bg_games').insert({ name: name.trim(), min_players: minPlayers, max_players: maxPlayers }),
    );
  }

  deleteGame(id: number) {
    return this.mutate((db) => db.from('bg_games').delete().eq('id', id));
  }

  deleteMatch(id: number) {
    return this.mutate((db) => db.from('bg_matches').delete().eq('id', id));
  }

  addMatch(match: NewMatch): Promise<boolean> {
    return this.run(async (db) => {
      const { data, error } = await db
        .from('bg_matches')
        .insert({ game_id: match.gameId, played_on: match.playedOn, notes: match.notes.trim() || null })
        .select('id')
        .single();
      if (error) throw error;
      const rows = match.participants.map((p) => ({ ...p, match_id: data.id }));
      const res = await db.from('bg_match_players').insert(rows);
      if (res.error) {
        // Pas de partie sans joueurs : on annule l'insertion
        await db.from('bg_matches').delete().eq('id', data.id);
        throw res.error;
      }
      await this.load();
    });
  }

  private mutate(
    query: (db: SupabaseClient) => PromiseLike<{ error: { message: string } | null }>,
  ): Promise<boolean> {
    return this.run(async (db) => {
      const { error } = await query(db);
      if (error) throw error;
      await this.load();
    });
  }

  /** Exécute une opération et remonte l'erreur dans `error` ; renvoie true si elle a réussi. */
  private async run(op: (db: SupabaseClient) => Promise<void>): Promise<boolean> {
    if (!this.db) {
      this.error.set('Supabase non configuré : copie le .env du dashboard à la racine du projet.');
      return false;
    }
    this.error.set(null);
    try {
      await op(this.db);
      return true;
    } catch (e) {
      this.error.set(describeError(e));
      return false;
    }
  }
}

function describeError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (err.code === '23505') return 'Ce nom existe déjà.';
  if (err.code === '42P01' || err.code === 'PGRST205')
    return 'Tables introuvables : lance supabase/001_board_games.sql dans le SQL Editor de Supabase.';
  if (err.code === '42703')
    return 'Colonne department introuvable : lance supabase/003_player_departments.sql dans le SQL Editor de Supabase.';
  return err.message ?? 'Erreur inconnue';
}
