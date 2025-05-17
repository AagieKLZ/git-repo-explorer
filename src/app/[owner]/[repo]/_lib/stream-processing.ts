import { isValidFile } from './file-utils';
import { StreamItem, FileItem, CompleteItem, ErrorItem, StatusItem, WarningItem, BranchItem } from './types';

/**
 * Handles the string character
 * @param {string} char - The character to handle
 * @param {boolean} inString - Whether the character is in a string
 * @param {boolean} escaped - Whether the character is escaped
 * @returns {object} - The updated inString and escaped values
 */
const handleStringChar = (char: string, inString: boolean, escaped: boolean): { inString: boolean; escaped: boolean } => {
  if (inString) {
    if (char === '\\' && !escaped) {
      return { inString: true, escaped: true };
    }
    if (char === '"' && !escaped) {
      return { inString: false, escaped: false };
    }
    return { inString: true, escaped: false };
  }
  if (char === '"') {
    return { inString: true, escaped: false };
  }
  return { inString, escaped };
};

/**
 * Validates the JSON string
 * @param {string} jsonStr - The JSON string to validate
 * @returns {string | null} - The validated JSON string or null if invalid
 */
const validateJsonString = (jsonStr: string): string | null => {
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error parsing JSON line:", e.message);
    } else {
      console.error("Error parsing JSON line:", e);
    }
    return null;
  }
};

/**
 * Extracts the valid JSON string from the input string
 * @param {string} str - The input string
 * @returns {string | null} - The valid JSON string or null if invalid
 */
export const extractValidJson = (str: string): string | null => {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    ({ inString, escaped } = handleStringChar(char, inString, escaped));
    
    if (inString) continue;
    
    if (char === '{') {
      depth++;
      continue;
    }
    
    if (char === '}') {
      depth--;
      if (depth === 0) {
        return validateJsonString(str.substring(0, i + 1));
      }
    }
  }
  return null;
};

/**
 * Handles the status message to get the number of files processed
 * @param {string} message - The status message
 * @returns {number} - The number of files processed
 */
const handleStatusMessage = (message: string): number => {
  const totalMatch = /total:\s*(\d+)/i.exec(message);
  const filesLoadedMatch = /(\d+)\s+files\s+(?:loaded|found)/i.exec(message);
  const processedMatch = /processed\s+(\d+)\s+files/i.exec(message);
  
  if (totalMatch?.[1]) return parseInt(totalMatch[1], 10);
  if (filesLoadedMatch?.[1]) return parseInt(filesLoadedMatch[1], 10);
  if (processedMatch?.[1]) return parseInt(processedMatch[1], 10);
  return 0;
};

/**
 * Processes the status item
 * @param {StatusItem} item - The status item
 * @param {function} onStatus - The callback function to handle the status
 * @returns {boolean} - Whether the status item was processed
 */
const processStatusItem = (
  item: StatusItem,
  onStatus: (message: string, fileCount?: number) => void
): boolean => {
  const { message, files_processed } = item;
  
  if (!message) return false;
  
  if (files_processed !== undefined && typeof files_processed === 'number' && files_processed > 0) {
    onStatus(message, files_processed);
    return true;
  }
  
  const count = handleStatusMessage(message);
  onStatus(message, count > 0 ? count : undefined);
  return count > 0;
};

/**
 * Processes the JSON line
 * @param {string} line - The JSON line to process
 * @param {function} onFile - The callback function to handle the file
 * @param {function} onError - The callback function to handle the error
 * @param {function} onComplete - The callback function to handle the complete
 * @param {function} onBranch - The callback function to handle the branch
 * @param {function} onStatus - The callback function to handle the status
 * @returns {FileItem | boolean} - The file item or boolean
 */
export const processJsonLine = (
  line: string, 
  onFile: (file: FileItem) => void,
  onError: (message: string) => void,
  onComplete: (totalFiles: number) => void,
  onBranch: (branchName: string) => void,
  onStatus: (message: string, fileCount?: number) => void
): FileItem | boolean => {
  try {
    const json = JSON.parse(line) as StreamItem;
    
    switch (json.type) {
      case "error":
        onError((json as ErrorItem).message);
        return false;
      
      case "complete":
        onComplete((json as CompleteItem).total_files);
        return true;
      
      case "branch":
        onBranch((json as BranchItem).name);
        return true;
      
      case "status":
        return processStatusItem(json as StatusItem, onStatus);
      
      case "warning": {
        const { message, files_processed } = json as WarningItem;
        onStatus(`Warning: ${message}`, 
          typeof files_processed === 'number' && files_processed > 0 ? files_processed : undefined);
        return true;
      }
      
      default:
        if (isValidFile(json)) {
          onFile(json);
          return json;
        }
        return false;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("Error parsing JSON line:", e.message, "Input:", line);
    } else {
      console.error("Error parsing JSON line:", e, "Input:", line);
    }
    return false;
  }
};

/**
 * Tries to fix and parse multiple JSONs from a buffer
 * @param {string} buffer - The buffer to process
 * @param {function} onJson - The callback function to handle the JSON
 */
export const tryFixAndParseMultipleJsons = (
  buffer: string,
  onJson: (json: string) => void
): void => {
  let remaining = buffer;
  let startPos = remaining.indexOf("{");
  while (startPos >= 0 && remaining.length > 0) {
    try {
      const obj = extractValidJson(remaining);
      if (obj) {
        onJson(obj);
        remaining = remaining.slice(obj.length);
      } else {
        remaining = remaining.slice(1);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error("Error parsing JSON line:", e.message);
      } else {
        console.error("Error parsing JSON line:", e);
      }
      remaining = remaining.slice(1);
    }
    startPos = remaining.indexOf("{");
  }
}; 