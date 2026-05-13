import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradeConfig } from './entities/trade-config.entity';
import { TradesService } from './trades.service';

describe('TradesService', () => {
  let service: TradesService;
  let repo: { find: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    repo = { find: jest.fn(), findOne: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        TradesService,
        { provide: getRepositoryToken(TradeConfig), useValue: repo as Partial<Repository<TradeConfig>> },
      ],
    }).compile();
    service = moduleRef.get(TradesService);
  });

  it('list() returns mapped trade configs ordered by trade', async () => {
    repo.find.mockResolvedValue([
      { id: '1', trade: 'HVAC', displayName: 'Heating', isActive: true, metadata: {} },
    ]);
    const result = await service.list();
    expect(repo.find).toHaveBeenCalledWith({ order: { trade: 'ASC' } });
    expect(result[0].trade).toBe('HVAC');
  });

  it('findByCode() returns one config', async () => {
    repo.findOne.mockResolvedValue({
      id: '1',
      trade: 'HVAC',
      displayName: 'Heating',
      isActive: true,
      metadata: {},
    });
    const result = await service.findByCode('HVAC');
    expect(result.trade).toBe('HVAC');
  });

  it('findByCode() throws NotFoundException when trade is unknown', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findByCode('UNKNOWN')).rejects.toBeInstanceOf(NotFoundException);
  });
});
