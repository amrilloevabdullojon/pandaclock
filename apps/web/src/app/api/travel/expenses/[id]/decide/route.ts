import { travelProxy } from "../../../_proxy";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return travelProxy(`/travel/expenses/${id}/decide`, "POST", request);
}
