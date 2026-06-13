import { Test } from '@nestjs/testing';
import { JwtPayload, UserRole } from '@sandbox/types';

import { CraftsmanQuoteController } from './craftsman-quote.controller';
import { PricingCatalogsService } from './pricing-catalogs.service';

const user: JwtPayload = {
  sub: 'admin-id',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
  craftsmanId: null,
};

describe('CraftsmanQuoteController', () => {
  let controller: CraftsmanQuoteController;
  let service: { quoteActiveByCraftsmanTrade: jest.Mock };

  beforeEach(async () => {
    service = { quoteActiveByCraftsmanTrade: jest.fn().mockResolvedValue({ totals: {} }) };
    const moduleRef = await Test.createTestingModule({
      controllers: [CraftsmanQuoteController],
      providers: [{ provide: PricingCatalogsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(CraftsmanQuoteController);
  });

  it('delegates to the service with craftsmanId, trade, dto and user', async () => {
    const dto = { lines: [{ positionKey: 'p1', quantity: 1 }] };
    await controller.quote('craftsman-1', 'HVAC', dto, user);
    expect(service.quoteActiveByCraftsmanTrade).toHaveBeenCalledWith('craftsman-1', 'HVAC', dto, user);
  });
});
