import { travelProxy } from "../_proxy";

export async function GET(request: Request) {
  return travelProxy(
    "/travel/trips",
    "GET",
    undefined,
    new URL(request.url).searchParams.toString(),
  );
}
export async function POST(request: Request) {
  return travelProxy("/travel/trips", "POST", request);
}
