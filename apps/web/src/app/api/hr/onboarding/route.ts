import { hrProxy } from "../_proxy";

export async function GET(request: Request) {
  return hrProxy("/hr/onboarding", "GET", undefined, new URL(request.url).searchParams.toString());
}
export async function POST(request: Request) {
  return hrProxy("/hr/onboarding", "POST", request);
}
