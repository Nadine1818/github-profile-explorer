import { NextRequest, NextResponse } from "next/server";
import { getRepoContext, GitHubApiError } from "@/lib/github";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  try {
    const context = await getRepoContext(owner, repo);
    return NextResponse.json(context);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Failed to fetch repo context", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
