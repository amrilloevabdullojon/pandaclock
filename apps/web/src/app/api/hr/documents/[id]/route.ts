import { hrProxy } from "../../_proxy";

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return hrProxy(`/hr/documents/${id}`, "DELETE");
}
