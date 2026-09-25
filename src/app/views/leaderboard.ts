import { Component, computed, inject, input, signal } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { BoardGamesStore } from '../data/board-games.store';
import type { Match } from '../data/models';
import { departmentStats, leaderboard } from '../lib/stats';

@Component({
  selector: 'app-leaderboard',
  imports: [PercentPipe],
  template: `
    <div class="head">
      <div>
        <h2 class="title">Classement · {{ periodLabel() }}</h2>
        <p class="subtitle">
          Taux de victoire par département et par joueur. Filtre par jeu si besoin.
        </p>
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

    <span class="label">Par département</span>
    <div class="depts">
      @for (d of depts(); track d.department.id; let first = $first) {
        <article class="dept-card" [attr.data-tone]="d.department.tone">
          <header class="dept-head">
            <span class="chip" [attr.data-tone]="d.department.tone">{{ d.department.label }}</span>
            @if (first && d.played) {
              <span class="crown" title="Meilleur département">👑</span>
            }
          </header>
          <strong class="dept-rate">{{ d.played ? (d.winRate | percent) : '—' }}</strong>
          <span class="bar"><span [style.width.%]="d.winRate * 100"></span></span>
          <span class="dept-meta">
            {{ d.wins }} victoire{{ d.wins > 1 ? 's' : '' }} · {{ d.played }} participation{{
              d.played > 1 ? 's' : ''
            }}
          </span>
        </article>
      }
    </div>

    <span class="label">Par joueur</span>
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
              <td class="num">
                <strong>{{ row.wins }}</strong>
              </td>
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
    .label {
      display: block;
      margin: 20px 0 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #55555c;
    }
    .depts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }
    .dept-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid var(--chip-line);
      border-radius: 12px;
      background: linear-gradient(180deg, var(--chip-bg), var(--panel) 70%);
    }
    .dept-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .crown {
      font-size: 16px;
    }
    .dept-rate {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--chip-ink);
    }
    .dept-card .bar {
      flex: none;
      background: rgb(0 0 0 / 0.06);
    }
    .dept-card .bar span {
      background: var(--chip-dot);
    }
    .dept-meta {
      font-size: 12px;
      color: #55555c;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
    }
    .rank {
      width: 48px;
    }
    .name {
      font-weight: 500;
    }
    .idle td {
      color: var(--muted);
    }
    .medal {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--field);
      font-size: 12px;
      font-weight: 700;
    }
    .medal[data-rank='1'] {
      background: var(--lime);
    }
    .medal[data-rank='2'] {
      background: var(--accent-soft);
      color: var(--accent-ink);
    }
    .medal[data-rank='3'] {
      background: #f6e7d8;
      color: #7a4b1c;
    }
    .rate {
      width: 38%;
    }
    .rate-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bar {
      flex: 1;
      height: 8px;
      border-radius: 99px;
      background: var(--field);
      overflow: hidden;
    }
    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--accent);
    }
    .pct {
      width: 44px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 640px) {
      .bar {
        display: none;
      }
      .rate {
        width: auto;
      }
    }
  `,
})
export class Leaderboard {
  protected readonly store = inject(BoardGamesStore);
  readonly matches = input.required<Match[]>();
  readonly periodLabel = input.required<string>();
  protected readonly gameId = signal(0);

  private readonly filtered = computed(() => {
    const gameId = this.gameId();
    return gameId ? this.matches().filter((m) => m.game_id === gameId) : this.matches();
  });
  protected readonly rows = computed(() => leaderboard(this.store.players(), this.filtered()));
  protected readonly depts = computed(() => departmentStats(this.store.players(), this.filtered()));
}
