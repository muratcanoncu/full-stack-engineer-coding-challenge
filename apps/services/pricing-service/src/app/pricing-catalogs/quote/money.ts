/**
 * Money helpers. Internal arithmetic is always in integer euro **cents**.
 *
 * Rounding rule (the contract): whenever a fractional cent appears — from a
 * percentage, a fractional quantity, or a proportional allocation — we round
 * **half away from zero** to the nearest whole cent. This is applied
 * immediately after each such operation so later steps stack on whole cents.
 */

/** Round to the nearest integer, halves away from zero (e.g. 2.5 → 3, -2.5 → -3). */
export function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/**
 * Allocate an integer `total` across buckets in proportion to `weights`, using
 * the largest-remainder method so the parts sum **exactly** to `total`.
 * Used to split catalog discounts and per-rate VAT back onto individual lines
 * without losing or inventing a cent. `total` is expected to be non-negative.
 */
export function allocateProportionally(total: number, weights: number[]): number[] {
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);
  if (sumWeights <= 0 || total === 0) {
    return weights.map(() => 0);
  }

  const raw = weights.map((w) => (total * w) / sumWeights);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = total - floors.reduce((acc, f) => acc + f, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < order.length && remainder > 0; k += 1) {
    floors[order[k].i] += 1;
    remainder -= 1;
  }

  return floors;
}

const EURO_FORMATTER = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

/** Format integer cents as a `de-DE` EUR string. Display boundary only. */
export function formatEuroCents(cents: number): string {
  return EURO_FORMATTER.format(cents / 100);
}
