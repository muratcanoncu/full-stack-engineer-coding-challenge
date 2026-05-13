import { ApiProperty } from '@nestjs/swagger';
import { Craftsman } from '../entities/craftsman.entity';

export class CraftsmanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  vatNumber: string | null;

  @ApiProperty({ nullable: true })
  addressLine1: string | null;

  @ApiProperty({ nullable: true })
  addressLine2: string | null;

  @ApiProperty({ nullable: true })
  postalCode: string | null;

  @ApiProperty({ nullable: true })
  city: string | null;

  @ApiProperty({ nullable: true })
  country: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: [String], description: 'Active trade codes' })
  trades: string[];

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  static from(c: Craftsman): CraftsmanResponseDto {
    return {
      id: c.id,
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      vatNumber: c.vatNumber,
      addressLine1: c.addressLine1,
      addressLine2: c.addressLine2,
      postalCode: c.postalCode,
      city: c.city,
      country: c.country,
      isActive: c.isActive,
      trades: (c.tradeAssignments ?? []).filter((a) => a.isActive).map((a) => a.trade),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
