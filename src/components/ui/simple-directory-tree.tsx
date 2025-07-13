'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Folder, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  modified?: string | null;
}

interface SimpleDirectoryTreeProps {
  currentPath: string;
  directories: DirectoryItem[];
  selectedPath: string;
  onSelect: (path: string) => void;
  onNavigate: (path: string) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function SimpleDirectoryTree({
  currentPath,
  directories,
  selectedPath,
  onSelect,
  onNavigate,
  isLoading,
  onRefresh,
}: SimpleDirectoryTreeProps) {
  const pathParts = currentPath === '.' ? [] : currentPath.split('/').filter(Boolean);
  
  const handleNavigateUp = () => {
    if (pathParts.length > 0) {
      const parentPath = pathParts.slice(0, -1).join('/') || '.';
      onNavigate(parentPath);
    }
  };

  const handleNavigateTo = (index: number) => {
    const targetPath = pathParts.slice(0, index + 1).join('/') || '.';
    onNavigate(targetPath);
  };

  return (
    <div className="border rounded-lg bg-white">
      {/* Header with breadcrumb navigation */}
      <div className="border-b px-4 py-2 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={() => onNavigate('.')}
            className="text-blue-600 hover:underline px-1"
          >
            Home
          </button>
          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <span className="text-gray-400">/</span>
              <button
                type="button"
                onClick={() => handleNavigateTo(index)}
                className={cn(
                  "px-1 hover:underline",
                  index === pathParts.length - 1 ? "text-gray-700 font-medium" : "text-blue-600"
                )}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>
        {onRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-6 w-6 p-0"
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          </Button>
        )}
      </div>
      
      {/* Directory listing */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : directories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No directories found</p>
          </div>
        ) : (
          <div className="py-1">
            {/* Parent directory if not at root */}
            {currentPath !== '.' && (
              <div
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b"
                onClick={handleNavigateUp}
              >
                <Folder className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">..</span>
                <span className="text-xs text-gray-400 ml-auto">Parent directory</span>
              </div>
            )}
            
            {/* Current directory selection */}
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer border-b",
                selectedPath === currentPath && "bg-blue-50"
              )}
              onClick={() => onSelect(currentPath)}
            >
              <Folder className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">.</span>
              <span className="text-xs text-blue-600 ml-auto">Current directory</span>
            </div>
            
            {/* Subdirectories */}
            {directories.map((dir) => (
              <div
                key={dir.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer",
                  selectedPath === dir.path && "bg-blue-50"
                )}
                onDoubleClick={() => onNavigate(dir.path)}
                onClick={() => onSelect(dir.path)}
              >
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-sm flex-1">{dir.name}</span>
                {dir.modified && (
                  <span className="text-xs text-gray-400">
                    {new Date(dir.modified).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t px-4 py-2 bg-gray-50">
        <p className="text-xs text-gray-600">
          Click to select • Double-click to navigate
        </p>
      </div>
    </div>
  );
}