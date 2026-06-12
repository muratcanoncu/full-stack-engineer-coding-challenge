import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { POSITION_UNITS, PositionUnit } from '@sandbox/types';
import { SurchargeKind } from '../entities/position-surcharge.entity';

const SURCHARGE_KINDS: readonly SurchargeKind[] = ['flat', 'percent'];

export class CreateSurchargeDto {
  @ApiProperty({ description: 'Stable key, unique within the position' })
  @IsString()
  @Length(1, 64)
  key: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  label: string;

  @ApiProperty({ enum: SURCHARGE_KINDS })
  @IsIn(SURCHARGE_KINDS)
  kind: SurchargeKind;

  @ApiProperty({ required: false, description: 'Flat amount in euro cents; required when kind=flat' })
  @ValidateIf((o: CreateSurchargeDto) => o.kind === 'flat')
  @IsInt()
  @Min(0)
  amountCents?: number;

  @ApiProperty({ required: false, description: 'Fraction, e.g. 0.10 = +10%; required when kind=percent' })
  @ValidateIf((o: CreateSurchargeDto) => o.kind === 'percent')
  @IsNumber()
  @Min(0)
  @Max(1)
  percent?: number;
}

export class CreatePositionDto {
  @ApiProperty({ description: 'Stable key, unique within the version' })
  @IsString()
  @Length(1, 64)
  key: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  label: string;

  @ApiProperty({ enum: POSITION_UNITS })
  @IsIn(POSITION_UNITS)
  unit: PositionUnit;

  @ApiProperty({ description: 'Net unit price in euro cents' })
  @IsInt()
  @Min(0)
  netPriceCents: number;

  @ApiProperty({ description: 'VAT rate as a fraction, e.g. 0.19' })
  @IsNumber()
  @Min(0)
  @Max(1)
  vatRate: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxQuantity?: number | null;

  @ApiProperty({ required: false, description: 'Trade-specific attribute object', type: Object })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiProperty({ required: false, type: [CreateSurchargeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurchargeDto)
  surcharges?: CreateSurchargeDto[];
}
