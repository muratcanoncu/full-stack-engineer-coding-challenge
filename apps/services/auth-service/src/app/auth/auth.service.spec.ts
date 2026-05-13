import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserRole } from '@sandbox/types';

import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findOne: jest.Mock };
  let jwt: { signAsync: jest.Mock; decode: jest.Mock };

  const passwordHash = bcrypt.hashSync('partner123', 4);

  beforeEach(async () => {
    users = { findOne: jest.fn() };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('token.value'),
      decode: jest.fn().mockReturnValue({ exp: 1900000000 }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users as Partial<Repository<User>> },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('issues a JWT for valid credentials', async () => {
    users.findOne.mockResolvedValue({
      id: 'u1',
      email: 'partner@example.com',
      passwordHash,
      roles: [UserRole.CRAFTSMAN],
      craftsmanId: 'c1',
      isActive: true,
    });
    const result = await service.login({ email: 'partner@example.com', password: 'partner123' });
    expect(result.accessToken).toBe('token.value');
    expect(result.user.craftsmanId).toBe('c1');
  });

  it('rejects unknown email', async () => {
    users.findOne.mockResolvedValue(null);
    await expect(
      service.login({ email: 'noone@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive user', async () => {
    users.findOne.mockResolvedValue({
      id: 'u1',
      email: 'partner@example.com',
      passwordHash,
      roles: [UserRole.CRAFTSMAN],
      craftsmanId: 'c1',
      isActive: false,
    });
    await expect(
      service.login({ email: 'partner@example.com', password: 'partner123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects wrong password', async () => {
    users.findOne.mockResolvedValue({
      id: 'u1',
      email: 'partner@example.com',
      passwordHash,
      roles: [UserRole.CRAFTSMAN],
      craftsmanId: 'c1',
      isActive: true,
    });
    await expect(
      service.login({ email: 'partner@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lowercases the email before lookup', async () => {
    users.findOne.mockResolvedValue({
      id: 'u1',
      email: 'partner@example.com',
      passwordHash,
      roles: [UserRole.CRAFTSMAN],
      craftsmanId: 'c1',
      isActive: true,
    });
    await service.login({ email: 'Partner@Example.com', password: 'partner123' });
    expect(users.findOne).toHaveBeenCalledWith({ where: { email: 'partner@example.com' } });
  });
});
