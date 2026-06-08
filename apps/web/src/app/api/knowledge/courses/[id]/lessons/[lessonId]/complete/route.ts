import { knowledgeProxy } from "../../../../../_proxy";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string; lessonId: string }> },
) {
  const { id, lessonId } = await ctx.params;
  return knowledgeProxy(`/knowledge/courses/${id}/lessons/${lessonId}/complete`, "POST");
}
