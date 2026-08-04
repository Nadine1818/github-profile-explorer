import { NextRequest, NextResponse } from "next/server";
import { getProfile, GitHubApiError } from "@/lib/github";
import { summarizeProfile } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = body?.username?.trim();

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  try {
    const profile = await getProfile(username);
    const summary = await summarizeProfile(profile);
    return NextResponse.json({ summary });
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message.includes("GROQ_API_KEY")) {
      return NextResponse.json(
        { error: "AI summary is unavailable: server is missing an API key" },
        { status: 503 }
      );
    }
    console.error("Failed to summarize profile", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
