import { FileItem, TreeNode } from './types';

/**
 * Builds the file tree from files
 * @param {FileItem[]} files - The files to build the tree from
 * @returns {TreeNode[]} - The file tree
 */
export const buildFileTree = (files: FileItem[]): TreeNode[] => {
  const tree: TreeNode[] = [];
  const dirNodeCache: Record<string, TreeNode> = {};

  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  sortedFiles.forEach(fileItem => {
    const pathParts = fileItem.path.split('/');
    let currentLevelChildren = tree;
    let currentPath = "";

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath = i === 0 ? part : `${currentPath}/${part}`;
      const isFileNode = i === pathParts.length - 1;

      if (isFileNode) {
        const fileNode: TreeNode = {
          name: part,
          path: fileItem.path,
          type: 'file',
          fileItem: fileItem,
          displayPath: part,
        };
        currentLevelChildren.push(fileNode);
      } else {
        let dirNode: TreeNode | undefined = dirNodeCache[currentPath];
        if (!dirNode) {
          dirNode = currentLevelChildren.find(n => n.path === currentPath && n.type === 'folder');
          if (!dirNode) {
            dirNode = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: [],
              displayPath: part,
            };
            currentLevelChildren.push(dirNode);
          }
          dirNodeCache[currentPath] = dirNode!;
        }
        dirNode.children ??= [];
        currentLevelChildren = dirNode.children;
      }
    }
  });
  return tree;
};

/**
 * Compacts the tree paths. If a folder has only one child folder, it will be merged into the parent folder, recursively.
 * @param {TreeNode[]} nodes - The nodes to compact
 * @returns {TreeNode[]} - The compacted nodes
 */
export const compactTreePaths = (nodes: TreeNode[]): TreeNode[] => {
  return nodes.map(node => {
    if (node.type === 'folder' && node.children) {
      const compactedChildren = compactTreePaths(node.children);
      node.children = compactedChildren;

      while (node.type ==='folder' && node.children && node.children.length === 1 && node.children[0].type === 'folder') {
        const singleChildFolder: TreeNode = node.children[0];
        node.displayPath = `${node.displayPath}/${singleChildFolder.displayPath}`;
        node.children = singleChildFolder.children ?? []; 
      }
    }
    return node;
  });
}; 