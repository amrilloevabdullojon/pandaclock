import { announcementsProxy } from "../../_proxy";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return announcementsProxy(`/announcements/${id}/read`, "POST");
}
