import { travelProxy } from "../../_proxy";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return travelProxy(`/travel/trips/${id}`, "GET");
}
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return travelProxy(`/travel/trips/${id}`, "PATCH", request);
}
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return travelProxy(`/travel/trips/${id}`, "DELETE");
}
