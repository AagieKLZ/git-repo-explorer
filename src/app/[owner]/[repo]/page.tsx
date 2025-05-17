"use client";

import { useParams } from "next/navigation";
import React from "react";
import { useRepositoryFiles } from "./_hooks/useRepositoryFiles";
import DirectoryView from "./_components/directory-view";
import ExtensionSummaryView from "./_components/extension-summary-view";
import { buildFileTree, compactTreePaths } from "./_lib/tree-utils";
import { formatFileSize } from "./_lib/file-utils";
import Link from "next/link";
import { ArrowLeftIcon, ChartBarDecreasingIcon, FolderIcon, GitBranchIcon, Loader2Icon } from "lucide-react";

export default function RepositoryFilesPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;

  const {
    files,
    isLoading,
    error,
    totalFilesNum,
    branchName,
    expandedFolders,
    toggleFolderExpansion,
    showFileTreeView,
    setShowFileTreeView,
    totalRepoSize,
    currentStatus,
    fileCount,
    repositoryUrl,
  } = useRepositoryFiles(owner, repo);

  const fileTree = React.useMemo(() => {
    const initialTree = buildFileTree(files);
    return compactTreePaths(initialTree);
  }, [files]);

  function getGitHubFileUrl(currentBranch: string, filePath: string): string {
    return `${repositoryUrl}/blob/${currentBranch || 'main'}/${filePath}`;
  }

  if (isLoading && fileTree.length === 0 && !error) {
    return (
      <div className="min-h-screen w-full bg-slate-900">
        <main className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="text-center">
            <Loader2Icon className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" />
            <p className="text-xl font-semibold text-white">
              Fetching repository files for {owner}/{repo}...
            </p>
            <p className="text-gray-400 mt-2 max-h-16 overflow-y-auto overflow-x-hidden text-sm break-all">{currentStatus}</p>
            
            <div className="mt-4 text-blue-400">
              <p className="text-md">
                {fileCount || 0} files found so far
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-slate-900">
        <main className="flex flex-col items-center justify-center min-h-screen p-6">
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-6 py-4 rounded-lg shadow-md max-w-lg text-center">
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-lg">{error}</p>
            <Link href="/" className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150">
              Try another repository
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-900">
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 text-white">
        <header className="mb-6">
          <Link href="/" className="text-blue-500 flex items-center hover:text-blue-700 hover:underline transition duration-150"> 
          <ArrowLeftIcon className="w-5 h-5 mr-1" />
          Search Again</Link>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="text-white">
              <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-3xl font-bold">
                {owner} / {repo}
              </a>
              <div className="flex items-center gap-2">
                <div className="flex items-center mt-2 hover:bg-slate-800 h-8 border border-slate-700 rounded-md w-fit px-6">
                  {totalFilesNum} files
                </div>
                <div className="flex items-center mt-2 h-8 border border-slate-700 hover:bg-slate-800 rounded-md w-fit px-6">
                  <GitBranchIcon className="w-5 h-5 mr-2" />
                <div className="text-sm">{branchName}</div>
              </div>
              </div>
            </div>
          </div>
        </header>

        {files.length > 0 && (
          <div className="mb-6 border-b border-gray-700">
            <nav className="-mb-px flex justify-start" aria-label="Tabs">
              <button
                onClick={() => setShowFileTreeView(false)}
                className={`
                  py-3 px-3 w-36 border-b-2 flex items-center font-medium text-sm
                  ${!showFileTreeView
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-blue-400 hover:border-blue-300'}
                `}
              >
                <ChartBarDecreasingIcon className="w-5 h-5 mr-2" />
                Summary
              </button>
              <button
                onClick={() => setShowFileTreeView(true)}
                className={`
                  py-3 px-3 border-b-2 w-36 flex items-center font-medium text-sm
                  ${showFileTreeView
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-blue-400 hover:border-blue-300'}
                `}
              >
                <FolderIcon className="w-5 h-5 mr-2" />
                Files
              </button>
            </nav>
          </div>
        )}

        {!isLoading && files.length === 0 && (
          <div className="text-center py-10">
            <p className="text-xl text-gray-400">No files found in this repository, or the repository is empty.</p>
            <p className="mt-2 text-gray-400">If you believe this is an error, please double-check the repository URL and try again.</p>
          </div>
        )}

        <div className="relative">
          {isLoading && files.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 shadow-xl flex items-center mb-4 border border-gray-700">
              <div className="text-blue-400 mr-4">
                <Loader2Icon className="animate-spin w-8 h-8" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Loading repository data...</p>
                <p className="text-sm text-gray-400 max-h-12 overflow-y-auto overflow-x-hidden break-all">{currentStatus}</p>
              </div>
              <div className="text-blue-400 ml-4">
                <p className="text-md">{fileCount || 0} files found so far</p>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div className="max-h-[65vh] overflow-auto">
              {showFileTreeView ? (
                <div className="shadow-lg rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
                  <div className="flex items-center py-3 px-4 bg-gray-700 border-b border-gray-600 sticky top-0 z-10">
                    <div className="flex-grow w-4/5 text-xs font-semibold text-gray-300 uppercase tracking-wider">Name</div>
                    <div className="w-1/5 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider pr-4">Size</div>
                  </div>
                  <div className="overflow-y-auto">
                    <DirectoryView
                      nodes={fileTree}
                      depth={0}
                      branchName={branchName}
                      getGitHubFileUrl={getGitHubFileUrl}
                      formatFileSize={formatFileSize}
                      expandedFolders={expandedFolders}
                      toggleFolderExpansion={toggleFolderExpansion}
                    />
                  </div>
                </div>
              ) : (
                <ExtensionSummaryView files={files} totalRepoSize={totalRepoSize} />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 