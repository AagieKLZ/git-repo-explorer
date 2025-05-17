import { z } from "zod";


const RepoDataSchema = z.object({
    default_branch: z.string(),
});

const BranchDataSchema = z.object({
    name: z.string(),
    commit: z.object({
        sha: z.string(),
        url: z.string(),
    }),
    protected: z.boolean(),
});

const TreeDataSchema = z.object({
    sha: z.string(),
    url: z.string(),
    tree: z.array(z.object({
        path: z.string(),
        mode: z.string(),
        type: z.enum(["blob", "tree"]),
        sha: z.string(),
        size: z.number().optional(),
        url: z.string(),
    })),
    truncated: z.boolean(),
});

const RateLimitDataSchema = z.object({
    resources: z.object({
        core: z.object({
            remaining: z.number(),
            reset: z.number(),
        }),
    }),
});
export interface CoreRateLimitInfo {
  remaining: number;
  reset: number; // Unix epoch in seconds
}

export type GitHubRateLimitResponse = z.infer<typeof RateLimitDataSchema>;

/**
 * A client for interacting with the GitHub API.
 */
export class GitHubClient {
    private readonly baseUrl = "https://api.github.com";
    private readonly headers: { Authorization: string };

    /**
     * Creates an instance of GitHubClient.
     * @throws {Error} If GITHUB_ACCESS_TOKEN environment variable is not set.
     */
    constructor() {
        const token = process.env.GITHUB_ACCESS_TOKEN;
        if (!token) {
            throw new Error("GITHUB_ACCESS_TOKEN environment variable is not set.");
        }
        this.headers = {
            Authorization: `Bearer ${token}`,
        };
    }

    /**
     * Fetches repository data, including the default branch.
     * @param {string} owner - The owner of the repository.
     * @param {string} repo - The name of the repository.
     * @returns {Promise<RepoDataSchema>} A promise that resolves with the repository data.
     * @throws {Error} If the fetch operation fails.
     */
    async getRepoInfo(owner: string, repo: string) {
        if (!owner || !repo) {
            throw new Error("Owner and repo must be provided to fetch repo info.");
        }
        const url = `${this.baseUrl}/repos/${owner}/${repo}`;
        const response = await fetch(url, { headers: this.headers });

        if (!response.ok) {
            console.error("Failed to fetch repo:", response.status, response.statusText, await response.text());
            throw new Error(`Failed to fetch repo: ${response.statusText}`);
        }

        const data = await response.json();
        return RepoDataSchema.parse(data);
    }

    /**
     * Fetches data for a specific branch.
     * @param {string} owner - The owner of the repository.
     * @param {string} repo - The name of the repository.
     * @param {string} branch - The name of the branch.
     * @returns {Promise<BranchDataSchema>} A promise that resolves with the branch data.
     * @throws {Error} If the fetch operation fails.
     */
    async getBranch(owner: string, repo: string, branch: string) {
        if (!owner || !repo) {
            throw new Error("Owner and repo must be provided to fetch branch info.");
        }
        const url = `${this.baseUrl}/repos/${owner}/${repo}/branches/${branch}`;
        const response = await fetch(url, { headers: this.headers });

        if (!response.ok) {
            console.error("Failed to fetch branch:", response.status, response.statusText, await response.text());
            throw new Error(`Failed to fetch branch: ${response.statusText}`);
        }

        const data = await response.json();
        return BranchDataSchema.parse(data);
    }

    /**
     * Fetches the tree files for a specific branch recursively.
     * @param {string} owner - The owner of the repository.
     * @param {string} repo - The name of the repository.
     * @param {string} branchOrSha - The name of the branch or the SHA of the commit.
     * @returns {Promise<TreeDataSchema>} A promise that resolves with the tree data.
     * @throws {Error} If the fetch operation fails.
     */
    async getTreeFiles(owner: string, repo: string, branchOrSha: string) {
        if (!owner || !repo) {
            throw new Error("Owner and repo must be provided to fetch tree files.");
        }
        const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branchOrSha}`;
        const response = await fetch(url, { headers: this.headers });

        if (!response.ok) {
            console.error("Failed to fetch tree files:", response.status, response.statusText, await response.text());
            throw new Error(`Failed to fetch tree files: ${response.statusText}`);
        }

        const data = await response.json();
        return TreeDataSchema.parse(data);
    }

    /**
     * Checks if a repository exists.
     * @param {string} owner - The owner of the repository.
     * @param {string} repo - The name of the repository.
     * @returns {Promise<boolean>} A promise that resolves to a boolean indicating if the repository exists.
     * @throws {Error} If an unexpected error occurs during the fetch operation.
     */
    async checkRepoExists(owner: string, repo: string): Promise<boolean> {
        if (!owner || !repo) {
            throw new Error("Owner and repo must be provided to check repository existence.");
        }
        const url = `${this.baseUrl}/repos/${owner}/${repo}`;
        const response = await fetch(url, { headers: this.headers });

        if (response.status === 404) {
            return false;
        }

        if (!response.ok) {
            console.error("Failed to check repo existence:", response.status, response.statusText, await response.text());
            throw new Error(`Failed to check repo existence: ${response.statusText}`);
        }

        return true;
    }

    /**
     * Fetches the current GitHub API rate limit status.
     * @returns A promise that resolves with the rate limit data.
     * @throws {Error} If the fetch operation fails.
     */
    async getRateLimit(): Promise<GitHubRateLimitResponse> {
        const url = `${this.baseUrl}/rate_limit`;
        const response = await fetch(url, { headers: this.headers });

        if (!response.ok) {
            let errorDetails = `Failed to fetch rate limit: ${response.status} ${response.statusText}`;
            const errorData = await response.json();
            if (errorData?.message) {
                errorDetails = `${errorDetails} - ${errorData.message}`;
            }
            throw new Error(errorDetails);
        }
        const data = await response.json();
        return RateLimitDataSchema.parse(data);
    }
}