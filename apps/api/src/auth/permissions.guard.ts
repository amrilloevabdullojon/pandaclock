import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Permission } from "@pandaclock/types";
import { hasAllPermissions } from "./permissions-catalog.js";
import { PERMISSIONS_KEY } from "./permissions.decorator.js";
import type { AuthRequestUser } from "./jwt.strategy.js";

/**
 * Guard для granular permissions (recommended вместо @Roles на новом коде).
 * Использовать вместе с @RequirePermissions(...).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthRequestUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException({ code: "NO_USER" });
    }

    if (!hasAllPermissions(user.role, required)) {
      throw new ForbiddenException({ code: "MISSING_PERMISSION", required });
    }
    return true;
  }
}
