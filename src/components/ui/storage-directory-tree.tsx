'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Folder, FolderOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isExpanded: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  isNew?: boolean;
  isEditing?: boolean;
}

interface DirectoryTreeProps {
  storageBoxId: string;
  selectedPath: string;
  onSelect: (path: string) => void;
  className?: string;
}

interface TreeNodeComponentProps {
  node: TreeNode;
  selectedPath: string;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onCreateDirectory: (parentPath: string, name: string) => void;
  onStartEdit: (path: string) => void;
  onCancelEdit: (path: string) => void;
  isLastItem?: boolean;
  isLastInGroup?: boolean;
  parentIsLastItem?: boolean;
  level?: number;
  parentLevels?: boolean[];
}

const EditableFolder: React.FC<{
  onSubmit: (name: string) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (value.trim()) {
              onSubmit(value.trim());
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        onBlur={() => {
          // Small delay to allow button click to register
          setTimeout(() => {
            if (!value.trim()) {
              onCancel();
            }
          }, 200);
        }}
        className="px-1 py-0 text-sm border border-gray-300 rounded outline-none focus:border-blue-500"
        placeholder="new_directory"
      />
      <button
        type="button"
        className="px-2 py-0.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (value.trim()) {
            onSubmit(value.trim());
          }
        }}
      >
        OK
      </button>
    </div>
  );
};

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({
  node,
  selectedPath,
  onSelect,
  onToggle,
  onCreateDirectory,
  onStartEdit,
  onCancelEdit,
  isLastItem = false,
  level = 0,
  parentLevels = [],
}) => {
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0 || !node.isLoaded;
  
  const handleClick = () => {
    if (node.isNew && !node.isEditing) {
      onStartEdit(node.path);
    } else if (!node.isNew) {
      onSelect(node.path);
      if (hasChildren && !node.isExpanded) {
        onToggle(node.path);
      }
    }
  };

  return (
    <>
      <div 
        className={cn(
          "relative flex items-center gap-1"
        )}
        style={{ paddingLeft: `${level * 24}px` }}
      >
        {/* Tree lines */}
        {level > 0 && (
          <>
            {/* Vertical lines for parent levels */}
            {parentLevels.map((hasMore, idx) => 
              hasMore && (
                <div 
                  key={idx}
                  className="absolute top-0 h-full border-l-2 border-gray-300"
                  style={{ left: `${idx * 24 + 12}px` }}
                />
              )
            )}
            
            {/* Current level vertical line */}
            {!isLastItem && (
              <div 
                className="absolute top-0 h-full border-l-2 border-gray-300"
                style={{ left: `${(level - 1) * 24 + 12}px` }}
              />
            )}
            {/* Vertical line for last item */}
            {isLastItem && (
              <div 
                className="absolute -top-0.5 h-1/2 border-l-2 border-gray-300"
                style={{ left: `${(level - 1) * 24 + 12}px` }}
              />
            )}
            {/* Horizontal line to connect to parent */}
            <div 
              className="absolute top-1/2 w-6 border-t-2 border-gray-300"
              style={{ left: `${(level - 1) * 24 + 12}px` }}
            />
          </>
        )}
        
        {/* Horizontal line for first level folders */}
        {level === 0 && (
          <div 
            className="absolute top-1/2 w-6 border-t-2 border-gray-300"
            style={{ left: '-6px' }}
          />
        )}
        {node.isEditing ? (
          <div className={cn(
            "relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ml-3 mt-0.5"
          )}>
            <Folder className="w-4 h-4 text-gray-400" />
            <EditableFolder
              onSubmit={(name) => onCreateDirectory(node.path.substring(0, node.path.lastIndexOf('/')), name)}
              onCancel={() => onCancelEdit(node.path)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ml-3 mt-0.5 transition-colors",
              "hover:bg-gray-100",
              isSelected && !node.isNew && "bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_#2563eb]"
            )}
          >
            {node.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : node.isNew ? (
              <Folder className="w-4 h-4 text-gray-400" />
            ) : hasChildren && node.isExpanded ? (
              <FolderOpen className={cn("w-4 h-4", isSelected ? "text-blue-600" : "text-gray-600")} />
            ) : (
              <Folder className={cn("w-4 h-4", isSelected ? "text-blue-600" : "text-gray-600")} />
            )}
            
            <span className={cn(
              "text-sm",
              isSelected && !node.isNew && "font-medium",
              node.isNew && "text-gray-400 italic"
            )}>
              {node.name}
            </span>
          </button>
        )}
      </div>
      
      {/* Children */}
      {node.isExpanded && !node.isNew && (
        <>
          {node.children.map((child, index) => {
            const hasNewChild = node.children.some(c => c.isNew);
            const actualLastItem = hasNewChild ? false : index === node.children.length - 1;
            const newParentLevels = [...parentLevels, !isLastItem];
            
            return (
              <TreeNodeComponent
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onToggle={onToggle}
                onCreateDirectory={onCreateDirectory}
                onStartEdit={onStartEdit}
                onCancelEdit={onCancelEdit}
                isLastItem={actualLastItem}
                isLastInGroup={index === node.children.length - 1}
                parentIsLastItem={isLastItem}
                level={level + 1}
                parentLevels={newParentLevels}
              />
            );
          })}
        </>
      )}
    </>
  );
};

