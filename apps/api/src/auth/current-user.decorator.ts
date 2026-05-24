import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthRequestUser } from "./jwt.strategy.js";

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthRequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthRequestUser }>();
    return request.user;
  },
);
