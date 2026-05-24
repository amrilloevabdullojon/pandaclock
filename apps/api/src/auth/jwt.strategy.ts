import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenant: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequestUser {
  id: string;
  email: string;
  role: string;
  tenantSlug: string;
}

const tenantSlugFromRequest = (req: Request): string | null => {
  if (req.tenant?.slug) {
    return req.tenant.slug;
  }
  const header = req.headers["x-tenant-slug"];
  return typeof header === "string" ? header : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "dev-secret-change-me",
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): AuthRequestUser {
    const requestTenant = tenantSlugFromRequest(req);
    if (!requestTenant || requestTenant !== payload.tenant) {
      throw new UnauthorizedException({ code: "TENANT_MISMATCH" });
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantSlug: payload.tenant,
    };
  }
}
