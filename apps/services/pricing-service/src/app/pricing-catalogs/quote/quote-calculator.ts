import { PositionUnit } from '@sandbox/types';
import { DiscountAppliesTo, DiscountKind } from '../entities/catalog-discount.entity';
import { SurchargeKind } from '../entities/position-surcharge.entity';
import { allocateProportionally, roundHalfUp } from './money';

/**
 * Pure quote calculator. It takes a plain snapshot of a catalog version plus
 * the requested lines and returns a fully-broken-down quote, all in integer
 * euro cents. It has no NestJS / TypeORM dependencies so it is trivially
 * testable; the service maps entities into these shapes and back.
 *
 * Evaluation order (the contract):
 *   1. lineNet = roundHalfUp(quantity × netPriceCents)
 *   2. Apply the line's opted-in surcharges in their declared order against a
 *      running subtotal: a `flat` adds its amount; a `percent` adds
 *      roundHalfUp(running × percent). Consecutive percents therefore compound
 *      multiplicatively.
 *   3. Apply catalog discounts in `sortOrder`. Each discount is computed on the
 *      current net of its scope (whole subtotal, or a subset of positions); a
 *      percent discount is capped (if `capCents` is set) before the next
 *      discount stacks. The discount is allocated back onto its scope's lines
 *      proportionally so VAT grouping stays correct.
 *   4. Group the surviving (post-discount) net by VAT rate; VAT per group is
 *      roundHalfUp(net × rate), allocated back onto lines proportionally.
 */

export interface CalcSurcharge {
  key: string;
  label: string;
  kind: SurchargeKind;
  amountCents: number | null;
  percent: number | null;
}

export interface CalcPosition {
  key: string;
  label: string;
  unit: PositionUnit;
  netPriceCents: number;
  vatRate: number;
  minQuantity: number | null;
  maxQuantity: number | null;
  surcharges: CalcSurcharge[];
}

export interface CalcDiscount {
  key: string;
  label: string;
  kind: DiscountKind;
  amountCents: number | null;
  percent: number | null;
  capCents: number | null;
  appliesTo: DiscountAppliesTo;
  sortOrder: number;
}

export interface CalcCatalog {
  positions: CalcPosition[];
  discounts: CalcDiscount[];
}

export interface QuoteLineInput {
  positionKey: string;
  quantity: number;
  appliedSurchargeKeys?: string[];
}

export interface AppliedSurchargeResult {
  key: string;
  label: string;
  amountCents: number;
}

export interface AppliedDiscountResult {
  key: string;
  label: string;
  amountCents: number;
}

export interface QuoteLineResult {
  positionKey: string;
  label: string;
  unit: PositionUnit;
  quantity: number;
  vatRate: number;
  unitNetPriceCents: number;
  /** Net before surcharges: roundHalfUp(quantity × unit price). */
  baseNetCents: number;
  appliedSurcharges: AppliedSurchargeResult[];
  /** Net after surcharges, before catalog discounts. */
  netCents: number;
  appliedDiscounts: AppliedDiscountResult[];
  /** Net after surcharges and discounts. */
  discountedNetCents: number;
  vatCents: number;
  grossCents: number;
}

export interface VatGroupResult {
  vatRate: number;
  netSubtotalCents: number;
  vatAmountCents: number;
  grossSubtotalCents: number;
}

export interface QuoteResult {
  lines: QuoteLineResult[];
  discounts: AppliedDiscountResult[];
  vatGroups: VatGroupResult[];
  totals: {
    netCents: number;
    totalDiscountCents: number;
    vatCents: number;
    grossCents: number;
  };
}

/** Thrown for client-correctable quote problems; the service maps it to 400. */
export class QuoteCalculationError extends Error {}

interface WorkingLine {
  input: QuoteLineInput;
  position: CalcPosition;
  baseNetCents: number;
  appliedSurcharges: AppliedSurchargeResult[];
  netCents: number;
  discountedNetCents: number;
  appliedDiscounts: AppliedDiscountResult[];
}

function buildLine(input: QuoteLineInput, catalog: CalcCatalog): WorkingLine {
  const position = catalog.positions.find((p) => p.key === input.positionKey);
  if (!position) {
    throw new QuoteCalculationError(`Unknown position "${input.positionKey}"`);
  }
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    throw new QuoteCalculationError(`Quantity for "${input.positionKey}" must be a non-negative number`);
  }
  if (position.minQuantity !== null && input.quantity < position.minQuantity) {
    throw new QuoteCalculationError(
      `Quantity ${input.quantity} for "${input.positionKey}" is below the minimum of ${position.minQuantity}`,
    );
  }
  if (position.maxQuantity !== null && input.quantity > position.maxQuantity) {
    throw new QuoteCalculationError(
      `Quantity ${input.quantity} for "${input.positionKey}" is above the maximum of ${position.maxQuantity}`,
    );
  }

  const requestedKeys = input.appliedSurchargeKeys ?? [];
  const declaredKeys = new Set(position.surcharges.map((s) => s.key));
  for (const key of requestedKeys) {
    if (!declaredKeys.has(key)) {
      throw new QuoteCalculationError(
        `Surcharge "${key}" is not declared on position "${input.positionKey}"`,
      );
    }
  }

  const baseNetCents = roundHalfUp(input.quantity * position.netPriceCents);

  // Apply surcharges in the position's declared order, keeping only opted-in keys.
  let running = baseNetCents;
  const appliedSurcharges: AppliedSurchargeResult[] = [];
  for (const surcharge of position.surcharges) {
    if (!requestedKeys.includes(surcharge.key)) {
      continue;
    }
    const amount =
      surcharge.kind === 'flat'
        ? surcharge.amountCents ?? 0
        : roundHalfUp(running * (surcharge.percent ?? 0));
    appliedSurcharges.push({ key: surcharge.key, label: surcharge.label, amountCents: amount });
    running += amount;
  }

  return {
    input,
    position,
    baseNetCents,
    appliedSurcharges,
    netCents: running,
    discountedNetCents: running,
    appliedDiscounts: [],
  };
}

