import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { BoardGamesStore } from './data/board-games.store';
import { playsByGame } from './lib/stats';
import { inPeriod, periodOf, shiftAnchor, type PeriodMode } from './lib/period';
import { Games } from './views/games';
import { Leaderboard } from './views/leaderboard';
import { Matches } from './views/matches';
import { Players } from './views/players';

type Tab = 'ranking' | 'matches' | 'games' | 'players';

@Component({
  selector: 'app-root',
  imports: [Leaderboard, Matches, Games, Players],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly store = inject(BoardGamesStore);

  protected readonly mode = signal<PeriodMode>('week');
  protected readonly anchor = signal(new Date());
  protected readonly tab = signal<Tab>('ranking');

  protected readonly modes: { id: PeriodMode; label: string }[] = [
    { id: 'week', label: 'Semaine' },
    { id: 'month', label: 'Mois' },
    { id: 'all', label: 'Tout' },
  ];

  protected readonly period = computed(() => periodOf(this.mode(), this.anchor()));
  protected readonly periodMatches = computed(() =>
    this.store.matches().filter((m) => inPeriod(m.played_on, this.period())),
  );
  protected readonly isCurrent = computed(
    () => this.mode() === 'all' || periodOf(this.mode(), new Date()).from === this.period().from,
  );

  protected readonly tabs = computed(() => [
    { id: 'ranking' as Tab, label: 'Classement', hint: this.period().label },
    { id: 'matches' as Tab, label: 'Parties', hint: `${this.periodMatches().length}` },
    { id: 'games' as Tab, label: 'Jeux', hint: `${this.store.games().length}` },
    { id: 'players' as Tab, label: 'Joueurs', hint: `${this.store.players().length}` },
  ]);

  /** Totaux du pied de panneau, comme « Prévu 6h · Réel 7h » */
  protected readonly totals = computed(() => {
    const matches = this.periodMatches();
    const active = new Set(matches.flatMap((m) => m.bg_match_players.map((p) => p.player_id)));
    const top = [...playsByGame(matches)].sort((a, b) => b[1] - a[1])[0];
    return {
      matches: matches.length,
      players: active.size,
      topGame: top ? this.store.gamesById().get(top[0])?.name : null,
    };
  });

  ngOnInit(): void {
    this.store.load();
  }

  protected setMode(mode: PeriodMode): void {
    this.mode.set(mode);
    this.anchor.set(new Date());
  }

  protected shift(step: -1 | 1): void {
    this.anchor.update((a) => shiftAnchor(this.mode(), a, step));
  }
}
