import { travelProxy } from "../_proxy";

export async function GET() {
  return travelProxy("/travel/approvals", "GET");
}
