import { GitHubClient } from "@/lib/github";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
	url: z.string().url(),
});

interface GitHubTreeItem {
	path: string;
	mode: string;
	type: string;
	sha: string;
	size?: number;
	url?: string;
}

/**
 * Converts an async iterator to a ReadableStream.
 * @param iterator {AsyncGenerator<Uint8Array, void, unknown>} - The async iterator to convert.
 * @returns {ReadableStream} A ReadableStream.
 */
function iteratorToStream(iterator: AsyncGenerator<Uint8Array, void, unknown>): ReadableStream {
	return new ReadableStream({
		async pull(controller) {
			const { value, done } = await iterator.next();
			if (done) {
				controller.close();
			} else {
				controller.enqueue(value);
			}
		},
	});
}

/**
 * Async generator to fetch and yield only GitHub file data (blobs).
 * @param githubClient {GitHubClient} - The GitHub client to use.
 * @param branchName {string} - The branch name to fetch.
 * @param owner {string} - The owner of the repository.
 * @param repo {string} - The repository name.
 * @returns {AsyncGenerator<Uint8Array, void, unknown>} An async generator that yields GitHub file data (blobs).
 */
async function* makeGithubDataIterator(
	githubClient: GitHubClient,
	branchName: string,
	owner: string,
	repo: string,
): AsyncGenerator<Uint8Array, void, unknown> {
	const encoder = new TextEncoder();
	function streamResponse(data: object) {
		return encoder.encode(JSON.stringify(data) + "\n");
	}

	const yieldedBlobShas = new Set<string>();
	let fileCounter = 0;
	let treeCounter = 0;

	try {
		let branchData;
		try {
			branchData = await githubClient.getBranch(owner, repo, branchName);
			yield streamResponse({ type: "branch", name: branchName });
		} catch (e: unknown) {
			const baseErrorMessage = e instanceof Error ? e.message : String(e);
			const errorMessage = baseErrorMessage.includes("404") ?
				`Branch '${branchName}' not found in repository ${owner}/${repo}.` :
				`Failed to fetch branch '${branchName}': ${baseErrorMessage}`;
			yield streamResponse({ type: "error", message: errorMessage });
			return;
		}

		const initialTreeSha = branchData.commit.sha;
		
		yield streamResponse({ 
			type: "status", 
			message: `Starting to process repository files...`,
			files_processed: fileCounter
		});
		
		let treeFiles: GitHubTreeItem[] = [];
		
		try {

			const { tree: rootTree } = await githubClient.getTreeFiles(owner, repo, initialTreeSha);
			
			yield streamResponse({ 
				type: "status", 
				message: `Found root directory with ${rootTree.length} items`,
				files_processed: fileCounter
			});
			
			for (const item of rootTree) {
				if (item.type === "blob") {
					yield streamResponse(item);
					yieldedBlobShas.add(item.sha);
					fileCounter++;
				} else if (item.type === "tree") {
					treeFiles.push(item);
					treeCounter++;
				}
			}
			
			if (fileCounter > 0) {
				yield streamResponse({ 
					type: "status", 
					message: `Processed ${fileCounter} files in root directory`,
					files_processed: fileCounter
				});
			}
			
			const processedTreeShas = new Set<string>();
			
			if (treeFiles.length > 0) {
				yield streamResponse({ 
					type: "status", 
					message: `Found ${treeFiles.length} directories to process`,
					files_processed: fileCounter
				});
			}
			
			let hasNewTrees = true;
			let iterationCount = 0;
			
			while (hasNewTrees) {
				hasNewTrees = false;
				iterationCount++;
				
				const currentTreeBatch: GitHubTreeItem[] = [...treeFiles];
				treeFiles = [];
				
				yield streamResponse({ 
					type: "status", 
					message: `Processing batch ${iterationCount} with ${currentTreeBatch.length} directories`,
					files_processed: fileCounter
				});
				
				let processingCounter = 0;
				let filesBatchCounter = 0;
				
				for (const treeItem of currentTreeBatch) {
					if (processedTreeShas.has(treeItem.sha)) {
						continue;
					}
					
					processedTreeShas.add(treeItem.sha);
					hasNewTrees = true;
					processingCounter++;
					
					yield streamResponse({ 
						type: "status", 
						message: `Processing directory: ${treeItem.path}`,
						files_processed: fileCounter
					});
					
					try {
						const { tree: subTree } = await githubClient.getTreeFiles(owner, repo, treeItem.sha);
						
						for (const item of subTree) {
							const fullPath: string = `${treeItem.path}/${item.path}`;
							const itemWithFullPath: GitHubTreeItem = { ...item, path: fullPath };
							
							if (item.type === "blob") {
								if (!yieldedBlobShas.has(item.sha)) {
									yield streamResponse(itemWithFullPath);
									yieldedBlobShas.add(item.sha);
									fileCounter++;
									filesBatchCounter++;
									
									if (filesBatchCounter % 5 === 0) {
										yield streamResponse({ 
											type: "status", 
											message: `Found ${filesBatchCounter} more files (total: ${fileCounter})`,
											files_processed: fileCounter
										});
									}
								}
							} else if (item.type === "tree") {
								if (!processedTreeShas.has(item.sha)) {
									treeFiles.push(itemWithFullPath);
									treeCounter++;
								}
							}
						}
						
						yield streamResponse({ 
							type: "status", 
							message: `Completed directory ${treeItem.path}: Found ${filesBatchCounter} files (total: ${fileCounter})`,
							files_processed: fileCounter
						});
						filesBatchCounter = 0;
						
					} catch (error: unknown) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						console.error(`Error processing tree ${treeItem.path}: ${errorMessage}`);
						
						yield streamResponse({ 
							type: "warning", 
							message: `Skipped directory ${treeItem.path} due to error: ${errorMessage}`,
							files_processed: fileCounter
						});
					}
				}
				
				if (processingCounter > 0) {
					yield streamResponse({ 
						type: "status", 
						message: `Completed batch ${iterationCount}: processed ${processingCounter} directories, found ${fileCounter} files total`,
						files_processed: fileCounter
					});
				}
				
				if (treeFiles.length > 0) {
					yield streamResponse({ 
						type: "status", 
						message: `Found ${treeFiles.length} more directories to process in the next batch`,
						files_processed: fileCounter
					});
				}
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error("Error fetching repository structure:", errorMessage);
			yield streamResponse({
				type: "error",
				message: `Error fetching repository structure: ${errorMessage}`
			});
		}
		
		console.log(`Completed processing. Found ${fileCounter} files across ${treeCounter} directories.`);
		yield streamResponse({
			type: "complete",
			total_files: fileCounter,
			total_directories: treeCounter
		});
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("Critical error in makeGithubDataIterator:", errorMessage);
		yield streamResponse({
			type: "error",
			message: `Critical error during stream generation: ${errorMessage}`
		});
	}
}

