import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeConfig } from './entities/trade-config.entity';
import { TradeConfigResponseDto } from './dto/trade-config-response.dto';

@Injectable()
export class TradesService {
  constructor(
    @InjectRepository(TradeConfig) private readonly repo: Repository<TradeConfig>,
  ) {}

  async list(): Promise<TradeConfigResponseDto[]> {
    const items = await this.repo.find({ order: { trade: 'ASC' } });
    return items.map(TradeConfigResponseDto.from);
  }

  async findByCode(trade: string): Promise<TradeConfigResponseDto> {
    const found = await this.repo.findOne({ where: { trade } });
    if (!found) {
      throw new NotFoundException(`Trade ${trade} not found`);
    }
    return TradeConfigResponseDto.from(found);
  }
}
