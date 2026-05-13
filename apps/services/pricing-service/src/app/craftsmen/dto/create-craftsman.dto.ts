import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import { TRADE_CODES, TradeCode } from '@sandbox/types';

export class CreateCraftsmanDto {
  @ApiProperty({ example: 'Müller Heizung & Sanitär GmbH' })
  @IsString()
  @Length(1, 255)
  companyName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  vatNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, default: 'Germany' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    required: false,
    description: 'Initial trade assignments. Each trade code must be one of TRADE_CODES.',
    enum: TRADE_CODES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(TRADE_CODES, { each: true })
  trades?: TradeCode[];
}
