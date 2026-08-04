import { NextRequest, NextResponse } from "next/server";
import { getProfile, getCommitsLastYear, GitHubApiError } from "@/lib/github";
import { buildMetrics } from "@/lib/metrics";
import { CompareResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const userA = body?.userA?.trim();
  const userB = body?.userB?.trim();

  if (!userA || !userB) {
    return NextResponse.json(
      { error: "Both userA and userB are required" },
      { status: 400 }
    );
  }

  try {
    const [profileA, profileB] = await Promise.all([getProfile(userA), getProfile(userB)]);
    const [commitsA, commitsB] = await Promise.all([
      getCommitsLastYear(userA),
      getCommitsLastYear(userB),
    ]);

    const result: CompareResult = {
      userA: buildMetrics(profileA, commitsA),
      userB: buildMetrics(profileB, commitsB),
    };

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GitHubApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Failed to compare users", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
