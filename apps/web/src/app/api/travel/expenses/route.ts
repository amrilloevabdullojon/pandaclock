import { travelProxy } from "../_proxy";

export async function GET(request: Request) {
  return travelProxy(
    "/travel/expenses",
    "GET",
    undefined,
    new URL(request.url).searchParams.toString(),
  );
}
export async function POST(request: Request) {
  return travelProxy("/travel/expenses", "POST", request);
}
