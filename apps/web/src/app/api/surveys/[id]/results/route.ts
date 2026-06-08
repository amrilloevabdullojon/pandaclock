import { surveysProxy } from "../../_proxy";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return surveysProxy(`/surveys/${id}/results`, "GET");
}
