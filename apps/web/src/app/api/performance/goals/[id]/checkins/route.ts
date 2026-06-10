import { performanceProxy } from "../../../_proxy";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return performanceProxy(`/performance/goals/${id}/checkins`, "GET");
}
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return performanceProxy(`/performance/goals/${id}/checkins`, "POST", request);
}
