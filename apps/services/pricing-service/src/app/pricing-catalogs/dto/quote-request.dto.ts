import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Length, ValidateNested } from 'class-validator';

export class QuoteLineDto {
  @ApiProperty({ description: 'Key of a position declared on the version' })
  @IsString()
  @Length(1, 64)
  positionKey: string;

  @ApiProperty({ description: 'Quantity to price; range checks are enforced by the calculator' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ required: false, type: [String], description: "Keys of the position's surcharges to apply" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appliedSurchargeKeys?: string[];
}

export class QuoteRequestDto {
  @ApiProperty({ type: [QuoteLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  lines: QuoteLineDto[];
}
