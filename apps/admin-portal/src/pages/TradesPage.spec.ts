import { describe, expect, it } from 'vitest';
import { countSchemaFields } from './TradesPage';

describe('countSchemaFields', () => {
  it('returns 0 when metadata has no pricingSchema', () => {
    expect(countSchemaFields({})).toBe(0);
  });

  it('returns 0 when pricingSchema is not an object', () => {
    expect(countSchemaFields({ pricingSchema: 'not-an-object' })).toBe(0);
  });

  it('returns 0 when pricingSchema.fields is missing', () => {
    expect(countSchemaFields({ pricingSchema: {} })).toBe(0);
  });

  it('returns 0 when pricingSchema.fields is not an array', () => {
    expect(countSchemaFields({ pricingSchema: { fields: 'oops' } })).toBe(0);
  });

  it('returns the field count when schema is well-formed', () => {
    expect(
      countSchemaFields({
        pricingSchema: {
          fields: [
            { name: 'heatingPowerKw', type: 'number' },
            { name: 'inverterModel', type: 'string' },
          ],
        },
      }),
    ).toBe(2);
  });
});
