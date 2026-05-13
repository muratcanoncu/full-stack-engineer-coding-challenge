import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class QueryCraftsmenDto {
  @ApiProperty({ required: false, description: 'Free-text match on companyName' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, enum: TRADE_CODES })
  @IsOptional()
  @IsIn(TRADE_CODES)
  trade?: TradeCode;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
