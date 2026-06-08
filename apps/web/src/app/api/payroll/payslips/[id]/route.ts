import { payrollProxy } from "../../_proxy";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return payrollProxy(`/payroll/payslips/${id}`, "PATCH", request);
}
