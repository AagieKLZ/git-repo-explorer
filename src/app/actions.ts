"use server";

import { GitHubClient } from "../lib/github";

interface ServerActionResponse {
  owner?: string;
  repo?: string;
  error?: string;
  rateLimitResetTime?: string;
}

const githubRepoRegex = /^https?:\/\/github\.com\/([a-zA-Z0-9\-_]+)\/([a-zA-Z0-9_\-.]+?)(?:\.git)?$/;

export async function checkRateLimitAndProceed(url: string): Promise<ServerActionResponse> {
  const match = githubRepoRegex.exec(url);

  if (!match?.[1] || !match?.[2]) {
    return { error: "Invalid GitHub repository URL format." };
  }

  const owner = match[1];
  const repo = match[2];

  try {
    const client = new GitHubClient();
    const rateLimitData = await client.getRateLimit();

    if (rateLimitData.resources.core.remaining <= 0) {
      const resetTime = new Date(rateLimitData.resources.core.reset * 1000);
      return {
        error: "GitHub API rate limit exceeded.",
        rateLimitResetTime: `Please wait until ${resetTime.toLocaleTimeString()} to try again.`,
      };
    }

    // Check if repository exists
    const repoExists = await client.checkRepoExists(owner, repo);
    if (!repoExists) {
      return {
        error: `Repository ${owner}/${repo} does not exist or is not accessible.`,
      };
    }

    return { owner, repo };

  } catch (err) {
    console.error("Error checking rate limit:", err);
    if (err instanceof Error) {
      if (err.message.includes("GITHUB_ACCESS_TOKEN environment variable is not set")) {
        return { error: "Server configuration error: GITHUB_ACCESS_TOKEN is missing." };
      }
      if (err.message.startsWith("Failed to fetch rate limit:")) {
        return { error: `GitHub API error: ${err.message}` };
      }
      if (err.message.startsWith("Failed to check repo existence:")) {
        return { error: `GitHub API error: ${err.message}` };
      }
      return { error: `An unexpected error occurred: ${err.message}` };
    }
    return { error: "An unexpected error occurred while checking the rate limit." };
  }
} 