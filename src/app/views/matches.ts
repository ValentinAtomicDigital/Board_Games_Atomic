import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BoardGamesStore } from '../data/board-games.store';
import type { Match, Player } from '../data/models';
import { toneFor } from '../lib/colors';
import { groupByDepartment } from '../lib/departments';
import { fitsPlayerCount, playerRange } from '../lib/format';
import { roleTone } from '../lib/roles';
import { playsByGame } from '../lib/stats';
import { toIsoDate } from '../lib/period';
import { GameChip } from '../ui/game-chip';

/** État affiché d'un joueur dans le formulaire : absent, a joué, ou a gagné. */
type Seat = 'out' | 'played' | 'won';

/** Un joueur coché : son rôle (jeux à rôles) ou sa victoire (autres jeux). */
interface Entry {
  role: string | null;
  won: boolean;
}

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

        <span class="label">
          @if (roles()) {
            Qui a joué ? Clique pour ajouter un joueur, puis choisis son rôle.
          } @else {
            Qui a joué ? Un clic : a joué · deux clics : a gagné 🏆
          }
        </span>
        <div class="board">
          @for (group of seatGroups(); track group.id) {
            <section class="dept" [attr.data-tone]="group.tone">
              <header class="dept-head">
                <span class="chip" [attr.data-tone]="group.tone">{{ group.label }}</span>
                <span class="dept-count">{{ picked(group.items) }}/{{ group.items.length }}</span>
              </header>
              @for (p of group.items; track p.id) {
                <div class="seat-wrap">
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
                  @if (roles(); as roles) {
                    @if (entry(p.id); as e) {
                      <div class="role-pills" role="group" [attr.aria-label]="'Rôle de ' + p.name">
                        @for (r of roles; track r; let i = $index) {
                          <button
                            type="button"
                            class="role-pill"
                            [attr.data-tone]="roleTone(i)"
                            [attr.aria-pressed]="e.role === r"
                            (click)="setRole(p.id, r)"
                          >
                            {{ r }}
                          </button>
                        }
                      </div>
                    }
                  }
                </div>
              }
            </section>
          } @empty {
            <span class="muted">Ajoute d'abord des joueurs dans l'onglet Joueurs.</span>
          }
        </div>

        @if (roles(); as roles) {
          <span class="label camp-label">Camp gagnant</span>
          <div class="camps" role="group" aria-label="Camp gagnant">
            @for (r of roles; track r; let i = $index) {
              <button
                type="button"
                class="camp"
                [attr.data-tone]="roleTone(i)"
                [attr.aria-pressed]="winningRole() === r"
                (click)="winningRole.set(r)"
              >
                @if (winningRole() === r) {
                  🏆
                }
                {{ r }}
                <span class="camp-count">{{ roleCount(r) }}</span>
              </button>
            }
          </div>
        }

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
                      @if (p.role) {
                        <span class="role-tag" [attr.data-tone]="roleToneOf(m.game_id, p.role)">{{
                          p.role
                        }}</span>
                      }
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
    .seat-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .role-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding-left: 8px;
    }
    .role-pill {
      height: 24px;
      padding: 0 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      color: #55555c;
      font-size: 11px;
      font-weight: 500;
    }
    .role-pill[aria-pressed='true'] {
      border-color: var(--chip-dot);
      background: var(--chip-dot);
      color: #fff;
    }
    .camp-label {
      margin-top: 16px;
    }
    .camps {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .camp {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 16px;
      border: 1px solid var(--chip-line);
      border-radius: 999px;
      background: var(--chip-bg);
      color: var(--chip-ink);
      font-weight: 600;
    }
    .camp[aria-pressed='true'] {
      border-color: var(--chip-dot);
      box-shadow: 0 0 0 2px var(--chip-dot);
    }
    .camp-count {
      display: inline-grid;
      place-items: center;
      min-width: 22px;
      height: 22px;
      padding: 0 6px;
      border-radius: 999px;
      background: #fff;
      font-size: 12px;
    }
    .role-tag {
      margin-left: 4px;
      padding: 1px 6px;
      border-radius: 5px;
      background: var(--chip-bg);
      color: var(--chip-ink);
      font-size: 11px;
      font-weight: 500;
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
  /** Joueurs cochés ; un joueur absent de l'objet n'a pas joué */
  private readonly seats = signal<Record<number, Entry>>({});
  /** Jeux à rôles : le camp gagnant désigne les gagnants */
  protected readonly winningRole = signal<string | null>(null);

  protected readonly range = playerRange;
  protected readonly tone = toneFor;
  protected readonly plays = computed(() => playsByGame(this.store.matches()));
  protected readonly selectedGame = computed(
    () => this.store.gamesById().get(this.gameId()) ?? null,
  );
  protected readonly roles = computed(() => {
    const roles = this.selectedGame()?.roles;
    return roles?.length ? roles : null;
  });
  protected readonly playerCount = computed(() => Object.keys(this.seats()).length);
  protected readonly fits = computed(() => {
    const game = this.selectedGame();
    return !game || fitsPlayerCount(game, this.playerCount());
  });

  protected readonly canSave = computed(
    () =>
      !!this.selectedGame() &&
      !!this.playedOn() &&
      this.playerCount() > 0 &&
      (!this.roles() || !!this.winningRole()),
  );

  protected readonly seatGroups = computed(() =>
    groupByDepartment(this.store.players(), (p) => p.department),
  );

  /** Nombre de joueurs cochés dans un département */
  protected picked(players: Player[]): number {
    return players.filter((p) => this.entry(p.id)).length;
  }

  protected entry(playerId: number): Entry | null {
    return this.seats()[playerId] ?? null;
  }

  protected isWinner(e: Entry): boolean {
    return this.roles() ? !!e.role && e.role === this.winningRole() : e.won;
  }

  protected seat(playerId: number): Seat {
    const e = this.entry(playerId);
    return !e ? 'out' : this.isWinner(e) ? 'won' : 'played';
  }

  /**
   * Jeux sans rôles : absent → a joué → a gagné → absent.
   * Jeux à rôles : absent ↔ présent (avec le rôle par défaut), la victoire vient du camp gagnant.
   */
  protected cycle(playerId: number): void {
    const e = this.entry(playerId);
    const roles = this.roles();
    let next: Entry | null;
    if (!e) next = { role: roles?.[0] ?? null, won: false };
    else if (!roles && !e.won) next = { ...e, won: true };
    else next = null;
    this.seats.update(({ [playerId]: _, ...rest }) =>
      next ? { ...rest, [playerId]: next } : rest,
    );
  }

  protected setRole(playerId: number, role: string): void {
    this.seats.update((s) => ({ ...s, [playerId]: { ...s[playerId], role } }));
  }

  protected roleCount(role: string): number {
    return Object.values(this.seats()).filter((e) => e.role === role).length;
  }

  protected readonly roleTone = roleTone;

  protected roleToneOf(gameId: number, role: string): string {
    const index = this.store.gamesById().get(gameId)?.roles?.indexOf(role) ?? -1;
    return roleTone(index);
  }

  /** Ouvre le formulaire sur un jeu ; changer de jeu garde les joueurs déjà cochés. */
  protected start(gameId: number): void {
    if (!this.formOpen()) {
      this.playedOn.set(toIsoDate(new Date()));
      this.notes.set('');
      this.seats.set({});
      this.formOpen.set(true);
    }
    if (gameId === this.gameId()) return;
    this.gameId.set(gameId);
    this.winningRole.set(null);
    // Les joueurs cochés restent ; leurs rôles sont remis au rôle par défaut du nouveau jeu
    const roles = this.roles();
    this.seats.update((seats) =>
      Object.fromEntries(
        Object.entries(seats).map(([id, e]) => [
          id,
          {
            won: e.won,
            role: roles ? (e.role && roles.includes(e.role) ? e.role : roles[0]) : null,
          },
        ]),
      ),
    );
  }

  protected close(): void {
    this.formOpen.set(false);
    this.gameId.set(0);
    this.winningRole.set(null);
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    const participants = Object.entries(this.seats()).map(([id, e]) => ({
      player_id: Number(id),
      is_winner: this.isWinner(e),
      role: e.role,
    }));
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
