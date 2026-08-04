import { NextRequest, NextResponse } from "next/server";
import { getProfile, GitHubApiError } from "@/lib/github";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  if (!username || !username.trim()) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  try {
    const profile = await getProfile(username.trim());
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Failed to fetch GitHub profile", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
