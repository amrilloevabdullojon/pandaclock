import { surveysProxy } from "../../_proxy";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return surveysProxy(`/surveys/${id}/respond`, "POST", request);
}
