import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BoardGamesStore } from '../data/board-games.store';
import type { Match, Player } from '../data/models';
import { toneFor } from '../lib/colors';
import { groupByDepartment } from '../lib/departments';
import { fitsPlayerCount, playerRange } from '../lib/format';
import { playsByGame } from '../lib/stats';
import { toIsoDate } from '../lib/period';
import { GameChip } from '../ui/game-chip';

/** Case à cocher d'un joueur dans le formulaire : absent, a joé, ou a gagné. */
type Seat = 'out' | 'played' | 'won';

@Component({
  selector: 'app-matches',
  imports: [DatePipe, GameChip],
  template: `
    <h2 class="title">Parties · {{ periodLabel() }}</h2>
    <p class="subtitle">Chaque partie jouée au bureau, avec ses gagnants.</p>

    <div class="picker">
      <span class="label">Nouvelle partie de…</span>
      <div class="tiles">
        @for (g of store.games(); track g.id) {
          <button
            type="button"
            class="chip tile"
            [attr.data-tone]="tone(g.id)"
            [attr.aria-pressed]="formOpen() && gameId() === g.id"
            (click)="start(g.id)"
          >
            <span class="tile-name">{{ g.name }}</span>
            <span class="tile-meta"
              >{{ range(g) }} joueurs · {{ plays().get(g.id) ?? 0 }} partie{{
                (plays().get(g.id) ?? 0) > 1 ? 's' : ''
              }}</span
            >
            <span class="tile-plus" aria-hidden="true">＋</span>
          </button>
        } @empty {
          <span class="muted">Ajoute d'abord des jeux dans l'onglet Jeux.</span>
        }
      </div>
    </div>

    @if (formOpen()) {
      <form
        class="form"
        [attr.aria-label]="'Nouvelle partie de ' + selectedGame()?.name"
        (submit)="$event.preventDefault(); save()"
      >
        <div class="form-row">
          <label>
            <span class="label">Date</span>
            <input
              class="field"
              type="date"
              [value]="playedOn()"
              (input)="playedOn.set($any($event.target).value)"
            />
          </label>
          <label class="grow">
            <span class="label">Note</span>
            <input
              class="field"
              placeholder="Optionnel : score, anecdote…"
              [value]="notes()"
              (input)="notes.set($any($event.target).value)"
            />
          </label>
        </div>

        <span class="label">Qui a joué ? Un clic : a joué · deux clics : a gagné 🏆</span>
        <div class="board">
          @for (group of seatGroups(); track group.id) {
            <section class="dept" [attr.data-tone]="group.tone">
              <header class="dept-head">
                <span class="chip" [attr.data-tone]="group.tone">{{ group.label }}</span>
                <span class="dept-count">{{ picked(group.items) }}/{{ group.items.length }}</span>
              </header>
              @for (p of group.items; track p.id) {
                <button
                  type="button"
                  class="seat"
                  [attr.data-state]="seat(p.id)"
                  (click)="cycle(p.id)"
                  [attr.aria-label]="p.name + ' : ' + seatLabel[seat(p.id)]"
                >
                  <span class="seat-mark" aria-hidden="true">
                    @switch (seat(p.id)) {
                      @case ('won') {
                        🏆
                      }
                      @case ('played') {
                        ✓
                      }
                    }
                  </span>
                  <span class="seat-name" [title]="p.name">{{ p.name }}</span>
                </button>
              }
            </section>
          } @empty {
            <span class="muted">Ajoute d'abord des joueurs dans l'onglet Joueurs.</span>
          }
        </div>

        <div class="form-foot">
          @if (selectedGame(); as g) {
            <span class="count" [class.warn]="!fits()">
              {{ playerCount() }} joueur{{ playerCount() > 1 ? 's' : '' }}
              @if (!fits()) {
                · {{ g.name }} se joue à {{ range(g) }}
              }
            </span>
          }
          <button class="btn-link" type="button" (click)="close()">Annuler</button>
          <button class="btn-lime" type="submit" [disabled]="!canSave() || saving()">
            ✓ Enregistrer la partie
          </button>
        </div>
      </form>
    }

    @if (matches().length) {
      <table class="table">
        <thead>
          <tr>
            <th class="date">Date</th>
            <th class="game">Jeu</th>
            <th>Joueurs</th>
            <th class="actions"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          @for (m of matches(); track m.id) {
            <tr>
              <td class="date muted">{{ m.played_on | date: 'EEE d MMM' : '' : 'fr' }}</td>
              <td class="game">
                <app-game-chip
                  [gameId]="m.game_id"
                  [name]="store.gamesById().get(m.game_id)?.name ?? '?'"
                />
              </td>
              <td>
                <div class="people">
                  @for (p of m.bg_match_players; track p.player_id) {
                    <span class="person" [class.winner]="p.is_winner">
                      @if (p.is_winner) {
                        <span aria-label="gagnant">🏆</span>
                      }
                      {{ store.playersById().get(p.player_id)?.name }}
                    </span>
                  }
                </div>
                @if (m.notes) {
                  <div class="notes">{{ m.notes }}</div>
                }
              </td>
              <td class="actions">
                <button
                  class="btn-icon"
                  type="button"
                  (click)="remove(m)"
                  aria-label="Supprimer la partie"
                >
                  ×
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p class="empty">Aucune partie sur cette période.</p>
    }
  `,
  styles: `
    .table {
      margin-top: 12px;
    }
    .picker {
      margin-top: 16px;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 10px;
    }
    .tile {
      position: relative;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 2px;
      height: auto;
      min-height: 64px;
      padding: 10px 40px 10px 14px;
      border-radius: 12px;
      text-align: left;
      transition:
        transform 0.12s,
        box-shadow 0.12s;
    }
    .tile::before {
      position: absolute;
      top: 16px;
      left: 14px;
    }
    .tile-name {
      padding-left: 14px;
      font-size: 13px;
      font-weight: 600;
    }
    .tile-meta {
      font-size: 11px;
      letter-spacing: 0;
      text-transform: none;
      opacity: 0.75;
    }
    .tile-plus {
      position: absolute;
      right: 12px;
      top: 50%;
      translate: 0 -50%;
      display: grid;
      place-items: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #fff;
      font-size: 14px;
    }
    .tile:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgb(0 0 0 / 0.06);
    }
    .tile[aria-pressed='true'] {
      border-color: var(--chip-dot);
      box-shadow: 0 0 0 2px var(--chip-dot);
    }
    .tile[aria-pressed='true'] .tile-plus {
      background: var(--chip-dot);
      color: #fff;
    }
    .count {
      margin-right: auto;
      font-size: 13px;
      color: #55555c;
    }
    .count.warn {
      color: var(--danger);
    }
    .date {
      width: 120px;
      white-space: nowrap;
      text-transform: capitalize;
    }
    .game {
      width: 1%;
    }
    .people {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
    }
    .person {
      color: #55555c;
    }
    .winner {
      color: var(--ink);
      font-weight: 600;
    }
    .notes {
      margin-top: 2px;
      font-size: 12px;
      color: var(--muted);
    }
    .form {
      margin: 12px 0 8px;
      padding: 16px;
      border-radius: 12px;
      background: #f8f7f4;
      border: 1px solid var(--line);
    }
    .form-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    .form-row label {
      display: flex;
      flex-direction: column;
    }
    .form-row .grow {
      flex: 1;
      min-width: 200px;
    }
    .label {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #55555c;
    }
    .board {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 10px;
    }
    .dept {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
    }
    .dept-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .dept-count {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    .seat {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 34px;
      padding: 4px 10px;
      text-align: left;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      font-size: 13px;
    }
    .seat:hover {
      border-color: var(--accent);
    }
    .seat-mark {
      display: inline-grid;
      place-items: center;
      width: 18px;
      height: 18px;
      flex: none;
      border: 1.5px solid #d8d7d2;
      border-radius: 5px;
      font-size: 11px;
    }
    .seat[data-state='played'] .seat-mark {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }
    .seat[data-state='won'] .seat-mark {
      border: 0;
    }
    .seat-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .seat[data-state='played'] {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent-ink);
      font-weight: 500;
    }
    .seat[data-state='won'] {
      background: var(--lime);
      border-color: #d9dd62;
      font-weight: 600;
    }
    .form-foot {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
    }
  `,
})
export class Matches {
  protected readonly store = inject(BoardGamesStore);
  readonly matches = input.required<Match[]>();
  readonly periodLabel = input.required<string>();

