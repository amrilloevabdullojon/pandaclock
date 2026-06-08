import { surveysProxy } from "../_proxy";

export async function GET() {
  return surveysProxy("/surveys/active", "GET");
}
