import { recruitmentProxy } from "../_proxy";

export async function GET() {
  return recruitmentProxy("/recruitment/analytics", "GET");
}
