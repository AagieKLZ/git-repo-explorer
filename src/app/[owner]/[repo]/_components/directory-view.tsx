import React from 'react';
import { DirectoryViewProps } from '../_lib/types';

const DirectoryView: React.FC<DirectoryViewProps> = ({ 
  nodes, 
  depth, 
  branchName, 
  getGitHubFileUrl, 
  formatFileSize, 
  expandedFolders, 
  toggleFolderExpansion 
}) => {
  const sortedNodes = [...nodes].sort((a, b) => {
    if (a.type === 'folder' && b.type === 'file') return -1;
    if (a.type === 'file' && b.type === 'folder') return 1;
    return (a.displayPath).localeCompare(b.displayPath);
  });

  return (
    <>
      {sortedNodes.map(node => {
        const isExpanded = node.type === 'folder' ? expandedFolders.has(node.path) : false;
        return (
          <React.Fragment key={node.type === 'file' && node.fileItem ? node.fileItem.path : node.path}>
            <button
              type="button"
              tabIndex={0}
              className={`flex items-center py-2 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-150 w-full text-left bg-transparent p-0 ${node.type === 'folder' ? 'cursor-pointer' : ''}`}
              style={{ paddingLeft: `${depth * 20 + (node.type === 'folder' ? 0 : 24)}px` }}
              onClick={() => {
                if (node.type === 'folder') {
                  toggleFolderExpansion(node.path);
                } else if (node.type === 'file' && node.fileItem) {
                  window.open(getGitHubFileUrl(branchName, node.fileItem.path), '_blank');
                }
              }}
            >
              <div className="flex-grow w-4/5 truncate flex items-center">
                {node.type === 'folder' && (
                  <span className="mr-1 w-5 inline-block text-center text-gray-400 flex-shrink-0">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                )}
                <span className={`mr-2 flex-shrink-0 ${node.type === 'folder' ? 'text-yellow-500' : 'text-blue-400'}`}>
                  {node.type === 'folder' ? '📁' : '📄'}
                </span>
                <span className="text-sm text-gray-200 truncate" title={node.displayPath}>
                  {node.displayPath}
                </span>
              </div>
              {node.type === 'file' && node.fileItem && (
                <div className="w-1/5 text-right text-xs text-gray-400 pr-4 flex-shrink-0">
                  {formatFileSize(node.fileItem.size)}
                </div>
              )}
              {node.type === 'folder' && (
                <div className="w-1/5 text-right text-xs text-gray-400 pr-4 flex-shrink-0"></div>
              )}
            </button>
            {node.type === 'folder' && isExpanded && node.children && node.children.length > 0 && (
              <DirectoryView
                nodes={node.children}
                depth={depth + 1}
                branchName={branchName}
                getGitHubFileUrl={getGitHubFileUrl}
                formatFileSize={formatFileSize}
                expandedFolders={expandedFolders}
                toggleFolderExpansion={toggleFolderExpansion}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default DirectoryView; 