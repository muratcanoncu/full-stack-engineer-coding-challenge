import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { DiscountAppliesTo, DiscountKind } from '../entities/catalog-discount.entity';

const DISCOUNT_KINDS: DiscountKind[] = ['flat', 'percent'];

export class CreateDiscountDto {
  @ApiProperty({ description: 'Stable key, unique within the version' })
  @IsString()
  @Length(1, 64)
  key: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  label: string;

  @ApiProperty({ enum: DISCOUNT_KINDS })
  @IsIn(DISCOUNT_KINDS)
  kind: DiscountKind;

  @ApiProperty({ required: false, description: 'Flat amount in euro cents; required when kind=flat' })
  @ValidateIf((o: CreateDiscountDto) => o.kind === 'flat')
  @IsInt()
  @Min(0)
  amountCents?: number;

  @ApiProperty({ required: false, description: 'Fraction, e.g. 0.10 = 10% off; required when kind=percent' })
  @ValidateIf((o: CreateDiscountDto) => o.kind === 'percent')
  @IsNumber()
  @Min(0)
  @Max(1)
  percent?: number;

  @ApiProperty({ required: false, description: 'Optional cap in euro cents for a percent discount' })
  @IsOptional()
  @IsInt()
  @Min(0)
  capCents?: number;

  @ApiProperty({
    required: false,
    description: "Either 'subtotal' or { positionKeys: string[] }. Defaults to 'subtotal'.",
    default: 'subtotal',
  })
  // Union shape (string | object) is validated structurally in the service.
  @Allow()
  appliesTo?: DiscountAppliesTo;

  @ApiProperty({ required: false, description: 'Application order; lower runs first. Defaults to array order.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
