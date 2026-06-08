import { recruitmentProxy } from "../_proxy";

export async function GET(request: Request) {
  return recruitmentProxy(
    "/recruitment/vacancies",
    "GET",
    undefined,
    new URL(request.url).searchParams.toString(),
  );
}
export async function POST(request: Request) {
  return recruitmentProxy("/recruitment/vacancies", "POST", request);
}