  protected readonly seatLabel: Record<Seat, string> = {
    out: 'absent',
    played: 'a joué',
    won: 'a gagné',
  };
  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly gameId = signal(0);
  protected readonly playedOn = signal(toIsoDate(new Date()));
  protected readonly notes = signal('');
  private readonly seats = signal<Record<number, Seat>>({});

  protected readonly range = playerRange;
  protected readonly tone = toneFor;
  protected readonly plays = computed(() => playsByGame(this.store.matches()));
  protected readonly selectedGame = computed(
    () => this.store.gamesById().get(this.gameId()) ?? null,
  );
  protected readonly playerCount = computed(
    () => Object.values(this.seats()).filter((s) => s !== 'out').length,
  );
  protected readonly fits = computed(() => {
    const game = this.selectedGame();
    return !game || fitsPlayerCount(game, this.playerCount());
  });

  protected readonly canSave = computed(
    () => !!this.selectedGame() && !!this.playedOn() && this.playerCount() > 0,
  );

  protected readonly seatGroups = computed(() =>
    groupByDepartment(this.store.players(), (p) => p.department),
  );

  /** Nombre de joueurs cochés dans un département */
  protected picked(players: Player[]): number {
    return players.filter((p) => this.seat(p.id) !== 'out').length;
  }

  protected seat(playerId: number): Seat {
    return this.seats()[playerId] ?? 'out';
  }

  protected cycle(playerId: number): void {
    const next: Record<Seat, Seat> = { out: 'played', played: 'won', won: 'out' };
    this.seats.update((s) => ({ ...s, [playerId]: next[this.seat(playerId)] }));
  }

  /** Ouvre le formulaire sur un jeu ; changer de jeu garde les joueurs déjà cochés. */
  protected start(gameId: number): void {
    if (!this.formOpen()) {
      this.playedOn.set(toIsoDate(new Date()));
      this.notes.set('');
      this.seats.set({});
      this.formOpen.set(true);
    }
    this.gameId.set(gameId);
  }

  protected close(): void {
    this.formOpen.set(false);
    this.gameId.set(0);
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    const participants = Object.entries(this.seats())
      .filter(([, s]) => s !== 'out')
      .map(([id, s]) => ({ player_id: Number(id), is_winner: s === 'won' }));
    const ok = await this.store.addMatch({
      gameId: this.gameId(),
      playedOn: this.playedOn(),
      notes: this.notes(),
      participants,
    });
    this.saving.set(false);
    if (ok) this.close();
  }

  protected remove(match: Match): void {
    const game = this.store.gamesById().get(match.game_id)?.name ?? 'cette partie';
    if (confirm(`Supprimer la partie de ${game} du ${match.played_on} ?`))
      this.store.deleteMatch(match.id);
  }
}
