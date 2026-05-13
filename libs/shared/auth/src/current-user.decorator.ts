import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { JwtPayload } from '@sandbox/types';

/**
 * Resolves the authenticated user attached by `JwtAuthGuard`. Use this in
 * controllers instead of reading `request.user` directly.
 *
 * @example
 *   @Get('me')
 *   me(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest<{ user: JwtPayload }>().user;
  },
);
