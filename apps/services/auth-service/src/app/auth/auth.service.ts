import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '@sandbox/types';
import { User } from './entities/user.entity';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      craftsmanId: user.craftsmanId,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const decoded = this.jwt.decode(accessToken) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    this.logger.log(`user ${user.email} logged in`);

    return {
      accessToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
        craftsmanId: user.craftsmanId,
      },
    };
  }
}
