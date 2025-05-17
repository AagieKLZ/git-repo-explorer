import { FileItem } from './types';

/**
 * Formats the file size to a human readable format
 * @param {number} bytes - The size in bytes
 * @returns {string} - The formatted file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/**
 * Gets the file url for a given file path
 * @param {string} owner - The owner of the repository
 * @param {string} repo - The repository name
 * @param {string} currentBranch - The current branch
 * @param {string} filePath - The file path
 * @returns {string} - The file url
 */
export function getGitHubFileUrl(owner: string, repo: string, currentBranch: string, filePath: string): string {
  const repositoryUrl = `https://github.com/${owner}/${repo}`;
  return `${repositoryUrl}/blob/${currentBranch || 'main'}/${filePath}`;
}

/**
 * Checks if a file is valid and has correct properties
 * @param {unknown} file - The file to check
 * @returns {boolean} - Whether the file is valid
 */
export const isValidFile = (file: unknown): file is FileItem => {
  if (typeof file !== 'object' || file === null) return false;
  const { path, size } = file as FileItem;
  return typeof path === 'string' && path.length > 0 && typeof size === 'number';
}; 