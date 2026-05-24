import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, type UserRole } from "./roles.decorator.js";
import type { AuthRequestUser } from "./jwt.strategy.js";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
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

    if (!required.includes(user.role as UserRole)) {
      throw new ForbiddenException({ code: "INSUFFICIENT_ROLE", required });
    }
    return true;
  }
}
