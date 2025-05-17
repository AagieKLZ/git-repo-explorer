// Interface definitions for stream items
export interface FileItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size: number;
  url: string;
}

export interface ErrorItem {
  type: "error";
  message: string;
}

export interface CompleteItem {
  type: "complete";
  total_files: number;
}

export interface StatusItem {
  type: "status";
  message: string;
  files_processed?: number;
}

export interface WarningItem {
  type: "warning";
  message: string;
  files_processed?: number;
}

export interface BranchItem {
  type: "branch";
  name: string;
}

export type StreamItem = FileItem | ErrorItem | CompleteItem | StatusItem | WarningItem | BranchItem;

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
  fileItem?: FileItem;
  displayPath: string;
}

export interface ExtensionData {
  extension: string;
  count: number;
  percentage: number;
  size: number;
}

export interface DirectoryViewProps {
  nodes: TreeNode[];
  depth: number;
  branchName: string;
  getGitHubFileUrl: (currentBranch: string, filePath: string) => string;
  formatFileSize: (bytes: number) => string;
  expandedFolders: Set<string>;
  toggleFolderExpansion: (path: string) => void;
}

export interface ExtensionSummaryViewProps {
  files: FileItem[];
  totalRepoSize: number;
} 