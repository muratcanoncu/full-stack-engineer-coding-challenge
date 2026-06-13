import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '@sandbox/auth';
import { JwtPayload, TradeCode, UserRole } from '@sandbox/types';

import { PricingCatalogsService } from './pricing-catalogs.service';
import { QuoteRequestDto } from './dto/quote-request.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';

@ApiTags('Pricing Catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('craftsmen')
export class CraftsmanQuoteController {
  constructor(private readonly service: PricingCatalogsService) {}

  @Post(':id/trades/:trade/quote')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quote against the version currently published and active for this craftsman + trade' })
  @ApiResponse({ status: 200, type: QuoteResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid quote (unknown position, quantity out of range, undeclared surcharge, disabled craftsman)' })
  @ApiResponse({ status: 403, description: 'Caller may not access this craftsman' })
  @ApiResponse({ status: 404, description: 'Craftsman not found or no active published version' })
  quote(
    @Param('id') craftsmanId: string,
    @Param('trade') trade: TradeCode,
    @Body() dto: QuoteRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<QuoteResponseDto> {
    return this.service.quoteActiveByCraftsmanTrade(craftsmanId, trade, dto, user);
  }
}
