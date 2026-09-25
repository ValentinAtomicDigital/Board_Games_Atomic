import { Component, computed, inject, input, signal } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { BoardGamesStore } from '../data/board-games.store';
import type { Match } from '../data/models';
import { leaderboard } from '../lib/stats';

@Component({
  selector: 'app-leaderboard',
  imports: [PercentPipe],
  template: `
    <div class="head">
      <div>
        <h2 class="title">Classement · {{ periodLabel() }}</h2>
        <p class="subtitle">Victoires, puis taux de victoire. Filtre par jeu si besoin.</p>
      </div>
      <label>
        <span class="sr-only">Jeu</span>
        <select class="field" (change)="gameId.set(+$any($event.target).value)">
          <option [value]="0" [selected]="gameId() === 0">Tous les jeux</option>
          @for (g of store.games(); track g.id) {
            <option [value]="g.id" [selected]="gameId() === g.id">{{ g.name }}</option>
          }
        </select>
      </label>
    </div>

    @if (rows().length) {
      <table class="table">
        <thead>
          <tr>
            <th class="rank">#</th>
            <th>Joueur</th>
            <th class="num">Parties</th>
            <th class="num">Victoires</th>
            <th class="rate">Taux de victoire</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.player.id; let i = $index) {
            <tr [class.idle]="!row.played">
              <td class="rank">
                @if (row.played) {
                  <span class="medal" [attr.data-rank]="i + 1">{{ i + 1 }}</span>
                } @else {
                  <span class="muted">—</span>
                }
              </td>
              <td class="name">{{ row.player.name }}</td>
              <td class="num">{{ row.played }}</td>
              <td class="num"><strong>{{ row.wins }}</strong></td>
              <td class="rate">
                <div class="rate-cell">
                  <span class="bar"><span [style.width.%]="row.winRate * 100"></span></span>
                  <span class="pct">{{ row.played ? (row.winRate | percent) : '—' }}</span>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p class="empty">Ajoute des joueurs pour voir le classement.</p>
    }
  `,
  styles: `
    .head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .rank { width: 48px; }
    .name { font-weight: 500; }
    .idle td { color: var(--muted); }
    .medal { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%;
      background: var(--field); font-size: 12px; font-weight: 700; }
    .medal[data-rank='1'] { background: var(--lime); }
    .medal[data-rank='2'] { background: var(--accent-soft); color: var(--accent-ink); }
    .medal[data-rank='3'] { background: #f6e7d8; color: #7a4b1c; }
    .rate { width: 38%; }
    .rate-cell { display: flex; align-items: center; gap: 12px; }
    .bar { flex: 1; height: 8px; border-radius: 99px; background: var(--field); overflow: hidden; }
    .bar span { display: block; height: 100%; border-radius: inherit; background: var(--accent); }
    .pct { width: 44px; text-align: right; font-variant-numeric: tabular-nums; }
    @media (max-width: 640px) { .bar { display: none; } .rate { width: auto; } }
  `,
})
export class Leaderboard {
  protected readonly store = inject(BoardGamesStore);
  readonly matches = input.required<Match[]>();
  readonly periodLabel = input.required<string>();
  protected readonly gameId = signal(0);

  protected readonly rows = computed(() => {
    const gameId = this.gameId();
    const matches = gameId ? this.matches().filter((m) => m.game_id === gameId) : this.matches();
    return leaderboard(this.store.players(), matches);
  });
}
