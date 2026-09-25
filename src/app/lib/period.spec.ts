import { inPeriod, isoWeek, periodOf, shiftAnchor } from './period';

describe('périodes', () => {
  it('calcule la semaine ISO', () => {
    expect(isoWeek(new Date(2026, 8, 25))).toBe(39);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53); // appartient encore à 2026
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
  });

  it('borne la semaine du lundi au dimanche', () => {
    const p = periodOf('week', new Date(2026, 8, 25));
    expect(p.from).toBe('2026-09-21');
    expect(p.to).toBe('2026-09-27');
    expect(p.label).toBe('S39');
  });

  it('borne le mois du 1er au dernier jour', () => {
    const p = periodOf('month', new Date(2026, 1, 14));
    expect([p.from, p.to]).toEqual(['2026-02-01', '2026-02-28']);
    expect(p.label).toBe('Février');
  });

  it('passe au mois précédent même depuis un 31', () => {
    const d = shiftAnchor('month', new Date(2026, 2, 31), -1);
    expect(periodOf('month', d).from).toBe('2026-02-01');
  });

  it('filtre les dates dans la période, « tout » acceptant tout', () => {
    const week = periodOf('week', new Date(2026, 8, 25));
    expect(inPeriod('2026-09-21', week)).toBe(true);
    expect(inPeriod('2026-09-28', week)).toBe(false);
    expect(inPeriod('1999-01-01', periodOf('all', new Date()))).toBe(true);
  });
});
