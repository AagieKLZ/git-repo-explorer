import { GitHubClient } from '../github';

// Mock the global fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to keep test output clean
console.error = jest.fn();

describe('GitHubClient', () => {
    let client: GitHubClient;
    const mockToken = 'test-token';

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        process.env.GITHUB_ACCESS_TOKEN = mockToken;
        client = new GitHubClient();
        mockFetch.mockClear();
    });

    afterEach(() => {
        delete process.env.GITHUB_ACCESS_TOKEN;
    });

    describe('constructor', () => {
        it('should throw error if GITHUB_ACCESS_TOKEN is not set', () => {
            delete process.env.GITHUB_ACCESS_TOKEN;
            expect(() => new GitHubClient()).toThrow('GITHUB_ACCESS_TOKEN environment variable is not set.');
        });

        it('should create instance with correct headers', () => {
            const client = new GitHubClient();
            // @ts-expect-error - accessing private property for testing
            expect(client.headers).toEqual({
                Authorization: `Bearer ${mockToken}`,
            });
        });
    });

    describe('getRepoInfo', () => {
        const mockResponse = {
            default_branch: 'main',
        };

        it('should fetch repository info successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.getRepoInfo('owner', 'repo');
            expect(result).toEqual(mockResponse);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/owner/repo',
                expect.objectContaining({
                    headers: { Authorization: `Bearer ${mockToken}` },
                })
            );
        });

        it('should throw error if owner or repo is not provided', async () => {
            await expect(client.getRepoInfo('', 'repo')).rejects.toThrow('Owner and repo must be provided');
            await expect(client.getRepoInfo('owner', '')).rejects.toThrow('Owner and repo must be provided');
        });

        it('should throw error on failed request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: async () => 'Not Found',
            });

            await expect(client.getRepoInfo('owner', 'repo')).rejects.toThrow('Failed to fetch repo: Not Found');
        });
    });

    describe('getBranch', () => {
        const mockResponse = {
            name: 'main',
            commit: {
                sha: '123abc',
                url: 'https://api.github.com/repos/owner/repo/commits/123abc',
            },
            protected: false,
        };

        it('should fetch branch info successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.getBranch('owner', 'repo', 'main');
            expect(result).toEqual(mockResponse);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/owner/repo/branches/main',
                expect.objectContaining({
                    headers: { Authorization: `Bearer ${mockToken}` },
                })
            );
        });

        it('should throw error if owner or repo is not provided', async () => {
            await expect(client.getBranch('', 'repo', 'main')).rejects.toThrow('Owner and repo must be provided');
            await expect(client.getBranch('owner', '', 'main')).rejects.toThrow('Owner and repo must be provided');
        });
    });

    describe('getTreeFiles', () => {
        const mockResponse = {
            sha: '123abc',
            url: 'https://api.github.com/repos/owner/repo/git/trees/123abc',
            tree: [
                {
                    path: 'file.txt',
                    mode: '100644',
                    type: 'blob' as const,
                    sha: '123abc',
                    size: 100,
                    url: 'https://api.github.com/repos/owner/repo/git/blobs/123abc',
                },
            ],
            truncated: false,
        };

        it('should fetch tree files successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.getTreeFiles('owner', 'repo', 'main');
            expect(result).toEqual(mockResponse);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/owner/repo/git/trees/main',
                expect.objectContaining({
                    headers: { Authorization: `Bearer ${mockToken}` },
                })
            );
        });

        it('should throw error if owner or repo is not provided', async () => {
            await expect(client.getTreeFiles('', 'repo', 'main')).rejects.toThrow('Owner and repo must be provided');
            await expect(client.getTreeFiles('owner', '', 'main')).rejects.toThrow('Owner and repo must be provided');
        });
    });

    describe('checkRepoExists', () => {
        it('should return true if repository exists', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
            });

            const result = await client.checkRepoExists('owner', 'repo');
            expect(result).toBe(true);
        });

        it('should return false if repository does not exist', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });

            const result = await client.checkRepoExists('owner', 'repo');
            expect(result).toBe(false);
        });

        it('should throw error if owner or repo is not provided', async () => {
            await expect(client.checkRepoExists('', 'repo')).rejects.toThrow('Owner and repo must be provided');
            await expect(client.checkRepoExists('owner', '')).rejects.toThrow('Owner and repo must be provided');
        });
    });

    describe('getRateLimit', () => {
        const mockResponse = {
            resources: {
                core: {
                    remaining: 60,
                    reset: 1623456789,
                },
            },
        };

        it('should fetch rate limit info successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await client.getRateLimit();
            expect(result).toEqual(mockResponse);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/rate_limit',
                expect.objectContaining({
                    headers: { Authorization: `Bearer ${mockToken}` },
                })
            );
        });

        it('should throw error on failed request', async () => {
            const errorMessage = 'Rate limit exceeded';
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                json: async () => ({ message: errorMessage }),
            });

            await expect(client.getRateLimit()).rejects.toThrow(
                `Failed to fetch rate limit: 403 Forbidden - ${errorMessage}`
            );
        });
    });
}); 