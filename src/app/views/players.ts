import { Component, computed, inject, signal } from '@angular/core';
import { BoardGamesStore } from '../data/board-games.store';
import type { Player } from '../data/models';
import { DEPARTMENTS, departmentOf, groupByDepartment, type Department } from '../lib/departments';
import { leaderboard } from '../lib/stats';

@Component({
  selector: 'app-players',
  template: `
    <h2 class="title">Joueurs</h2>
    <p class="subtitle">Ajoute ou retire les collègues qui jouent, rangés par département.</p>

    <div class="filters" role="group" aria-label="Département">
      <button type="button" class="filter" [attr.aria-pressed]="filter() === 'all'" (click)="filter.set('all')">
        Tous <span>{{ store.players().length }}</span>
      </button>
      @for (d of departments; track d.id) {
        <button type="button" class="filter" [attr.aria-pressed]="filter() === d.id" (click)="filter.set(d.id)">
          {{ d.label }} <span>{{ counts()[d.id] ?? 0 }}</span>
        </button>
      }
    </div>

    @if (groups().length) {
      <div class="scroll-list" [class.grouped]="filter() === 'all'">
        <table class="table">
          <thead>
            <tr>
              <th>Joueur</th>
              <th class="dept">Département</th>
              <th class="num">Parties</th>
              <th class="num">Victoires</th>
              <th class="actions"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            @for (group of groups(); track group.id) {
              @if (filter() === 'all') {
                <tr class="group-row">
                  <td colspan="5">{{ group.label }} · {{ group.items.length }}</td>
                </tr>
              }
              @for (row of group.items; track row.player.id) {
                <tr>
                  <td class="name">
                    <span class="avatar" aria-hidden="true">{{ row.player.name.charAt(0) }}</span>
                    {{ row.player.name }}
                  </td>
                  <td class="dept">
                    <select class="chip" [attr.data-tone]="tone(row.player.department)"
                      [attr.aria-label]="'Département de ' + row.player.name"
                      (change)="move(row.player, $any($event.target).value)">
                      <option value="" [selected]="!row.player.department">—</option>
                      @for (d of departments; track d.id) {
                        <option [value]="d.id" [selected]="row.player.department === d.id">{{ d.label }}</option>
                      }
                    </select>
                  </td>
                  <td class="num">{{ row.played }}</td>
                  <td class="num">{{ row.wins }}</td>
                  <td class="actions">
                    <button class="btn-icon" type="button" (click)="remove(row.player, row.played)"
                      [attr.aria-label]="'Supprimer ' + row.player.name">×</button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="empty">Aucun joueur ici pour l'instant.</p>
    }

    <form class="add" (submit)="$event.preventDefault(); add()">
      <input class="field name" placeholder="Prénom NOM" aria-label="Nom du joueur" [value]="name()"
        (input)="name.set($any($event.target).value)" />
      <select class="field" aria-label="Département du nouveau joueur" (change)="newDept.set($any($event.target).value)">
        <option value="" [selected]="!newDept()">Département…</option>
        @for (d of departments; track d.id) {
          <option [value]="d.id" [selected]="newDept() === d.id">{{ d.label }}</option>
        }
      </select>
      <button class="btn-lime" type="submit" [disabled]="!name().trim()">＋ Ajouter le joueur</button>
    </form>
  `,
  styles: `
    /* Place pour 4 joueurs en plus du titre de département */
    .scroll-list.grouped { max-height: calc(4 * var(--row) + 50px + 32px); }
    .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
    .filter { height: 32px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px;
      background: #fff; font-size: 13px; font-weight: 500; color: #55555c; }
    .filter span { margin-left: 4px; color: var(--muted); font-size: 12px; }
    .filter[aria-pressed='true'] { background: var(--accent); border-color: var(--accent); color: #fff; }
    .filter[aria-pressed='true'] span { color: rgb(255 255 255 / 0.8); }
    .name { font-weight: 500; white-space: nowrap; }
    .dept { width: 140px; }
    .group-row td { height: 24px; padding-top: 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--accent-ink); }
    .avatar { display: inline-grid; place-items: center; width: 28px; height: 28px; margin-right: 10px;
      border-radius: 50%; background: var(--accent-soft); color: var(--accent-ink); font-weight: 700;
      font-size: 12px; text-transform: uppercase; }
    .add { display: flex; flex-wrap: wrap; gap: 8px; }
    .add .field { height: 40px; }
    .add .name { flex: 1; min-width: 180px; }
  `,
})
export class Players {
  protected readonly store = inject(BoardGamesStore);
  protected readonly departments = DEPARTMENTS;
  protected readonly filter = signal<Department | 'all'>('all');
  protected readonly name = signal('');
  protected readonly newDept = signal<Department | ''>('');

  private readonly rows = computed(() => leaderboard(this.store.players(), this.store.matches()));

  protected readonly counts = computed(() => {
    const counts: Partial<Record<Department, number>> = {};
    for (const p of this.store.players()) if (p.department) counts[p.department] = (counts[p.department] ?? 0) + 1;
    return counts;
  });

  protected readonly groups = computed(() => {
    const filter = this.filter();
    const rows = [...this.rows()]
      .filter((r) => filter === 'all' || r.player.department === filter)
      .sort((a, b) => a.player.name.localeCompare(b.player.name));
    return groupByDepartment(rows, (r) => r.player.department);
  });

  protected tone(department: Department | null) {
    return departmentOf(department)?.tone ?? 'slate';
  }

  protected async add(): Promise<void> {
    if (await this.store.addPlayer(this.name(), this.newDept() || null)) this.name.set('');
  }

  protected move(player: Player, department: Department | ''): void {
    this.store.setDepartment(player.id, department || null);
  }

  protected remove(player: Player, played: number): void {
    const warning = played ? `\nSes ${played} participation(s) seront aussi supprimées.` : '';
    if (confirm(`Supprimer ${player.name} ?${warning}`)) this.store.deletePlayer(player.id);
  }
}
