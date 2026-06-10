import { CalcCatalog, QuoteCalculationError, calculateQuote } from './quote-calculator';

function baseCatalog(): CalcCatalog {
  return {
    positions: [
      {
        key: 'panel',
        label: 'Solar panel',
        unit: 'piece',
        netPriceCents: 10000,
        vatRate: 0.19,
        minQuantity: 1,
        maxQuantity: 100,
        surcharges: [
          { key: 'express', label: 'Express', kind: 'percent', amountCents: null, percent: 0.1 },
          { key: 'setup', label: 'Setup', kind: 'flat', amountCents: 500, percent: null },
        ],
      },
      {
        key: 'service',
        label: 'Maintenance',
        unit: 'hour',
        netPriceCents: 5000,
        vatRate: 0.07,
        minQuantity: null,
        maxQuantity: null,
        surcharges: [],
      },
    ],
    discounts: [],
  };
}

describe('calculateQuote — errors (mapped to 400)', () => {
  it('throws on an unknown position key', () => {
    expect(() => calculateQuote(baseCatalog(), [{ positionKey: 'ghost', quantity: 1 }])).toThrow(
      QuoteCalculationError,
    );
  });

  it('throws when quantity is below minQuantity', () => {
    expect(() => calculateQuote(baseCatalog(), [{ positionKey: 'panel', quantity: 0 }])).toThrow(
      /below the minimum/,
    );
  });

  it('throws when quantity is above maxQuantity', () => {
    expect(() => calculateQuote(baseCatalog(), [{ positionKey: 'panel', quantity: 101 }])).toThrow(
      /above the maximum/,
    );
  });

  it('throws when a surcharge key is not declared on the position', () => {
    expect(() =>
      calculateQuote(baseCatalog(), [{ positionKey: 'panel', quantity: 1, appliedSurchargeKeys: ['bogus'] }]),
    ).toThrow(/not declared/);
  });

  it('throws on a negative quantity', () => {
    expect(() =>
      calculateQuote(baseCatalog(), [{ positionKey: 'service', quantity: -1 }]),
    ).toThrow(/non-negative/);
  });
});

describe('calculateQuote — surcharges', () => {
  it('applies a percent then a flat surcharge in declared order', () => {
    const result = calculateQuote(baseCatalog(), [
      { positionKey: 'panel', quantity: 2, appliedSurchargeKeys: ['express', 'setup'] },
    ]);
    const line = result.lines[0];
    // base = 2 × 10000 = 20000; express +10% = 2000 → 22000; setup flat +500 → 22500
    expect(line.baseNetCents).toBe(20000);
    expect(line.appliedSurcharges).toEqual([
      { key: 'express', label: 'Express', amountCents: 2000 },
      { key: 'setup', label: 'Setup', amountCents: 500 },
    ]);
    expect(line.netCents).toBe(22500);
  });

  it('a 0% percent surcharge and a 0 flat surcharge are no-ops', () => {
    const catalog = baseCatalog();
    catalog.positions[0].surcharges = [
      { key: 'zeroPct', label: 'Zero %', kind: 'percent', amountCents: null, percent: 0 },
      { key: 'zeroFlat', label: 'Zero flat', kind: 'flat', amountCents: 0, percent: null },
    ];
    const withSurcharge = calculateQuote(catalog, [
      { positionKey: 'panel', quantity: 3, appliedSurchargeKeys: ['zeroPct', 'zeroFlat'] },
    ]);
    const without = calculateQuote(catalog, [{ positionKey: 'panel', quantity: 3 }]);
    expect(withSurcharge.totals.netCents).toBe(without.totals.netCents);
    expect(withSurcharge.lines[0].netCents).toBe(30000);
  });
});

describe('calculateQuote — VAT grouping', () => {
  it('groups mixed VAT rates and reports per rate', () => {
    const result = calculateQuote(baseCatalog(), [
      { positionKey: 'panel', quantity: 1 }, // 10000 @ 19%
      { positionKey: 'service', quantity: 2 }, // 10000 @ 7%
    ]);
    const rate19 = result.vatGroups.find((g) => g.vatRate === 0.19);
    const rate07 = result.vatGroups.find((g) => g.vatRate === 0.07);
    expect(rate19).toMatchObject({ netSubtotalCents: 10000, vatAmountCents: 1900 });
    expect(rate07).toMatchObject({ netSubtotalCents: 10000, vatAmountCents: 700 });
    expect(result.totals).toMatchObject({ netCents: 20000, vatCents: 2600, grossCents: 22600 });
  });

  it('returns zero totals for an empty line list', () => {
    const result = calculateQuote(baseCatalog(), []);
    expect(result.totals).toEqual({ netCents: 0, totalDiscountCents: 0, vatCents: 0, grossCents: 0 });
    expect(result.lines).toEqual([]);
  });

  it('handles a zero-quantity line when no minimum applies', () => {
    const result = calculateQuote(baseCatalog(), [{ positionKey: 'service', quantity: 0 }]);
    expect(result.lines[0].netCents).toBe(0);
    expect(result.totals.grossCents).toBe(0);
  });
});

