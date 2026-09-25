/** Teintes des étiquettes de jeu, reprises des étiquettes projet de la DA. */
export const CHIP_TONES = ['slate', 'teal', 'green', 'pink', 'amber', 'blue', 'violet'] as const;
export type ChipTone = (typeof CHIP_TONES)[number];
/** Teintes disponibles : celles des jeux, plus le rouge réservé aux rôles */
export type Tone = ChipTone | 'red';

/** Une teinte stable par jeu, pour qu'un jeu garde sa couleur partout. */
export function toneFor(id: number): ChipTone {
  return CHIP_TONES[Math.abs(id) % CHIP_TONES.length];
}
