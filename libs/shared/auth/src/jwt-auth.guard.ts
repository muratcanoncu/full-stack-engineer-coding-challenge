import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards endpoints by requiring a valid `Authorization: Bearer <jwt>` header.
 * The token is verified by the `JwtStrategy` registered in the pricing-service
 * auth module. The decoded payload is attached to `request.user`.
 *
 * Use together with `RolesGuard` + `@Roles(...)` to add role checks.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
