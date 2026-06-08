import { assetsProxy } from "../_proxy";

export async function GET() {
  return assetsProxy("/assets/my", "GET");
}
