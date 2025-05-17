import { buildFileTree, compactTreePaths } from '../tree-utils';
import { FileItem, TreeNode } from '../types';

describe('buildFileTree', () => {
  it('should create a tree structure from flat file list', () => {
    const files: FileItem[] = [
      { path: 'file1.txt' } as FileItem,
      { path: 'folder1/file2.txt' } as FileItem,
      { path: 'folder1/folder2/file3.txt' } as FileItem,
    ];

    const result = buildFileTree(files);

    expect(result).toHaveLength(2); // root level has 1 file and 1 folder
    expect(result[0]).toEqual({
      name: 'file1.txt',
      path: 'file1.txt',
      type: 'file',
      fileItem: files[0],
      displayPath: 'file1.txt',
    });

    const folder1 = result[1];
    expect(folder1).toMatchObject({
      name: 'folder1',
      path: 'folder1',
      type: 'folder',
      displayPath: 'folder1',
    });
    expect(folder1.children).toHaveLength(2);
  });

  it('should handle empty file list', () => {
    const result = buildFileTree([]);
    expect(result).toEqual([]);
  });

  it('should handle files in the same folder', () => {
    const files: FileItem[] = [
      { path: 'folder/file1.txt' } as FileItem,
      { path: 'folder/file2.txt' } as FileItem,
    ];

    const result = buildFileTree(files);

    expect(result).toHaveLength(1); // one folder
    const folder = result[0];
    expect(folder.children).toHaveLength(2); // two files
    expect(folder.children?.map(child => child.name)).toEqual(['file1.txt', 'file2.txt']);
  });
});

describe('compactTreePaths', () => {
  it('should compact single child folders', () => {
    const input: TreeNode[] = [
      {
        name: 'folder1',
        path: 'folder1',
        type: 'folder',
        displayPath: 'folder1',
        children: [
          {
            name: 'folder2',
            path: 'folder1/folder2',
            type: 'folder',
            displayPath: 'folder2',
            children: [
              {
                name: 'file.txt',
                path: 'folder1/folder2/file.txt',
                type: 'file',
                displayPath: 'file.txt',
              } as TreeNode,
            ],
          },
        ],
      },
    ];

    const result = compactTreePaths(input);

    expect(result[0].displayPath).toBe('folder1/folder2');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].name).toBe('file.txt');
  });

  it('should not compact folders with multiple children', () => {
    const input: TreeNode[] = [
      {
        name: 'folder1',
        path: 'folder1',
        type: 'folder',
        displayPath: 'folder1',
        children: [
          {
            name: 'file1.txt',
            path: 'folder1/file1.txt',
            type: 'file',
            displayPath: 'file1.txt',
          } as TreeNode,
          {
            name: 'file2.txt',
            path: 'folder1/file2.txt',
            type: 'file',
            displayPath: 'file2.txt',
          } as TreeNode,
        ],
      },
    ];

    const result = compactTreePaths(input);

    expect(result[0].displayPath).toBe('folder1');
    expect(result[0].children).toHaveLength(2);
  });

  it('should handle empty input', () => {
    const result = compactTreePaths([]);
    expect(result).toEqual([]);
  });
}); 