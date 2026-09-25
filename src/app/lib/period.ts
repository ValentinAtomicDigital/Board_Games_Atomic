export type PeriodMode = 'week' | 'month' | 'all';

export interface Period {
  /** Bornes incluses au format YYYY-MM-DD, null pour « tout » */
  from: string | null;
  to: string | null;
  label: string;
  sublabel: string;
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/** Date locale au format YYYY-MM-DD (sans décalage UTC). */
export function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Numéro de semaine ISO 8601. */
export function isoWeek(d: Date): number {
  // Le jeudi de la semaine donne l'année ISO
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

export function periodOf(mode: PeriodMode, anchor: Date): Period {
  if (mode === 'all') return { from: null, to: null, label: 'Toutes', sublabel: 'les parties' };
  if (mode === 'month') {
    const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const [month, year] = monthFmt.format(from).split(' ');
    return { from: toIsoDate(from), to: toIsoDate(to), label: capitalize(month), sublabel: year };
  }
  const from = new Date(anchor);
  from.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return {
    from: toIsoDate(from),
    to: toIsoDate(to),
    label: `S${isoWeek(from)}`,
    sublabel: `${dayFmt.format(from)} – ${dayFmt.format(to)}`,
  };
}

/** Décale l'ancre d'une semaine ou d'un mois. */
export function shiftAnchor(mode: PeriodMode, anchor: Date, step: -1 | 1): Date {
  const d = new Date(anchor);
  if (mode === 'week') d.setDate(d.getDate() + 7 * step);
  if (mode === 'month') d.setMonth(d.getMonth() + step, 1);
  return d;
}

export function inPeriod(date: string, period: Period): boolean {
  return (!period.from || date >= period.from) && (!period.to || date <= period.to);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
