import { announcementsProxy } from "./_proxy";

export async function GET() {
  return announcementsProxy("/announcements", "GET");
}
export async function POST(request: Request) {
  return announcementsProxy("/announcements", "POST", request);
}
