import { knowledgeProxy } from "../_proxy";

export async function GET() {
  return knowledgeProxy("/knowledge/courses", "GET");
}
export async function POST(request: Request) {
  return knowledgeProxy("/knowledge/courses", "POST", request);
}
