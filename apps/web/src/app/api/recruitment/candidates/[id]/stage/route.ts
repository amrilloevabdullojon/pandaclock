import { recruitmentProxy } from "../../../_proxy";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return recruitmentProxy(`/recruitment/candidates/${id}/stage`, "PATCH", request);
}
