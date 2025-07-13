'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import HetznerDirectoryTree from '@/components/ui/hetzner-directory-tree';

interface AddSubaccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageBoxId: string;
  onSuccess: () => void;
}

export default function AddSubaccountModal({
  isOpen,
  onClose,
  storageBoxId,
  onSuccess,
}: AddSubaccountModalProps) {
  const [formData, setFormData] = useState({
    home_dir: 'subaccount',
    comment: '',
    ssh: false,
    samba: false,
    webdav: false,
    readonly: false,
    external_reachability: false,
  });
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('.');
  const [treeKey, setTreeKey] = useState(0);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPath('.');
      // Reset form
      setFormData({
        home_dir: 'subaccount',
        comment: '',
        ssh: false,
        samba: false,
        webdav: false,
        readonly: false,
        external_reachability: false,
      });
    }
  }, [isOpen]);

  const generatePassword = async (): Promise<string> => {
    try {
      const response = await fetch('/api/utils/generate-password');
      const data = await response.json();
      return data.password;
    } catch (error) {
      toast.error('Failed to generate password');
      throw error;
    }
  };



  const handleDirectorySelect = (path: string) => {
    setSelectedPath(path);
    // Use path directly as home_dir (already in correct format)
    setFormData({ ...formData, home_dir: path });
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('[AddSubaccountModal] Form submission started');
    console.log('[AddSubaccountModal] Form data:', formData);
    console.log('[AddSubaccountModal] Storage box ID:', storageBoxId);
    
    const password = await generatePassword();
    if (!password) {
      return;
    }

    setLoading(true);
    try {
      console.log('[AddSubaccountModal] Sending POST request to create subaccount...');
      const response = await fetch(`/api/storage-boxes/${storageBoxId}/subaccounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, password }),
      });

      console.log('[AddSubaccountModal] Response status:', response.status);
      const responseData = await response.json();
      console.log('[AddSubaccountModal] Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create subaccount');
      }

      console.log('[AddSubaccountModal] Subaccount created successfully!');
      console.log('[AddSubaccountModal] Hetzner ID:', responseData.hetzner_id);
      console.log('[AddSubaccountModal] Message:', responseData.message);
      
      toast.success(responseData.message || 'Subaccount created successfully');
      
      // If username is pending, show additional info
      if (responseData.subaccount?.username?.startsWith('pending-')) {
        toast.info('The subaccount is being created on Hetzner. Please sync in a few moments to see the actual username.');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('[AddSubaccountModal] Error creating subaccount:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create subaccount');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Subaccount</DialogTitle>
        </DialogHeader>


        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">

            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Home Directory
                  <span className="text-red-500 ml-0.5">*</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTreeKey(prev => prev + 1)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Refresh directories"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2">
                <HetznerDirectoryTree
                  key={treeKey}
                  storageBoxId={storageBoxId}
                  selectedPath={selectedPath}
                  onSelect={handleDirectorySelect}
                />
                
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="font-mono text-sm text-gray-700">{formData.home_dir || '/'}</span>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="comment">Add description</Label>
              <Input
                id="comment"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">ADDITIONAL SETTINGS</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, samba: !formData.samba })}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    formData.samba 
                      ? "bg-blue-50 border-blue-300 text-blue-700" 
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  Allow SMB
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, webdav: !formData.webdav })}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    formData.webdav 
                      ? "bg-blue-50 border-blue-300 text-blue-700" 
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  Allow WebDAV
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, ssh: !formData.ssh })}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    formData.ssh 
                      ? "bg-blue-50 border-blue-300 text-blue-700" 
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  Allow SSH
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, external_reachability: !formData.external_reachability })}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    formData.external_reachability 
                      ? "bg-blue-50 border-blue-300 text-blue-700" 
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  External reachability
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, readonly: !formData.readonly })}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    formData.readonly 
                      ? "bg-blue-50 border-blue-300 text-blue-700" 
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  Read-Only
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Subaccount'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}