import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class QueryCatalogVersionsDto {
  // Plain string for consistency with the seeded (non-conformant) craftsman ids.
  @ApiProperty({ required: false, description: 'Filter by craftsman id' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  craftsmanId?: string;

  @ApiProperty({ required: false, enum: TRADE_CODES })
  @IsOptional()
  @IsIn(TRADE_CODES)
  trade?: TradeCode;
}
