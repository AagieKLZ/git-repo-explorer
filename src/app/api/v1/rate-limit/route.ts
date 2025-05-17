import { env } from "@/env";
import { GitHubClient } from "@/lib/github";
import { NextResponse } from "next/server";

export async function GET() {
    if (!env.GITHUB_ACCESS_TOKEN) {
        return NextResponse.json(
            { error: "Server configuration error" },
            { status: 500 }
        );
    }

    try {
        const githubClient = new GitHubClient();
        const rateLimitData = await githubClient.getRateLimit();
        return NextResponse.json(rateLimitData);
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
        return NextResponse.json(
            { error: `Failed to fetch rate limit: ${errorMessage}` },
            { status: 500 }
        );
    }
} 