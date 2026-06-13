import { Test } from '@nestjs/testing';
import { JwtPayload, UserRole } from '@sandbox/types';

import { PricingCatalogsController } from './pricing-catalogs.controller';
import { PricingCatalogsService } from './pricing-catalogs.service';
import { CreateCatalogVersionDto } from './dto/create-catalog-version.dto';

const user: JwtPayload = {
  sub: 'admin-id',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
  craftsmanId: null,
};

describe('PricingCatalogsController', () => {
  let controller: PricingCatalogsController;
  let service: { [K in keyof PricingCatalogsService]?: jest.Mock };

  beforeEach(async () => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'v1' }),
      create: jest.fn().mockResolvedValue({ id: 'v1' }),
      update: jest.fn().mockResolvedValue({ id: 'v1' }),
      publish: jest.fn().mockResolvedValue({ id: 'v1' }),
      quoteByVersion: jest.fn().mockResolvedValue({ totals: {} }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PricingCatalogsController],
      providers: [{ provide: PricingCatalogsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(PricingCatalogsController);
  });

  it('delegates list to the service with the query and user', async () => {
    await controller.list({ trade: 'HVAC' }, user);
    expect(service.list).toHaveBeenCalledWith({ trade: 'HVAC' }, user);
  });

  it('delegates findOne to the service', async () => {
    await controller.findOne('v1', user);
    expect(service.findOne).toHaveBeenCalledWith('v1', user);
  });

  it('delegates create to the service', async () => {
    const dto: CreateCatalogVersionDto = {
      craftsmanId: 'craftsman-1',
      trade: 'HVAC',
      effectiveFrom: '2026-06-01',
    };
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('delegates update to the service', async () => {
    await controller.update('v1', { effectiveFrom: '2026-07-01' }, user);
    expect(service.update).toHaveBeenCalledWith('v1', { effectiveFrom: '2026-07-01' }, user);
  });

  it('delegates publish to the service', async () => {
    await controller.publish('v1', user);
    expect(service.publish).toHaveBeenCalledWith('v1', user);
  });

  it('delegates quoteByVersion to the service', async () => {
    const dto = { lines: [{ positionKey: 'p1', quantity: 2 }] };
    await controller.quoteByVersion('v1', dto, user);
    expect(service.quoteByVersion).toHaveBeenCalledWith('v1', dto, user);
  });
});
