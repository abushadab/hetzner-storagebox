'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Folder, FolderOpen, Loader2, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  modified?: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isExpanded: boolean;
  isLoading: boolean;
  isLoaded: boolean;
}

interface DirectoryTreeProps {
  storageBoxId: string;
  selectedPath: string;
  onSelect: (path: string) => void;
  className?: string;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  isLoading?: boolean;
  isLast?: boolean;
  parentLines?: boolean[];
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({
  node,
  level,
  selectedPath,
  onSelect,
  onToggle,
  isLast = false,
  parentLines = [],
}) => {
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0 || !node.isLoaded;
  
  const handleSelect = () => {
    onSelect(node.path);
    // If it's a folder that's not loaded yet, expand it
    if (hasChildren && !node.isExpanded) {
      onToggle(node.path);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.path);
  };

  return (
    <div className="relative">
      {/* Tree connecting lines */}
      {level > 0 && (
        <>
          {/* Vertical line from parent */}
          {!isLast && (
            <div 
              className="absolute border-l border-gray-300" 
              style={{
                left: `${(level - 1) * 20 + 16}px`,
                top: '16px',
                height: 'calc(100% - 16px)',
              }}
            />
          )}
          {/* Horizontal line to this node */}
          <div 
            className="absolute border-t border-gray-300" 
            style={{
              left: `${(level - 1) * 20 + 16}px`,
              top: '16px',
              width: '16px',
            }}
          />
        </>
      )}
      
      {/* Node content */}
      <div 
        className="flex items-center"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        <div
          className={cn(
            "inline-flex items-center py-1 px-3 cursor-pointer rounded transition-colors",
            isSelected ? "bg-gray-800 text-white" : "hover:bg-gray-100"
          )}
          onClick={handleSelect}
        >
          {/* Folder icon */}
          {hasChildren ? (
            node.isExpanded ? (
              <FolderOpen className={cn("w-4 h-4", isSelected ? "text-white" : "text-gray-600")} />
            ) : (
              <Folder className={cn("w-4 h-4", isSelected ? "text-white" : "text-gray-600")} />
            )
          ) : (
            <Folder className={cn("w-4 h-4", isSelected ? "text-white" : "text-gray-600")} />
          )}
          
          <span className={cn(
            "ml-2 text-sm select-none",
            isSelected ? "text-white font-medium" : "text-gray-700",
            // Special styling for specific items like in the screenshot
            node.name === "Inbox_Raw File" && !isSelected && "text-red-500 font-medium"
          )}>
            {node.name}
          </span>
          
          {/* Expand/Collapse indicator */}
          {hasChildren && (
            <button
              type="button"
              onClick={handleToggleClick}
              className={cn(
                "ml-3 p-0.5 rounded",
                isSelected ? "hover:bg-gray-700" : "hover:bg-gray-200"
              )}
            >
              {node.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ChevronRight className={cn(
                  "w-3 h-3 transition-transform",
                  node.isExpanded && "rotate-90",
                  isSelected ? "text-white" : "text-gray-500"
                )} />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Children */}
      {node.isExpanded && node.children.length > 0 && (
        <div className="relative">
          {/* Parent vertical line for children */}
          {node.children.length > 1 && (
            <div 
              className="absolute border-l border-gray-300" 
              style={{
                left: `${level * 20 + 16}px`,
                top: '0',
                height: 'calc(100% - 16px)',
              }}
            />
          )}
          
          {node.children.map((child, index) => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              level={level + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
              isLast={index === node.children.length - 1}
              parentLines={[...parentLines, !isLast]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DirectoryTree({
  storageBoxId,
  selectedPath,
  onSelect,
  className,
}: DirectoryTreeProps) {
  const [rootNodes, setRootNodes] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDirectories = useCallback(async (path: string = ''): Promise<DirectoryItem[]> => {
    try {
      const response = await fetch(`/api/storage-boxes/${storageBoxId}/folders?path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        throw new Error('Failed to load directories');
      }

      const data = await response.json();
      const directories = data.directories || [];
      
      return directories;
    } catch (error) {
      console.error('Error loading directories:', error);
      toast.error('Failed to load directories');
      return [];
    }
  }, [storageBoxId]);

  const createTreeNode = (item: DirectoryItem): TreeNode => ({
    name: item.name,
    path: item.path,
    children: [],
    isExpanded: false,
    isLoading: false,
    isLoaded: false,
  });

  const updateTreeNode = (nodes: TreeNode[], path: string, update: Partial<TreeNode>): TreeNode[] => {
    return nodes.map(node => {
      if (node.path === path) {
        return { ...node, ...update };
      }
      if (node.children.length > 0) {
        return { ...node, children: updateTreeNode(node.children, path, update) };
      }
      return node;
    });
  };

  const addChildrenToNode = (nodes: TreeNode[], path: string, children: TreeNode[]): TreeNode[] => {
    return nodes.map(node => {
      if (node.path === path) {
        return { 
          ...node, 
          children, 
          isExpanded: true, 
          isLoading: false,
          isLoaded: true 
        };
      }
      if (node.children.length > 0) {
        return { ...node, children: addChildrenToNode(node.children, path, children) };
      }
      return node;
    });
  };

  const handleToggle = async (path: string) => {
    const findNode = (nodes: TreeNode[], targetPath: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.path === targetPath) return node;
        const found = findNode(node.children, targetPath);
        if (found) return found;
      }
      return null;
    };

    const node = findNode(rootNodes, path);
    if (!node) return;

    if (node.isExpanded) {
      // Collapse
      setRootNodes(prev => updateTreeNode(prev, path, { isExpanded: false }));
    } else {
      // Expand
      if (!node.isLoaded) {
        // Set loading state
        setRootNodes(prev => updateTreeNode(prev, path, { isLoading: true }));
        
        // Load children
        const directories = await loadDirectories(path);
        const childNodes = directories.map(createTreeNode);
        
        // Add children and set expanded
        setRootNodes(prev => addChildrenToNode(prev, path, childNodes));
      } else {
        // Just expand
        setRootNodes(prev => updateTreeNode(prev, path, { isExpanded: true }));
      }
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    
    try {
      const directories = await loadDirectories('');
      const nodes = directories.map(createTreeNode);
      setRootNodes(nodes);
    } catch {
      toast.error('Failed to refresh directories');
    } finally {
      setIsLoading(false);
    }
  };

  // Load root directories on mount
  useEffect(() => {
    const loadInitialDirectories = async () => {
      setIsLoading(true);
      try {
        const directories = await loadDirectories('');
        const nodes = directories.map(createTreeNode);
        setRootNodes(nodes);
      } catch {
        toast.error('Failed to load initial directories');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialDirectories();
  }, [loadDirectories]);

  return (
    <div className={cn("border rounded-lg bg-white", className)}>
      <div className="px-4 py-2">
        <div className="inline-flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">BASE DIRECTORY</span>
          <span className="text-gray-400">•</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-5 w-5 p-0"
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : rootNodes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No directories found</p>
          </div>
        ) : (
          <div className="py-2">
            {rootNodes.map((node, index) => (
              <TreeNodeComponent
                key={node.path}
                node={node}
                level={0}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onToggle={handleToggle}
                isLast={index === rootNodes.length - 1}
                parentLines={[]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 