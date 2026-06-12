import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCatalogVersionDto } from './create-catalog-version.dto';

/**
 * Edit a DRAFT version. `craftsmanId` and `trade` are immutable once created,
 * so they are omitted here. Providing `positions` / `discounts` replaces the
 * whole collection.
 */
export class UpdateCatalogVersionDto extends PartialType(
  OmitType(CreateCatalogVersionDto, ['craftsmanId', 'trade'] as const),
) {}
