import { performanceProxy } from "../_proxy";

export async function GET(request: Request) {
  return performanceProxy(
    "/performance/goals",
    "GET",
    undefined,
    new URL(request.url).searchParams.toString(),
  );
}
export async function POST(request: Request) {
  return performanceProxy("/performance/goals", "POST", request);
}
