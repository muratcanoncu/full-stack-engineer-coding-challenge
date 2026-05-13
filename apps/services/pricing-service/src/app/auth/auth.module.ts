import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

/**
 * Local auth module for pricing-service. Pricing-service does NOT own user
 * identity — that lives in auth-service. This module only:
 *   - registers `JwtStrategy` so `JwtAuthGuard` can validate tokens locally
 *     using the shared `JWT_SECRET`
 *   - re-exports `PassportModule` so other feature modules can rely on guards
 *
 * If you need to add a new module that authenticates users, import this one;
 * never reach into the `auth_service` schema for user lookups.
 */
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
