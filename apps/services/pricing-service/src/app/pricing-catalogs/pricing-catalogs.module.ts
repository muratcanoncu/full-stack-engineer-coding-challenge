import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Craftsman } from '../craftsmen/entities/craftsman.entity';
import { CatalogVersion } from './entities/catalog-version.entity';
import { CatalogPosition } from './entities/catalog-position.entity';
import { PositionSurcharge } from './entities/position-surcharge.entity';
import { CatalogDiscount } from './entities/catalog-discount.entity';
import { PricingCatalogsService } from './pricing-catalogs.service';
import { PricingCatalogsController } from './pricing-catalogs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CatalogVersion,
      CatalogPosition,
      PositionSurcharge,
      CatalogDiscount,
      Craftsman,
    ]),
  ],
  providers: [PricingCatalogsService],
  controllers: [PricingCatalogsController],
  exports: [PricingCatalogsService],
})
export class PricingCatalogsModule {}
