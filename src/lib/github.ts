import { z } from "zod";

/**
 * Represents the structure of repository data returned by the GitHub API.
 */
const RepoDataSchema = z.object({
    default_branch: z.string(),
    // Add other relevant fields from the repo response if needed
});

/**
 * Represents the structure of branch data returned by the GitHub API.
 */
const BranchDataSchema = z.object({
    name: z.string(),
    commit: z.object({
        sha: z.string(),
        url: z.string(),
    }),
    protected: z.boolean(),
    // Add other relevant fields from the branch response if needed
});

/**
 * Represents the structure of tree data returned by the GitHub API.
 */
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


/**
 * A client for interacting with the GitHub API.
 */
export class GitHubClient {
    private owner: string;
    private repo: string;
    private baseUrl = "https://api.github.com";
    private headers: { Authorization: string };

    /**
     * Creates an instance of GitHubClient.
     * @param owner - The owner of the repository.
     * @param repo - The name of the repository.
     * @throws {Error} If GITHUB_ACCESS_TOKEN environment variable is not set.
     */
    constructor(owner: string, repo: string) {
        this.owner = owner;
        this.repo = repo;
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
     * @returns A promise that resolves with the repository data.
     * @throws {Error} If the fetch operation fails.
     */
    async getRepoInfo() {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}`;
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
     * @param branch - The name of the branch.
     * @returns A promise that resolves with the branch data.
     * @throws {Error} If the fetch operation fails.
     */
    async getBranch(branch: string) {
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/branches/${branch}`;
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
     * @param branch - The name of the branch.
     * @returns A promise that resolves with the tree data.
     * @throws {Error} If the fetch operation fails.
     */
    async getTreeFiles(branch: string) {
        // Add '?recursive=true' to get all files in the tree
        const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/git/trees/${branch}?recursive=true`;
        const response = await fetch(url, { headers: this.headers });

        if (!response.ok) {
            console.error("Failed to fetch tree files:", response.status, response.statusText, await response.text());
            throw new Error(`Failed to fetch tree files: ${response.statusText}`);
        }

        const data = await response.json();
        return TreeDataSchema.parse(data);
    }
}

// Keep old functions for compatibility if needed, or remove them if fully refactored.
// export async function getDefaultBranch(
//     { owner, repo }: { owner: string, repo: string },
// ) {
//     const url = `https://api.github.com/repos/${owner}/${repo}`;

//     const response = await fetch(url, {
//         headers: {
//             Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
//         }
//     })

//     if (!response.ok) {
//         throw new Error("Failed to fetch repo");
//     }

//     const data = await response.json();

//     return data;
// }

// export async function getBranch(
//     { owner, repo, branch }: { owner: string, repo: string, branch: string },
// ) {
//     const url = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;

//     const response = await fetch(url, {
//         headers: {
//             Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
//         }
//     })

//     if (!response.ok) {
//         throw new Error("Failed to fetch branch");
//     }

//     const data = await response.json();

//     return data;
// }

// export async function getTreeFiles(
//     { owner, repo, branch }: { owner: string, repo: string, branch: string },
// ) {
//     const url = `https://api.github.com/repos/${owner}/${repo}/trees/${branch}`;

//     const response = await fetch(url, {
//         headers: {
//             Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
//         }
//     })

//     if (!response.ok) {
//         console.log(response.status, response.statusText)
//         const body = await response.json();
//         console.log(body);
//         throw new Error("Failed to fetch commit files");
//     }

//     const data = await response.json();

//     return data;
// }