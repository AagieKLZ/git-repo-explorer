import React, { useMemo } from 'react';
import { ExtensionSummaryViewProps, ExtensionData } from '../_lib/types';
import { formatFileSize } from '../_lib/file-utils';

const ExtensionSummaryView: React.FC<ExtensionSummaryViewProps> = ({ files }) => {
  const summary = useMemo(() => {
    const counts: Record<string, { count: number; size: number }> = {};
    let totalFilesWithExtension = 0;

    files.forEach(file => {
      const nameParts = file.path.split('/');
      const fileName = nameParts[nameParts.length - 1];
      const extParts = fileName.split('.');
      let extension = "(no extension)";
      if (extParts.length > 1 && extParts[0] !== "" && extParts[extParts.length -1] !== "") {
        extension = extParts.pop()!.toLowerCase();
        if (extension.length > 10) extension = "(long extension)";
      }
      
      counts[extension] = counts[extension] || { count: 0, size: 0 };
      counts[extension].count++;
      counts[extension].size += file.size;
      totalFilesWithExtension++;
    });


    return Object.entries(counts)
      .map(([extension, data]): ExtensionData => ({
        extension,
        count: data.count,
        percentage: totalFilesWithExtension > 0 ? (data.count / totalFilesWithExtension) * 100 : 0,
        size: data.size,
      }))
      .sort((a, b) => b.count - a.count);
  }, [files]);

  if (summary.length === 0) {
    return <p className="text-center text-gray-400 py-8">No files with extensions found to summarize.</p>;
  }
  
  const maxCount = Math.max(...summary.map(s => s.count), 0);

  return (
    <div className="bg-gray-800 shadow-lg rounded-lg p-6">
      <ul className="space-y-3">
        {summary.map(item => (
          <li key={item.extension} className="border-b border-gray-700 pb-3 last:border-b-0">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-white w-1/3 truncate" title={item.extension}>
                .{item.extension}
              </span>
              <span className="text-sm text-gray-400 w-1/3 text-center">
                {item.count} files ({item.percentage.toFixed(1)}% of files)
              </span>
              <span className="text-sm text-gray-400 w-1/3 text-right">
                {formatFileSize(item.size)} 
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full w-full overflow-hidden">
              <div 
                className="h-3 bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
              ></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExtensionSummaryView; 