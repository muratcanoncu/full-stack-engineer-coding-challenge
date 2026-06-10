import { allocateProportionally, formatEuroCents, roundHalfUp } from './money';

describe('roundHalfUp', () => {
  it('rounds halves away from zero', () => {
    expect(roundHalfUp(2.5)).toBe(3);
    expect(roundHalfUp(2.4)).toBe(2);
    expect(roundHalfUp(-2.5)).toBe(-3);
    expect(roundHalfUp(0)).toBe(0);
  });
});

describe('allocateProportionally', () => {
  it('splits a total exactly across weights using largest remainder', () => {
    const parts = allocateProportionally(1000, [10000, 5000]);
    expect(parts).toEqual([667, 333]);
    expect(parts[0] + parts[1]).toBe(1000);
  });

  it('returns zeros when weights sum to zero', () => {
    expect(allocateProportionally(500, [0, 0])).toEqual([0, 0]);
  });

  it('returns zeros when total is zero', () => {
    expect(allocateProportionally(0, [1, 2, 3])).toEqual([0, 0, 0]);
  });

  it('never loses or invents a cent for awkward splits', () => {
    const parts = allocateProportionally(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('formatEuroCents', () => {
  it('formats integer cents as a de-DE EUR string', () => {
    // de-DE inserts a (narrow) non-breaking space before the symbol; normalize
    // any whitespace to a regular space for a stable assertion.
    const normalized = formatEuroCents(123456).replace(/\s/g, ' ');
    expect(normalized).toBe('1.234,56 €');
  });
});
