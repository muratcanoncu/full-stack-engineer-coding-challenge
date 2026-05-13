import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@sandbox/types';

export const ROLES_KEY = 'roles';

/**
 * Annotate a controller method with the roles allowed to call it. Used by
 * `RolesGuard` to gate access. Apply both `JwtAuthGuard` and `RolesGuard` in
 * `@UseGuards(...)` for the role check to take effect.
 *
 * @example
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN)
 *   @Get('admin-only')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
