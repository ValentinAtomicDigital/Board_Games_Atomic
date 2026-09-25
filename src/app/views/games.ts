import { Component, computed, inject, signal } from '@angular/core';
import { BoardGamesStore } from '../data/board-games.store';
import type { Game } from '../data/models';
import { playerRange } from '../lib/format';
import { playsByGame } from '../lib/stats';
import { GameChip } from '../ui/game-chip';

@Component({
  selector: 'app-games',
  imports: [GameChip],
  template: `
    <h2 class="title">Jeux</h2>
    <p class="subtitle">La ludothèque du bureau.</p>

    @if (store.games().length) {
      <div class="scroll-list">
        <table class="table">
          <thead>
            <tr>
              <th>Jeu</th>
              <th class="num">Joueurs</th>
              <th>Rôles / camps</th>
              <th class="num">Parties</th>
              <th class="actions"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            @for (g of store.games(); track g.id) {
              <tr>
                <td><app-game-chip [gameId]="g.id" [name]="g.name" /></td>
                <td class="num muted">{{ range(g) }}</td>
                <td>
                  <button
                    class="roles"
                    type="button"
                    (click)="editRoles(g)"
                    [attr.aria-label]="'Modifier les rôles de ' + g.name"
                  >
                    @for (r of g.roles ?? []; track r) {
                      <span class="role">{{ r }}</span>
                    } @empty {
                      <span class="muted">Aucun</span>
                    }
                    <span class="edit" aria-hidden="true">✎</span>
                  </button>
                </td>
                <td class="num">{{ plays().get(g.id) ?? 0 }}</td>
                <td class="actions">
                  <button
                    class="btn-icon"
                    type="button"
                    (click)="remove(g)"
                    [attr.aria-label]="'Supprimer ' + g.name"
                  >
                    ×
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="empty">Aucun jeu pour l'instant.</p>
    }

    <form class="add" (submit)="$event.preventDefault(); add()">
      <input
        class="field name"
        placeholder="Nom du jeu"
        aria-label="Nom du jeu"
        [value]="name()"
        (input)="name.set($any($event.target).value)"
      />
      <input
        class="field-box"
        type="number"
        min="1"
        placeholder="Min"
        aria-label="Joueurs minimum"
        [value]="min()"
        (input)="min.set($any($event.target).value)"
      />
      <input
        class="field-box"
        type="number"
        min="1"
        placeholder="Max"
        aria-label="Joueurs maximum"
        [value]="max()"
        (input)="max.set($any($event.target).value)"
      />
      <input
        class="field roles-input"
        placeholder="Rôles (optionnel) : Gentil, Méchant"
        aria-label="Rôles ou camps, séparés par des virgules"
        [value]="roles()"
        (input)="roles.set($any($event.target).value)"
      />
      <button class="btn-lime" type="submit" [disabled]="!name().trim()">＋ Ajouter le jeu</button>
    </form>
  `,
  styles: `
    .add {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .name {
      flex: 1;
      min-width: 180px;
      height: 40px;
    }
    .field-box {
      width: 72px;
      height: 40px;
    }
    .roles-input {
      flex: 1;
      min-width: 220px;
      height: 40px;
    }
    .roles {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      padding: 4px 6px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: none;
      font-size: 12px;
      text-align: left;
    }
    .roles:hover {
      border-color: var(--line);
      background: var(--field);
    }
    .role {
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent-ink);
      font-weight: 500;
    }
    .edit {
      margin-left: 4px;
      color: var(--muted);
      opacity: 0;
    }
    .roles:hover .edit,
    .roles:focus-visible .edit {
      opacity: 1;
    }
  `,
})
export class Games {
  protected readonly store = inject(BoardGamesStore);
  protected readonly plays = computed(() => playsByGame(this.store.matches()));
  protected readonly name = signal('');
  protected readonly min = signal('');
  protected readonly max = signal('');
  protected readonly roles = signal('');

  protected readonly range = playerRange;

  protected async add(): Promise<void> {
    const toInt = (v: string) => (v ? Math.max(1, Math.round(Number(v))) : null);
    let [min, max] = [toInt(this.min()), toInt(this.max())];
    if (min && max && min > max) [min, max] = [max, min];
    if (await this.store.addGame(this.name(), min, max, parseRoles(this.roles()))) {
      this.name.set('');
      this.min.set('');
      this.max.set('');
      this.roles.set('');
    }
  }

  protected editRoles(g: Game): void {
    const answer = prompt(
      `Rôles ou camps de ${g.name}, séparés par des virgules (le premier est le rôle par défaut).\nLaisse vide pour un jeu sans rôles.`,
      (g.roles ?? []).join(', '),
    );
    if (answer !== null) this.store.setRoles(g.id, parseRoles(answer));
  }

  protected remove(g: Game): void {
    const n = this.plays().get(g.id) ?? 0;
    const warning = n ? `\nSes ${n} partie(s) seront aussi supprimées.` : '';
    if (confirm(`Supprimer ${g.name} ?${warning}`)) this.store.deleteGame(g.id);
  }
}

/** « Gentil, Méchant » → ['Gentil', 'Méchant'] ; vide → null. Les doublons sont ignorés. */
function parseRoles(text: string): string[] | null {
  const roles = [
    ...new Set(
      text
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    ),
  ];
  return roles.length ? roles : null;
}
