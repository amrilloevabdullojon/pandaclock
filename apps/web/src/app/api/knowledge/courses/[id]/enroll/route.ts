import { knowledgeProxy } from "../../../_proxy";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return knowledgeProxy(`/knowledge/courses/${id}/enroll`, "POST");
}
