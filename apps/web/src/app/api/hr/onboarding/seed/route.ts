import { hrProxy } from "../../_proxy";

export async function POST(request: Request) {
  return hrProxy("/hr/onboarding/seed", "POST", request);
}
