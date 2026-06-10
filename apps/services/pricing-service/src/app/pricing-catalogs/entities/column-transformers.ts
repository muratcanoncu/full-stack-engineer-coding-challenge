import { ValueTransformer } from 'typeorm';

/**
 * Postgres returns `bigint` and `numeric` columns as strings to avoid silent
 * precision loss. Money is stored as integer minor units (euro cents), and
 * every monetary value in this service is far below `Number.MAX_SAFE_INTEGER`,
 * so converting to a JS `number` on the way out is safe. VAT rates / quantities
 * use the same string→number bridge.
 */
export const bigIntTransformer: ValueTransformer = {
  to: (value: number | null): string | null => (value === null || value === undefined ? null : String(Math.trunc(value))),
  from: (value: string | null): number | null => (value === null || value === undefined ? null : Number(value)),
};

export const numericTransformer: ValueTransformer = {
  to: (value: number | null): number | null => value ?? null,
  from: (value: string | null): number | null => (value === null || value === undefined ? null : Number(value)),
};
