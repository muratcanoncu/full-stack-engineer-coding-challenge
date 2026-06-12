import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@sandbox/auth';
import { JwtPayload, UserRole } from '@sandbox/types';

import { PricingCatalogsService } from './pricing-catalogs.service';
import { CreateCatalogVersionDto } from './dto/create-catalog-version.dto';
import { UpdateCatalogVersionDto } from './dto/update-catalog-version.dto';
import { QueryCatalogVersionsDto } from './dto/query-catalog-versions.dto';
import {
  CatalogVersionResponseDto,
  CatalogVersionSummaryDto,
} from './dto/catalog-version-response.dto';

@ApiTags('Pricing Catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing-catalogs')
export class PricingCatalogsController {
  constructor(private readonly service: PricingCatalogsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'List catalog versions (newest first), filtered by craftsman and/or trade' })
  @ApiResponse({ status: 200, type: [CatalogVersionSummaryDto] })
  list(
    @Query() query: QueryCatalogVersionsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CatalogVersionSummaryDto[]> {
    return this.service.list(query, user);
  }

  @Get(':versionId')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Get one catalog version with positions, surcharges and discounts' })
  @ApiResponse({ status: 200, type: CatalogVersionResponseDto })
  @ApiResponse({ status: 403, description: 'Caller may not access this catalog' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  findOne(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<CatalogVersionResponseDto> {
    return this.service.findOne(versionId, user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Create a new DRAFT version for a craftsman + trade' })
  @ApiResponse({ status: 201, type: CatalogVersionResponseDto })
  @ApiResponse({ status: 403, description: 'Caller may not create catalogs for this craftsman' })
  create(
    @Body() dto: CreateCatalogVersionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CatalogVersionResponseDto> {
    return this.service.create(dto, user);
  }

  @Patch(':versionId')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Edit a DRAFT version (positions, surcharges, discounts, effectiveFrom)' })
  @ApiResponse({ status: 200, type: CatalogVersionResponseDto })
  @ApiResponse({ status: 400, description: 'Version is published (immutable) or payload invalid' })
  @ApiResponse({ status: 403, description: 'Caller may not edit this catalog' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  update(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateCatalogVersionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<CatalogVersionResponseDto> {
    return this.service.update(versionId, dto, user);
  }
}
