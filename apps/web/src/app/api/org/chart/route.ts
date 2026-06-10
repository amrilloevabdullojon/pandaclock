import { orgProxy } from "../_proxy";

export async function GET() {
  return orgProxy("/org/chart", "GET");
}
