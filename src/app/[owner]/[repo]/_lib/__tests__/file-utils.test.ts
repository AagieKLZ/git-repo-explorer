import { formatFileSize, getGitHubFileUrl, isValidFile } from '../file-utils';
import { FileItem } from '../types';

describe('formatFileSize', () => {
  test('should format bytes correctly', () => {
    expect(formatFileSize(-1)).toBe('0 B');
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(2097152)).toBe('2.0 MB');
  });
});

describe('getGitHubFileUrl', () => {
  test('should generate correct GitHub file URL with provided branch', () => {
    const url = getGitHubFileUrl('testOwner', 'testRepo', 'develop', 'src/file.ts');
    expect(url).toBe('https://github.com/testOwner/testRepo/blob/develop/src/file.ts');
  });

  test('should use main as default branch when branch is empty', () => {
    const url = getGitHubFileUrl('testOwner', 'testRepo', '', 'src/file.ts');
    expect(url).toBe('https://github.com/testOwner/testRepo/blob/main/src/file.ts');
  });
});

describe('isValidFile', () => {
  test('should return true for valid FileItem', () => {
    const validFile: FileItem = {
      path: 'test/file.ts',
      mode: '100644',
      type: 'blob',
      sha: '123abc',
      size: 1024,
      url: 'https://api.github.com/repos/owner/repo/contents/test/file.ts'
    };
    expect(isValidFile(validFile)).toBe(true);
  });

  test('should return false for null', () => {
    expect(isValidFile(null)).toBe(false);
  });

  test('should return false for non-object', () => {
    expect(isValidFile('not an object')).toBe(false);
  });

  test('should return false for invalid FileItem structure', () => {
    expect(isValidFile({ path: '', size: 100 })).toBe(false);
    expect(isValidFile({ path: 'test.ts' })).toBe(false);
    expect(isValidFile({ size: 100 })).toBe(false);
    expect(isValidFile({ path: 123, size: '100' })).toBe(false);
  });
}); 