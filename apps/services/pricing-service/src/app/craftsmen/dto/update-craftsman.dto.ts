import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCraftsmanDto } from './create-craftsman.dto';

/**
 * Update payload — all fields optional, no trade reassignment here.
 * Use a dedicated endpoint for changing trade assignments.
 */
export class UpdateCraftsmanDto extends PartialType(
  OmitType(CreateCraftsmanDto, ['trades'] as const),
) {}
