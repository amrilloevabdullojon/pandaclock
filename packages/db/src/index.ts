export { prisma } from "./client.js";
export { PrismaClient } from "@prisma/client";
export { TENANT_TEMPLATE_SQL, dropTenantSchemaSql } from "./tenant-template.js";
export type {
  Tenant,
  Subscription,
  BillingTransaction,
  TenantInvitation,
  PlatformAdmin,
  TenantStatus,
  PlanCode,
  BillingPeriod,
  PaymentProvider,
  TransactionStatus,
  InvitationStatus,
  Prisma,
} from "@prisma/client";
