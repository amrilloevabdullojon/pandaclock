import { surveysProxy } from "./_proxy";

export async function GET() {
  return surveysProxy("/surveys", "GET");
}
export async function POST(request: Request) {
  return surveysProxy("/surveys", "POST", request);
}
