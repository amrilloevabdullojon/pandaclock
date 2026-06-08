import { payrollProxy } from "../_proxy";

export async function GET() {
  return payrollProxy("/payroll/runs", "GET");
}
export async function POST(request: Request) {
  return payrollProxy("/payroll/runs", "POST", request);
}
