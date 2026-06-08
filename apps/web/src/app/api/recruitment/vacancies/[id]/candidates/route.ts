import { recruitmentProxy } from "../../../_proxy";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return recruitmentProxy(`/recruitment/vacancies/${id}/candidates`, "GET");
}
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return recruitmentProxy(`/recruitment/vacancies/${id}/candidates`, "POST", request);
}
