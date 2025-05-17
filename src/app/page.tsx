"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkRateLimitAndProceed } from "./actions";

/**
 * HomePage component for entering a GitHub repository URL.
 * @returns {JSX.Element} The HomePage component.
 */
export default function HomePage() {
  const [url, setUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimitResetMessage, setRateLimitResetMessage] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /**
   * Validates the GitHub URL and navigates to the repository page
   * after checking rate limits via a server action.
   */
  const handleSubmit = async () => {
    setError(null);
    setRateLimitResetMessage(null);

    // Basic client-side validation
    if (!url) {
      setError("Please enter a GitHub repository URL.");
      return;
    }
    const githubRepoRegex = /^https?:\/\/github\.com\/([a-zA-Z0-9\-_]+)\/([a-zA-Z0-9_\-.]+?)(?:\.git)?$/;
    const clientMatch = githubRepoRegex.exec(url);
    if (!clientMatch) {
      setError("Invalid GitHub repository URL format. Example: https://github.com/owner/repo");
      return;
    }

    startTransition(async () => {
      const result = await checkRateLimitAndProceed(url);

      if (result.error) {
        setError(result.error);
        if (result.rateLimitResetTime) {
          setRateLimitResetMessage(result.rateLimitResetTime);
        }
      } else if (result.owner && result.repo) {
        router.push(`/${result.owner}/${result.repo}`);
      } else {
        setError("An unexpected error occurred. Owner or repo missing.");
      }
    });
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="w-full max-w-xl p-8 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center text-foreground dark:text-white">
          GitHub Repository Explorer
        </h1>
        
        <div className="space-y-3">
          <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Repository URL
          </label>
          <input
            id="repoUrl"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
              setRateLimitResetMessage(null);
            }}
            placeholder="e.g., https://github.com/owner/repo"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-foreground dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            aria-describedby="url-error"
            disabled={isPending}
          />
          {error && (
            <p id="url-error" className="text-sm text-red-600 dark:text-red-400 mt-1">
              {error}
              {rateLimitResetMessage && <span className="block">{rateLimitResetMessage}</span>}
            </p>
          )}
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Checking..." : "Explore Repository"}
        </button>
      </div>
      <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Enter a GitHub repository URL to browse its contents.</p>
      </footer>
    </main>
  );
}
