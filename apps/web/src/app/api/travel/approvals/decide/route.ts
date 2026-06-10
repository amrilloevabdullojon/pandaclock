import { travelProxy } from "../../_proxy";

export async function POST(request: Request) {
  return travelProxy("/travel/approvals/decide", "POST", request);
}