describe('calculateQuote — discounts', () => {
  it('applies a percent discount with a cap before the next discount stacks', () => {
    const catalog = baseCatalog();
    catalog.discounts = [
      // 10% of 100000 = 10000, capped at 1000.
      { key: 'pct', label: 'Loyalty', kind: 'percent', amountCents: null, percent: 0.1, capCents: 1000, appliesTo: 'subtotal', sortOrder: 0 },
      // Flat 2000 applied to the post-cap net.
      { key: 'flat', label: 'Voucher', kind: 'flat', amountCents: 2000, percent: null, capCents: null, appliesTo: 'subtotal', sortOrder: 1 },
    ];
    const result = calculateQuote(catalog, [{ positionKey: 'panel', quantity: 10 }]); // net 100000
    const pct = result.discounts.find((d) => d.key === 'pct');
    const flat = result.discounts.find((d) => d.key === 'flat');
    expect(pct?.amountCents).toBe(1000);
    expect(flat?.amountCents).toBe(2000);
    expect(result.totals.totalDiscountCents).toBe(3000);
    expect(result.totals.netCents).toBe(97000);
    expect(result.totals.vatCents).toBe(roundHalfUpHelper(97000 * 0.19));
  });

  it('stacks multiple discounts and allocates them across lines for VAT correctness', () => {
    const catalog = baseCatalog();
    catalog.discounts = [
      { key: 'a', label: 'A', kind: 'percent', amountCents: null, percent: 0.1, capCents: null, appliesTo: 'subtotal', sortOrder: 0 },
      { key: 'b', label: 'B', kind: 'flat', amountCents: 1000, percent: null, capCents: null, appliesTo: { positionKeys: ['service'] }, sortOrder: 1 },
    ];
    const result = calculateQuote(catalog, [
      { positionKey: 'panel', quantity: 1 }, // 10000 @19%
      { positionKey: 'service', quantity: 1 }, // 5000 @7%
    ]);
    // A: 10% of 15000 = 1500, split 1000/500 by weight. B: 1000 off service only.
    expect(result.totals.totalDiscountCents).toBe(2500);
    // sum of per-rate VAT equals reported total VAT
    const summedVat = result.vatGroups.reduce((acc, g) => acc + g.vatAmountCents, 0);
    expect(summedVat).toBe(result.totals.vatCents);
  });
});

// --- invariant / property-style tests (hand-written generator, no extra deps) ---

function roundHalfUpHelper(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFlatCatalog(): { catalog: CalcCatalog; lines: { positionKey: string; quantity: number }[] } {
  const count = randomInt(1, 4);
  const rates = [0.07, 0.19, 0];
  const positions = Array.from({ length: count }, (_, i) => ({
    key: `p${i}`,
    label: `P${i}`,
    unit: 'piece' as const,
    netPriceCents: randomInt(1, 50000),
    vatRate: rates[randomInt(0, rates.length - 1)],
    minQuantity: null,
    maxQuantity: null,
    surcharges: [],
  }));
  const lines = positions.map((p) => ({ positionKey: p.key, quantity: randomInt(0, 20) }));
  return { catalog: { positions, discounts: [] }, lines };
}

describe('calculateQuote — invariants', () => {
  it('gross ≥ net and sum of per-rate VAT equals total VAT for random inputs', () => {
    for (let iter = 0; iter < 200; iter += 1) {
      const { catalog, lines } = randomFlatCatalog();
      const result = calculateQuote(catalog, lines);
      expect(result.totals.grossCents).toBeGreaterThanOrEqual(result.totals.netCents);
      const summedVat = result.vatGroups.reduce((acc, g) => acc + g.vatAmountCents, 0);
      expect(summedVat).toBe(result.totals.vatCents);
      const summedLineVat = result.lines.reduce((acc, l) => acc + l.vatCents, 0);
      expect(summedLineVat).toBe(result.totals.vatCents);
    }
  });

  it('doubling every quantity exactly doubles the net subtotal', () => {
    for (let iter = 0; iter < 200; iter += 1) {
      const { catalog, lines } = randomFlatCatalog();
      const single = calculateQuote(catalog, lines);
      const doubled = calculateQuote(
        catalog,
        lines.map((l) => ({ ...l, quantity: l.quantity * 2 })),
      );
      expect(doubled.totals.netCents).toBe(single.totals.netCents * 2);
    }
  });
});