function applyDiscount(discount: CalcDiscount, lines: WorkingLine[]): void {
  const inScope = (line: WorkingLine): boolean => {
    if (discount.appliesTo === 'subtotal') {
      return true;
    }
    return discount.appliesTo.positionKeys.includes(line.position.key);
  };

  const scopeLines = lines.filter(inScope);
  const scopeNet = scopeLines.reduce((acc, l) => acc + l.discountedNetCents, 0);
  if (scopeNet <= 0) {
    return;
  }

  let amount: number;
  if (discount.kind === 'flat') {
    amount = Math.min(discount.amountCents ?? 0, scopeNet);
  } else {
    const raw = roundHalfUp(scopeNet * (discount.percent ?? 0));
    const capped = discount.capCents !== null ? Math.min(raw, discount.capCents) : raw;
    amount = Math.min(capped, scopeNet);
  }
  if (amount <= 0) {
    return;
  }

  const weights = scopeLines.map((l) => l.discountedNetCents);
  const allocation = allocateProportionally(amount, weights);
  scopeLines.forEach((line, idx) => {
    const share = allocation[idx];
    if (share > 0) {
      line.discountedNetCents -= share;
      line.appliedDiscounts.push({ key: discount.key, label: discount.label, amountCents: share });
    }
  });
}

export function calculateQuote(catalog: CalcCatalog, inputs: QuoteLineInput[]): QuoteResult {
  const lines = inputs.map((input) => buildLine(input, catalog));

  // Catalog discounts in declared order.
  const orderedDiscounts = [...catalog.discounts].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const discount of orderedDiscounts) {
    applyDiscount(discount, lines);
  }

  // Per-discount totals across all lines (declared order).
  const discountTotals: AppliedDiscountResult[] = orderedDiscounts
    .map((d) => {
      const amountCents = lines.reduce(
        (acc, l) => acc + l.appliedDiscounts.filter((ad) => ad.key === d.key).reduce((s, ad) => s + ad.amountCents, 0),
        0,
      );
      return { key: d.key, label: d.label, amountCents };
    })
    .filter((d) => d.amountCents > 0);

  // Group surviving net by VAT rate; allocate group VAT back onto lines.
  const rates = Array.from(new Set(lines.map((l) => l.position.vatRate))).sort((a, b) => a - b);
  const vatGroups: VatGroupResult[] = [];
  const lineVat = new Map<WorkingLine, number>();

  for (const rate of rates) {
    const groupLines = lines.filter((l) => l.position.vatRate === rate);
    const netSubtotalCents = groupLines.reduce((acc, l) => acc + l.discountedNetCents, 0);
    const vatAmountCents = roundHalfUp(netSubtotalCents * rate);
    const allocation = allocateProportionally(
      vatAmountCents,
      groupLines.map((l) => l.discountedNetCents),
    );
    groupLines.forEach((line, idx) => lineVat.set(line, allocation[idx]));
    vatGroups.push({
      vatRate: rate,
      netSubtotalCents,
      vatAmountCents,
      grossSubtotalCents: netSubtotalCents + vatAmountCents,
    });
  }

  const lineResults: QuoteLineResult[] = lines.map((l) => {
    const vatCents = lineVat.get(l) ?? 0;
    return {
      positionKey: l.position.key,
      label: l.position.label,
      unit: l.position.unit,
      quantity: l.input.quantity,
      vatRate: l.position.vatRate,
      unitNetPriceCents: l.position.netPriceCents,
      baseNetCents: l.baseNetCents,
      appliedSurcharges: l.appliedSurcharges,
      netCents: l.netCents,
      appliedDiscounts: l.appliedDiscounts,
      discountedNetCents: l.discountedNetCents,
      vatCents,
      grossCents: l.discountedNetCents + vatCents,
    };
  });

  const netCents = vatGroups.reduce((acc, g) => acc + g.netSubtotalCents, 0);
  const vatCents = vatGroups.reduce((acc, g) => acc + g.vatAmountCents, 0);
  const totalDiscountCents = discountTotals.reduce((acc, d) => acc + d.amountCents, 0);

  return {
    lines: lineResults,
    discounts: discountTotals,
    vatGroups,
    totals: {
      netCents,
      totalDiscountCents,
      vatCents,
      grossCents: netCents + vatCents,
    },
  };
}
