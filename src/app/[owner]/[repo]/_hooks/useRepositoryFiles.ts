import { useEffect, useState, useRef, useCallback } from 'react';
import { FileItem } from '../_lib/types';
import { isValidFile } from '../_lib/file-utils';
import { processJsonLine, tryFixAndParseMultipleJsons } from '../_lib/stream-processing';

export function useRepositoryFiles(owner: string, repo: string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalFilesNum, setTotalFilesNum] = useState<number | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showFileTreeView, setShowFileTreeView] = useState<boolean>(false);
  const [totalRepoSize, setTotalRepoSize] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<string>("Initializing...");
  const [totalDirectories, setTotalDirectories] = useState<number>(0);
  const [processedDirectories, setProcessedDirectories] = useState<number>(0);
  
  const fileCountRef = useRef<number>(0);
  const repositoryUrl = `https://github.com/${owner}/${repo}`;

  const loadingProgress = totalDirectories > 0 
    ? Math.min(Math.round((processedDirectories / totalDirectories) * 100), 99) 
    : 0;

  const handleParseError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      console.error("Error parsing JSON line:", error.message);
    } else {
      console.error("Error parsing JSON line:", error);
    }
  }, []);

  const addFileToState = useCallback((file: FileItem) => {
    setFiles(prev => [...prev, file]);
  }, [setFiles]);

  const handleApiError = useCallback((message: string) => {
    setError(`API Error: ${message}`);
    setIsLoading(false);
  }, [setError, setIsLoading]);

  const handleTotalFiles = useCallback((totalFiles: number) => {
    setTotalFilesNum(totalFiles);
    setCurrentStatus("Complete! Processing data...");
    setIsLoading(false);
    fileCountRef.current = totalFiles;
  }, [setTotalFilesNum, setCurrentStatus, setIsLoading, fileCountRef]);

  const handleBranchName = useCallback((name: string) => {
    setBranchName(name);
  }, [setBranchName]);

  const handleStatusUpdate = useCallback((message: string, count?: number) => {
    setCurrentStatus(message);
    if (count && count > fileCountRef.current) {
      fileCountRef.current = count;
      setTotalFilesNum(count);
    }
  }, [setCurrentStatus, fileCountRef, setTotalFilesNum]);

  const processFileData = useCallback((line: string, addFileSize: (size: number) => void) => {
    const parsedFile = processJsonLine(
      line, 
      addFileToState,
      handleApiError,
      handleTotalFiles,
      handleBranchName,
      handleStatusUpdate
    );
    
    if(parsedFile && typeof parsedFile !== 'boolean' && parsedFile.size) {
      addFileSize(parsedFile.size);
      fileCountRef.current += 1;
      setTotalFilesNum(fileCountRef.current);
    }
  }, [
    addFileToState, 
    handleApiError, 
    handleTotalFiles, 
    handleBranchName, 
    handleStatusUpdate, 
    fileCountRef,
    setTotalFilesNum
  ]);

  const processLine = useCallback((line: string, addFileSize: (size: number) => void) => {
    try {
      const jsonData = JSON.parse(line);
      
      if (jsonData.type === "status") {
        const { newTotalDirs, newProcessedDirs } = handleStatusMessage(
          jsonData.message ?? "",
          totalDirectories,
          processedDirectories
        );
        setTotalDirectories(newTotalDirs);
        setProcessedDirectories(newProcessedDirs);
      }
    } catch (error: unknown) {
      handleParseError(error);
    }
    
    processFileData(line, addFileSize);
  }, [handleParseError, processFileData, processedDirectories, totalDirectories, setTotalDirectories, setProcessedDirectories]);

  const processBuffer = useCallback((
    currentBuffer: string,
    setRemainingBuffer: (remaining: string) => void,
    addFileSize: (size: number) => void
  ) => {
    const lines = currentBuffer.split("\n");
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      if (line.trim()) {
        processLine(line, addFileSize);
      }
    }
    setRemainingBuffer(lines[lines.length - 1]);
  }, [processLine]);

  const processRemainingBuffer = useCallback((buffer: string) => {
    if (!buffer.trim()) return;
    try {
      processJsonLine(
        buffer, 
        addFileToState,
        handleApiError,
        handleTotalFiles,
        handleBranchName,
        handleStatusUpdate
      );
    } catch (e: unknown) {
      console.warn(
        "Couldn't parse final buffer as single JSON, attempting to fix:",
        buffer,
      );
      if (e instanceof Error) {
        console.error("Error parsing final buffer:", e.message);
      } else {
        console.error("Error parsing final buffer:", e);
      }
      tryFixAndParseMultipleJsons(buffer, (json) => {
        processJsonLine(
          json,
          addFileToState,
          handleApiError,
          handleTotalFiles,
          handleBranchName,
          handleStatusUpdate
        );
      });
    }
  }, [addFileToState, handleApiError, handleTotalFiles, handleBranchName, handleStatusUpdate]);

  useEffect(() => {
    if (!owner || !repo) {
      setError("Owner and repository not specified in URL.");
      setIsLoading(false);
      return;
    }

    const fetchRepositoryFiles = async () => {
      setIsLoading(true);
      setFiles([]);
      setError(null);
      setTotalFilesNum(null);
      setBranchName("");
      setExpandedFolders(new Set());
      setShowFileTreeView(false);
      setTotalRepoSize(0);
      setTotalDirectories(0);
      setProcessedDirectories(0);

      let currentTotalSize = 0;

      try {
        const response = await fetch("/api/v1/repo/streaming", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: repositoryUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ?
              `API request failed with status ${response.status}: ${errorData.error}` :
              `API request failed with status ${response.status}`
          );
        }

        if (!response.body) {
          throw new Error("Response body is null.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            setIsLoading(false);
            processRemainingBuffer(buffer);
            setTotalRepoSize(currentTotalSize);
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          processBuffer(buffer, (processed) => {
            buffer = processed;
          }, (fileSize) => {
            currentTotalSize += fileSize;
          });
        }
      } catch (e: unknown) {
        console.error("Failed to fetch stream:", e);
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
        setIsLoading(false);
      }
    };

    fetchRepositoryFiles();
  }, [owner, repo, repositoryUrl, processBuffer, processRemainingBuffer]);

  const handleStatusMessage = (
    message: string,
    currentTotalDirs: number,
    currentProcessedDirs: number
  ): { newTotalDirs: number; newProcessedDirs: number } => {
    let newTotalDirs = currentTotalDirs;
    let newProcessedDirs = currentProcessedDirs;

    const foundDirsMatch = /Found\s+(\d+)\s+directories/i.exec(message);
    const moreDirsMatch = /Found\s+(\d+)\s+more directories/i.exec(message);
    const processingDirMatch = /Processing directory\s+(\d+)\/(\d+)/i.exec(message);
    const completedBatchMatch = /processed\s+(\d+)\s+directories/i.exec(message);

    if (foundDirsMatch?.[1]) {
      newTotalDirs += parseInt(foundDirsMatch[1], 10);
    } else if (moreDirsMatch?.[1]) {
      newTotalDirs += parseInt(moreDirsMatch[1], 10);
    }

    if (processingDirMatch?.[1] && processingDirMatch?.[2]) {
      const current = parseInt(processingDirMatch[1], 10);
      newProcessedDirs = Math.max(newProcessedDirs, current);
    } else if (completedBatchMatch?.[1]) {
      newProcessedDirs += parseInt(completedBatchMatch[1], 10);
    } else if (message.includes("Completed directory")) {
      newProcessedDirs += 1;
    }
    return { newTotalDirs, newProcessedDirs };
  };

  const toggleFolderExpansion = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const validFiles = files.filter(isValidFile);

  return {
    files: validFiles,
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
    loadingProgress,
    totalDirectories,
    processedDirectories,
    fileCount: fileCountRef.current,
    repositoryUrl
  };
} 