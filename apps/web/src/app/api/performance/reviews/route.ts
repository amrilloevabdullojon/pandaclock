import { performanceProxy } from "../_proxy";

export async function GET(request: Request) {
  return performanceProxy(
    "/performance/reviews",
    "GET",
    undefined,
    new URL(request.url).searchParams.toString(),
  );
}
export async function POST(request: Request) {
  return performanceProxy("/performance/reviews", "POST", request);
}
