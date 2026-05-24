/** Pandaclock tenant — каждая компания-клиент. */

export type TenantStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

export type Industry = "IT" | "HORECA" | "CALL_CENTER" | "BANK" | "OTHER";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  industry: Industry | null;
  country: string;
  timezone: string;
  status: TenantStatus;
  schemaName: string;
  createdAt: Date;
  trialEndsAt: Date | null;
  metadata: Record<string, unknown> | null;
}

export type PlanCode = "STARTER" | "BUSINESS" | "PRO" | "ENTERPRISE";

export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface Subscription {
  id: string;
  tenantId: string;
  plan: PlanCode;
  employeesLimit: number;
  modules: Record<string, boolean>;
  priceAmount: number;
  priceCurrency: string;
  billingPeriod: BillingPeriod;
  startedAt: Date;
  expiresAt: Date;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  industry?: Industry;
  employeesRange: "1-10" | "11-50" | "51-200" | "200-500" | "500+";
  admin: {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone?: string;
    password: string;
  };
}
