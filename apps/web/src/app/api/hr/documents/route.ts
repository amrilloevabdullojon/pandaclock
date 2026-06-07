import { hrProxy } from "../_proxy";

export async function GET() {
  return hrProxy("/hr/documents", "GET");
}
export async function POST(request: Request) {
  return hrProxy("/hr/documents", "POST", request);
}
