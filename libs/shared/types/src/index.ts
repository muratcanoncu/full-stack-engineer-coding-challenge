export enum UserRole {
  ADMIN = 'ADMIN',
  CRAFTSMAN = 'CRAFTSMAN',
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  /**
   * Present only for CRAFTSMAN tokens. Bind row-level access to this craftsman.
   */
  craftsmanId?: string | null;
  iat?: number;
  exp?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Trade categories used in seed data. Add new values via migration + seed, not
 * via code branches.
 */
export const TRADE_CODES = ['HVAC', 'SOLAR', 'WINDOWS', 'INSULATION', 'ROOFING'] as const;
export type TradeCode = (typeof TRADE_CODES)[number];

/**
 * Allowed units a catalog position can be priced in (see CHALLENGE §3.1.1).
 */
export const POSITION_UNITS = ['piece', 'm2', 'meter', 'hour', 'flat'] as const;
export type PositionUnit = (typeof POSITION_UNITS)[number];

/**
 * Per-trade attribute schema. A trade's `pricingSchema` describes the
 * trade-specific attribute fields a craftsman fills in per position. The same
 * shape drives the backend validator (§3.1.1) and the admin schema editor
 * (§3.3), so it lives here in shared types.
 */
export type PricingFieldType = 'string' | 'number' | 'boolean' | 'enum';

/** Makes a field conditionally required/relevant based on another field's value. */
export interface PricingFieldDependsOn {
  field: string;
  equals: string | number | boolean;
}

export interface PricingFieldDef {
  /** Unique within the schema. */
  name: string;
  type: PricingFieldType;
  required?: boolean;
  /** Only meaningful when `type === 'number'`. */
  min?: number;
  /** Only meaningful when `type === 'number'`. */
  max?: number;
  /** Only meaningful when `type === 'enum'`. */
  enumValues?: string[];
  dependsOn?: PricingFieldDependsOn;
}

export interface PricingSchema {
  fields: PricingFieldDef[];
}
