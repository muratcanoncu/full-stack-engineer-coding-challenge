import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsISO8601, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';
import { CreatePositionDto } from './catalog-position.dto';
import { CreateDiscountDto } from './catalog-discount.dto';

export class CreateCatalogVersionDto {
  // Kept as a string (not @IsUUID) to match the seeded craftsman ids, which are
  // not RFC-4122-variant-conformant. The service verifies the craftsman exists.
  @ApiProperty({ description: 'Owning craftsman id' })
  @IsString()
  @Length(1, 64)
  craftsmanId: string;

  @ApiProperty({ enum: TRADE_CODES })
  @IsIn(TRADE_CODES)
  trade: TradeCode;

  @ApiProperty({ description: 'Date the version becomes effective (ISO 8601, e.g. 2026-06-01)' })
  @IsISO8601()
  effectiveFrom: string;

  @ApiProperty({ required: false, type: [CreatePositionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePositionDto)
  positions?: CreatePositionDto[];

  @ApiProperty({ required: false, type: [CreateDiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDiscountDto)
  discounts?: CreateDiscountDto[];
}
