import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "pandaclock:roles";

export type UserRole = "EMPLOYEE" | "MANAGER" | "HR" | "ADMIN" | "OWNER";

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
