import type { ChipTone } from './colors';

export const DEPARTMENTS = [
  { id: '3d', label: '3D', tone: 'teal' },
  { id: 'design', label: 'Design', tone: 'pink' },
  { id: 'dev', label: 'Dev', tone: 'blue' },
  { id: 'prod', label: 'Prod', tone: 'amber' },
  { id: 'office', label: 'Office', tone: 'slate' },
] as const satisfies readonly { id: string; label: string; tone: ChipTone }[];

export type Department = (typeof DEPARTMENTS)[number]['id'];

export function departmentOf(id: Department | null) {
  return DEPARTMENTS.find((d) => d.id === id) ?? null;
}

/** Regroupe des éléments par département, dans l'ordre de DEPARTMENTS, les « sans département » en dernier. */
export function groupByDepartment<T>(items: T[], dept: (item: T) => Department | null) {
  const groups = [
    ...DEPARTMENTS,
    { id: null, label: 'Sans département', tone: 'slate' as const },
  ].map((d) => ({
    ...d,
    items: items.filter((i) => dept(i) === d.id),
  }));
  return groups.filter((g) => g.items.length);
}
