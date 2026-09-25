import { Component, computed, inject, input, signal } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { BoardGamesStore } from '../data/board-games.store';
import type { Match } from '../data/models';
import { allRoles, roleStats, roleToneIn, withRole } from '../lib/roles';
import { departmentStats, leaderboard } from '../lib/stats';

@Component({
  selector: 'app-leaderboard',
  imports: [PercentPipe],
  template: `
    <div class="head">
      <div>
        <h2 class="title">Classement · {{ periodLabel() }}</h2>
        <p class="subtitle">Taux de victoire par joueur, filtrable par jeu et par rôle.</p>
      </div>
      <div class="filters">
        <label>
          <span class="sr-only">Jeu</span>
          <select class="field" (change)="setGame(+$any($event.target).value)">
            <option [value]="0" [selected]="gameId() === 0">Tous les jeux</option>
            @for (g of store.games(); track g.id) {
              <option [value]="g.id" [selected]="gameId() === g.id">{{ g.name }}</option>
            }
          </select>
        </label>
        @if (roles().length) {
          <label>
            <span class="sr-only">Rôle</span>
            <select class="field" (change)="role.set($any($event.target).value)">
              <option value="" [selected]="!role()">Tous les rôles</option>
              @for (r of roles(); track r) {
                <option [value]="r" [selected]="role() === r">{{ r }}</option>
              }
            </select>
          </label>
        }
      </div>
    </div>

    <div class="toggles" role="group" aria-label="Afficher">
      <span class="toggles-label">Afficher</span>
      <button
        type="button"
        class="toggle"
        [attr.aria-pressed]="showDepts()"
        (click)="showDepts.set(!showDepts())"
      >
        <span class="switch" aria-hidden="true"></span> Par département
      </button>
      @if (roles().length) {
        <button
          type="button"
          class="toggle"
          [attr.aria-pressed]="showRoles()"
          (click)="showRoles.set(!showRoles())"
        >
          <span class="switch" aria-hidden="true"></span> Par rôle
        </button>
      }
    </div>

    @if (showRoles() && roles().length) {
      <span class="label">Par rôle</span>
      <div class="cards">
        @for (r of roleRows(); track r.role) {
          <button
            type="button"
            class="stat-card"
            [attr.data-tone]="roleToneOf(r.role)"
            [attr.aria-pressed]="role() === r.role"
            [attr.aria-label]="'Filtrer le classement sur ' + r.role"
            (click)="role.set(role() === r.role ? '' : r.role)"
          >
            <span class="card-head">
              <span class="chip" [attr.data-tone]="roleToneOf(r.role)">{{ r.role }}</span>
            </span>
            <strong class="card-rate">{{ r.played ? (r.winRate | percent) : '—' }}</strong>
            <span class="bar"><span [style.width.%]="r.winRate * 100"></span></span>
            <span class="card-meta">
              {{ r.wins }} victoire{{ r.wins > 1 ? 's' : '' }} · {{ r.played }} fois joué
            </span>
          </button>
        }
      </div>
    }

    @if (showDepts()) {
      <span class="label">Par département{{ role() ? ' · en ' + role() : '' }}</span>
      <div class="cards">
        @for (d of depts(); track d.department.id; let first = $first) {
          <article class="stat-card" [attr.data-tone]="d.department.tone">
            <header class="card-head">
              <span class="chip" [attr.data-tone]="d.department.tone">{{
                d.department.label
              }}</span>
              @if (first && d.played) {
                <span class="crown" title="Meilleur département">👑</span>
              }
            </header>
            <strong class="card-rate">{{ d.played ? (d.winRate | percent) : '—' }}</strong>
            <span class="bar"><span [style.width.%]="d.winRate * 100"></span></span>
            <span class="card-meta">
              {{ d.wins }} victoire{{ d.wins > 1 ? 's' : '' }} · {{ d.played }} participation{{
                d.played > 1 ? 's' : ''
              }}
            </span>
          </article>
        }
      </div>
    }

    <span class="label">Par joueur{{ role() ? ' · en ' + role() : '' }}</span>
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
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .toggles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
    }
    .toggles-label {
      margin-right: 4px;
      font-size: 12px;
      color: var(--muted);
    }
    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 32px;
      padding: 0 12px 0 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      font-size: 13px;
      font-weight: 500;
      color: #55555c;
    }
    .switch {
      position: relative;
      width: 26px;
      height: 16px;
      border-radius: 99px;
      background: #d8d7d2;
      transition: background 0.15s;
    }
    .switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #fff;
      transition: translate 0.15s;
    }
    .toggle[aria-pressed='true'] {
      border-color: var(--accent);
      color: var(--accent-ink);
    }
    .toggle[aria-pressed='true'] .switch {
      background: var(--accent);
    }
    .toggle[aria-pressed='true'] .switch::after {
      translate: 10px 0;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
    }
    .stat-card {
      display: flex;
      text-align: left;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid var(--chip-line);
      border-radius: 12px;
      background: linear-gradient(180deg, var(--chip-bg), var(--panel) 70%);
    }
    button.stat-card {
      cursor: pointer;
    }
    .stat-card[aria-pressed='true'] {
      border-color: var(--chip-dot);
      box-shadow: 0 0 0 2px var(--chip-dot);
    }
    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .crown {
      font-size: 16px;
    }
    .card-rate {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--chip-ink);
    }
    .stat-card .bar {
      flex: none;
      background: rgb(0 0 0 / 0.06);
    }
    .stat-card .bar span {
      background: var(--chip-dot);
    }
    .card-meta {
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
  /** Rôle filtré ; vide = tous les rôles */
  protected readonly role = signal('');
  protected readonly showDepts = signal(false);
  protected readonly showRoles = signal(false);

  /** Rôles du jeu choisi, ou de tous les jeux */
  protected readonly roles = computed(() => {
    const game = this.store.gamesById().get(this.gameId());
    return allRoles(game ? [game] : this.store.games());
  });

  private readonly byGame = computed(() => {
    const gameId = this.gameId();
    return gameId ? this.matches().filter((m) => m.game_id === gameId) : this.matches();
  });
  /** Parties du jeu choisi, réduites aux joueurs qui tenaient le rôle choisi */
  private readonly filtered = computed(() =>
    this.role() ? withRole(this.byGame(), this.role()) : this.byGame(),
  );

  protected readonly rows = computed(() => leaderboard(this.store.players(), this.filtered()));
  protected readonly depts = computed(() => departmentStats(this.store.players(), this.filtered()));
  protected readonly roleRows = computed(() => roleStats(this.byGame(), this.roles()));

  protected setGame(gameId: number): void {
    this.gameId.set(gameId);
    if (!this.roles().includes(this.role())) this.role.set('');
  }

  protected roleToneOf(role: string): string {
    return roleToneIn(this.store.games(), role);
  }
}
