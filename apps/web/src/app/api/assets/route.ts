import { assetsProxy } from "./_proxy";

export async function GET(request: Request) {
  return assetsProxy("/assets", "GET", undefined, new URL(request.url).searchParams.toString());
}
export async function POST(request: Request) {
  return assetsProxy("/assets", "POST", request);
}