export default function StorageDirectoryTree({
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
      return data.directories || [];
    } catch (error) {
      console.error('Error loading directories:', error);
      toast.error('Failed to load directories');
      return [];
    }
  }, [storageBoxId]);

  const createTreeNode = (item: DirectoryItem, isNew = false): TreeNode => ({
    name: item.name,
    path: item.path,
    children: [],
    isExpanded: false,
    isLoading: false,
    isLoaded: false,
    isNew,
    isEditing: false,
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
        // Add new_directory placeholder at the end
        const newDirNode = createTreeNode(
          { 
            name: 'new_directory', 
            path: `${path}/new_directory_${Date.now()}`,
            type: 'directory'
          }, 
          true
        );
        
        return { 
          ...node, 
          children: [...children, newDirNode], 
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
      setRootNodes(prev => updateTreeNode(prev, path, { isExpanded: false }));
    } else {
      if (!node.isLoaded) {
        setRootNodes(prev => updateTreeNode(prev, path, { isLoading: true }));
        const directories = await loadDirectories(path);
        const childNodes = directories.map(d => createTreeNode(d));
        setRootNodes(prev => addChildrenToNode(prev, path, childNodes));
      } else {
        setRootNodes(prev => updateTreeNode(prev, path, { isExpanded: true }));
      }
    }
  };

  const handleStartEdit = (path: string) => {
    setRootNodes(prev => updateTreeNode(prev, path, { isEditing: true }));
  };

  const handleCancelEdit = (path: string) => {
    setRootNodes(prev => updateTreeNode(prev, path, { isEditing: false }));
  };

  const handleCreateDirectory = async (parentPath: string, name: string) => {
    // Create the new directory node
    const newPath = parentPath ? `${parentPath}/${name}` : name;
    
    // Remove the temporary new_directory node and add the actual directory
    const removeNewDirAndAdd = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.path === parentPath) {
          const filteredChildren = node.children?.filter(child => !child.isNew) || [];
          const newNode = createTreeNode({ name, path: newPath, type: 'directory' });
          const newDirNode = createTreeNode(
            { 
              name: 'new_directory', 
              path: `${parentPath}/new_directory_${Date.now()}`,
              type: 'directory'
            }, 
            true
          );
          
          return {
            ...node,
            children: [...filteredChildren, newNode, newDirNode],
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: removeNewDirAndAdd(node.children) };
        }
        return node;
      });
    };
    
    if (!parentPath) {
      // Root level
      const filteredNodes = rootNodes.filter(node => !node.isNew);
      const newNode = createTreeNode({ name, path: newPath, type: 'directory' });
      const newDirNode = createTreeNode(
        { 
          name: 'new_directory', 
          path: `new_directory_${Date.now()}`,
          type: 'directory'
        }, 
        true
      );
      setRootNodes([...filteredNodes, newNode, newDirNode]);
    } else {
      setRootNodes(prev => removeNewDirAndAdd(prev));
    }
    
    // Select the newly created directory
    onSelect(newPath);
  };

  // Load root directories on mount
  useEffect(() => {
    const loadInitialDirectories = async () => {
      setIsLoading(true);
      try {
        const directories = await loadDirectories('');
        const nodes = directories.map(d => createTreeNode(d));
        // Add new_directory at root level
        const newDirNode = createTreeNode(
          { 
            name: 'new_directory', 
            path: `new_directory_${Date.now()}`,
            type: 'directory'
          }, 
          true
        );
        setRootNodes([...nodes, newDirNode]);
      } catch {
        toast.error('Failed to load initial directories');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialDirectories();
  }, [loadDirectories]);

  return (
    <div className={cn("max-h-96 overflow-auto border-l-2 border-gray-300", className)}>
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
          {rootNodes.map((node, index) => {
            const hasNewNode = rootNodes.some(n => n.isNew);
            const actualLastItem = hasNewNode ? false : index === rootNodes.length - 1;
            
            return (
              <TreeNodeComponent
                key={node.path}
                node={node}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onToggle={handleToggle}
                onCreateDirectory={handleCreateDirectory}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                isLastItem={actualLastItem}
                isLastInGroup={index === rootNodes.length - 1}
                level={0}
                parentLevels={[]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}