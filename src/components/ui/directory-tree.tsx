'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryItem[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

interface DirectoryTreeProps {
  items: DirectoryItem[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  onLoadChildren?: (path: string) => Promise<DirectoryItem[]>;
  className?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

interface TreeNodeProps {
  item: DirectoryItem;
  level: number;
  selectedPath?: string;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onLoadChildren?: (path: string) => Promise<DirectoryItem[]>;
}

function TreeNode({ item, level, selectedPath, onSelect, onToggle, onLoadChildren }: TreeNodeProps) {
  const isSelected = selectedPath === item.path;
  const isExpanded = item.isExpanded || false;
  const hasChildren = item.children && item.children.length > 0;
  
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'directory') {
      onToggle(item.path);
    }
  };

  const handleSelect = () => {
    onSelect(item.path);
  };

  const getIcon = () => {
    if (item.type === 'file') {
      return <File className="w-4 h-4 text-gray-500" />;
    }
    
    if (item.isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
    }
    
    if (isExpanded) {
      return <FolderOpen className="w-4 h-4 text-blue-500" />;
    }
    
    return <Folder className="w-4 h-4 text-blue-500" />;
  };

  const getToggleIcon = () => {
    if (item.type === 'file') return null;
    
    if (item.isLoading) {
      return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />;
    }
    
    if (isExpanded) {
      return <ChevronDown className="w-3 h-3 text-gray-400" />;
    }
    
    return <ChevronRight className="w-3 h-3 text-gray-400" />;
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1 px-2 cursor-pointer hover:bg-gray-50 rounded-sm",
          isSelected && "bg-red-50 border-l-2 border-red-500 text-red-700",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
      >
        <div className="flex items-center gap-1 mr-2">
          {item.type === 'directory' && (
            <button
              type="button"
              onClick={handleToggle}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {getToggleIcon()}
            </button>
          )}
          {item.type === 'file' && <div className="w-4 h-4" />}
        </div>
        
        {getIcon()}
        
        <span className={cn(
          "ml-2 text-sm select-none",
          isSelected ? "font-medium text-red-700" : "text-gray-700",
          item.name.startsWith('new_') && "text-gray-400"
        )}>
          {item.name}
        </span>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {item.children?.map((child, index) => (
            <TreeNode
              key={`${child.path}-${index}`}
              item={child}
              level={level + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
              onLoadChildren={onLoadChildren}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectoryTree({
  items,
  selectedPath,
  onSelect,
  onLoadChildren,
  className,
  isLoading,
  onRefresh,
}: DirectoryTreeProps) {
  const [treeData, setTreeData] = useState<DirectoryItem[]>(items);

  useEffect(() => {
    setTreeData(items);
  }, [items]);

  const handleToggle = async (path: string) => {
    const updateTree = (items: DirectoryItem[]): DirectoryItem[] => {
      return items.map(item => {
        if (item.path === path) {
          if (item.type === 'directory') {
            if (!item.isExpanded && !item.children && onLoadChildren) {
              // Load children if not already loaded
              const loadChildren = async () => {
                Object.assign(item, { isLoading: true });
                setTreeData(prev => updateTree(prev));
                
                try {
                  const children = await onLoadChildren(path);
                  Object.assign(item, { children, isExpanded: true, isLoading: false });
                  setTreeData(prev => updateTree(prev));
                } catch {
                  Object.assign(item, { isLoading: false });
                  setTreeData(prev => updateTree(prev));
                }
              };
              loadChildren();
              return item;
            } else {
              return { ...item, isExpanded: !item.isExpanded };
            }
          }
        }
        
        if (item.children) {
          return { ...item, children: updateTree(item.children) };
        }
        
        return item;
      });
    };

    setTreeData(updateTree(treeData));
  };

  if (isLoading) {
    return (
      <div className={cn("border rounded-lg bg-white", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg bg-white", className)}>
      <div className="border-b px-4 py-2 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">BASE DIRECTORY</span>
        {onRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {treeData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No directories found</p>
          </div>
        ) : (
          <div className="py-2">
            {treeData.map((item, index) => (
              <TreeNode
                key={`${item.path}-${index}`}
                item={item}
                level={0}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onToggle={handleToggle}
                onLoadChildren={onLoadChildren}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 