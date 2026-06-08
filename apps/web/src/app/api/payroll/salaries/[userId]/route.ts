import { payrollProxy } from "../../_proxy";

export async function PUT(request: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  return payrollProxy(`/payroll/salaries/${userId}`, "PUT", request);
}
