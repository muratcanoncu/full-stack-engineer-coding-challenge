import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '@sandbox/auth';
import { UserRole } from '@sandbox/types';
import { TradesService } from './trades.service';
import { TradeConfigResponseDto } from './dto/trade-config-response.dto';

@ApiTags('Trades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trades')
export class TradesController {
  constructor(private readonly service: TradesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'List trade configurations' })
  @ApiResponse({ status: 200, type: [TradeConfigResponseDto] })
  list(): Promise<TradeConfigResponseDto[]> {
    return this.service.list();
  }

  @Get(':trade')
  @Roles(UserRole.ADMIN, UserRole.CRAFTSMAN)
  @ApiOperation({ summary: 'Get one trade configuration by trade code' })
  @ApiResponse({ status: 200, type: TradeConfigResponseDto })
  findOne(@Param('trade') trade: string): Promise<TradeConfigResponseDto> {
    return this.service.findByCode(trade);
  }
}