export async function POST(req: NextRequest) {
	let body;
	try {
		body = await req.json();
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : String(e);
		console.error("Error parsing request body:", errorMessage);
		return NextResponse.json(
			{ error: "Invalid JSON in request body" },
			{ status: 400, statusText: "BAD_REQUEST" },
		);
	}

	const parsedBody = schema.safeParse(body);

	if (!parsedBody.success) {
		return NextResponse.json(
			{ error: `Invalid request body - ${parsedBody.error.message}` },
			{ status: 400, statusText: "BAD_REQUEST" },
		);
	}

	const { url } = parsedBody.data;
	const formattedUrl = url.replace(/^https?:\/\/github\.com\//, "").split("/");
	const [owner, repo] = formattedUrl;

	if (!owner || !repo) {
		return NextResponse.json(
			{ error: "Invalid GitHub URL: Missing owner or repository." },
			{ status: 400, statusText: "BAD_REQUEST" },
		);
	}

	const githubClient = new GitHubClient();
	let branchToUse: string;

	if (formattedUrl.length < 3 || (formattedUrl.length === 3 && !formattedUrl[2])) {
		try {
			const repoData = await githubClient.getRepoInfo(owner, repo);
			branchToUse = repoData.default_branch;
		} catch (e: unknown) {
			const status = e instanceof Error && e.message.includes("404") ? 404 : 500;
			return NextResponse.json(
				{ error: `Failed to fetch repository info for default branch: ${e instanceof Error ? e.message : String(e)}` },
				{ status, statusText: status === 404 ? "NOT_FOUND" : "SERVER_ERROR" },
			);
		}
	} else {
		const pathSegments = formattedUrl.slice(2);
		if (pathSegments[0] === "tree" && pathSegments.length > 1 && pathSegments[1]) {
			branchToUse = pathSegments[1];
		} else if (pathSegments[0] !== "tree" && pathSegments[0] !== "blob" && pathSegments[0]) {
			branchToUse = pathSegments[0];
		} else {
			return NextResponse.json(
				{ error: "Invalid URL format: Could not determine branch from path." },
				{ status: 400, statusText: "BAD_REQUEST" },
			);
		}
	}
	
	if (!branchToUse) {
		try {
			const repoData = await githubClient.getRepoInfo(owner, repo);
			branchToUse = repoData.default_branch;
			console.warn(`Branch could not be determined, falling back to default branch: ${branchToUse}`);
		} catch (e: unknown) {
			const status = e instanceof Error && e.message.includes("404") ? 404 : 500;
			return NextResponse.json(
				{ error: `Branch could not be determined and failed to fetch default branch: ${e instanceof Error ? e.message : String(e)}` },
				{ status, statusText: status === 404 ? "NOT_FOUND" : "SERVER_ERROR" },
			);
		}
	}

	const iterator = makeGithubDataIterator(githubClient, branchToUse, owner, repo);
	const stream = iteratorToStream(iterator);

	return new Response(stream, {
		headers: {
			"Content-Type": "application/x-ndjson; charset=utf-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
} 