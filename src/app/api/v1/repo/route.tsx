import { GitHubClient } from "@/lib/github";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
	url: z.string().url(),
});

export async function POST(req: NextRequest) {
	const body = await req.json();

	const parsedBody = schema.safeParse(body);

	if (!parsedBody.success) {
		return NextResponse.json(
			{
				error: `Invalid request body - ${parsedBody.error.message}`,
			},
			{
				status: 400,
				statusText: "BAD_REQUEST",
			},
		);
	}

	const { url } = parsedBody.data;

	const formattedUrl = url.replace("https://github.com/", "").split("/");

	let branch = "main";
	const [owner, repo] = formattedUrl;

	// Instantiate the GitHubClient
	const githubClient = new GitHubClient(owner, repo);

	// No branch specified on url)
	if (formattedUrl.length < 3) {
		if (!owner || !repo) {
			return NextResponse.json(
				{
					error: "Invalid request body - Must have a valid owner and repo",
				},
				{
					status: 400,
					statusText: "BAD_REQUEST",
				},
			);
		}

		const repoData = await githubClient.getRepoInfo();

		branch = repoData.default_branch;
	} else {
		const parsedUrl = formattedUrl.filter((item) => item !== "tree");

		if (parsedUrl.length >= 3) {
			branch = parsedUrl[2];
		} else {
			return NextResponse.json(
				{
					error: "Invalid request body - Must have a valid owner and repo",
				},
				{
					status: 400,
					statusText: "BAD_REQUEST",
				},
			);
		}
	}

	// Fetch branch data using the client
	const branchData = await githubClient.getBranch(branch);

	// Fetch tree files using the client
	try {
		const treeFiles = await githubClient.getTreeFiles(branch);

		// Combine or process data as needed
		const responseData = {
			branchInfo: branchData,
			tree: treeFiles.tree,
			truncated: treeFiles.truncated,
		};

		return NextResponse.json(responseData);
	} catch (error) {
		// Handle errors from the GitHub client, e.g., branch not found
		let errorMessage = "Failed to fetch repository data.";
		let statusCode = 500;

		if (error instanceof Error) {
			errorMessage = error.message;
			// Potentially map GitHub API errors (e.g., 404) to specific status codes
			if (errorMessage.includes("404")) {
				// Basic check, might need refinement
				statusCode = 404;
				errorMessage = "Repository or branch not found.";
			}
		}

		return NextResponse.json(
			{
				error: errorMessage,
			},
			{
				status: statusCode,
			},
		);
	}
}
