import { knowledgeProxy } from "../../_proxy";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return knowledgeProxy(`/knowledge/articles/${id}`, "GET");
}
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return knowledgeProxy(`/knowledge/articles/${id}`, "PATCH", request);
}
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return knowledgeProxy(`/knowledge/articles/${id}`, "DELETE");
}
