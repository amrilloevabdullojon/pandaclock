import { payrollProxy } from "../../../_proxy";

export async function GET(_request: Request, ctx: { params: Promise<{ userId: string }> }) {
  const { userId } = await ctx.params;
  return payrollProxy(`/payroll/salaries/${userId}/history`, "GET");
}
