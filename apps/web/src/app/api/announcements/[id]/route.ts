import { announcementsProxy } from "../_proxy";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return announcementsProxy(`/announcements/${id}`, "PATCH", request);
}
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return announcementsProxy(`/announcements/${id}`, "DELETE");
}
