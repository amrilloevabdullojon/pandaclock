import { assetsProxy } from "../../_proxy";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return assetsProxy(`/assets/${id}/return`, "POST", request);
}
