import { orgProxy } from "../_proxy";

export async function GET() {
  return orgProxy("/org/staffing", "GET");
}
export async function POST(request: Request) {
  return orgProxy("/org/staffing", "POST", request);
}
