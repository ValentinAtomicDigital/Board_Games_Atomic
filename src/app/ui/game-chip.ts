import { Component, computed, input } from '@angular/core';
import { toneFor } from '../lib/colors';

@Component({
  selector: 'app-game-chip',
  template: `<span class="chip" [attr.data-tone]="tone()">{{ name() }}</span>`,
})
export class GameChip {
  readonly gameId = input.required<number>();
  readonly name = input.required<string>();
  protected readonly tone = computed(() => toneFor(this.gameId()));
}
