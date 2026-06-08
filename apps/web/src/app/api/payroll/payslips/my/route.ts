import { payrollProxy } from "../../_proxy";

export async function GET() {
  return payrollProxy("/payroll/payslips/my", "GET");
}
