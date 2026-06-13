import { ApiProperty } from '@nestjs/swagger';
import { PositionUnit } from '@sandbox/types';
import { QuoteResult } from '../quote/quote-calculator';

/**
 * Response shape for both quote endpoints. It mirrors the pure calculator's
 * `QuoteResult` exactly; all monetary values are integer euro **cents**
 * (the client formats them for display).
 */

export class AppliedSurchargeResponseDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() amountCents: number;
}

export class AppliedDiscountResponseDto {
  @ApiProperty() key: string;
  @ApiProperty() label: string;
  @ApiProperty() amountCents: number;
}

export class QuoteLineResponseDto {
  @ApiProperty() positionKey: string;
  @ApiProperty() label: string;
  @ApiProperty() unit: PositionUnit;
  @ApiProperty() quantity: number;
  @ApiProperty() vatRate: number;
  @ApiProperty() unitNetPriceCents: number;
  @ApiProperty() baseNetCents: number;
  @ApiProperty({ type: [AppliedSurchargeResponseDto] }) appliedSurcharges: AppliedSurchargeResponseDto[];
  @ApiProperty() netCents: number;
  @ApiProperty({ type: [AppliedDiscountResponseDto] }) appliedDiscounts: AppliedDiscountResponseDto[];
  @ApiProperty() discountedNetCents: number;
  @ApiProperty() vatCents: number;
  @ApiProperty() grossCents: number;
}

export class VatGroupResponseDto {
  @ApiProperty() vatRate: number;
  @ApiProperty() netSubtotalCents: number;
  @ApiProperty() vatAmountCents: number;
  @ApiProperty() grossSubtotalCents: number;
}

export class QuoteTotalsResponseDto {
  @ApiProperty() netCents: number;
  @ApiProperty() totalDiscountCents: number;
  @ApiProperty() vatCents: number;
  @ApiProperty() grossCents: number;
}

export class QuoteResponseDto {
  @ApiProperty({ type: [QuoteLineResponseDto] }) lines: QuoteLineResponseDto[];
  @ApiProperty({ type: [AppliedDiscountResponseDto] }) discounts: AppliedDiscountResponseDto[];
  @ApiProperty({ type: [VatGroupResponseDto] }) vatGroups: VatGroupResponseDto[];
  @ApiProperty({ type: QuoteTotalsResponseDto }) totals: QuoteTotalsResponseDto;

  // The calculator already returns this exact shape, so the mapping is a pass-through.
  static from(result: QuoteResult): QuoteResponseDto {
    return result;
  }
}
