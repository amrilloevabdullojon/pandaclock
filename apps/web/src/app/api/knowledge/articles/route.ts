import { knowledgeProxy } from "../_proxy";

export async function GET(request: Request) {
  return knowledgeProxy(
    "/knowledge/articles",
    "GET",
    undefined,
    new URL(request.url).searchParams.toString(),
  );
}
export async function POST(request: Request) {
  return knowledgeProxy("/knowledge/articles", "POST", request);
}
