'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';



interface SubAccount {
  id: string;
  username: string;
  home_dir: string;
  comment: string;
  samba: boolean;
  ssh: boolean;
  webdav: boolean;
  readonly: boolean;
  external_reachability: boolean;
  password_encrypted?: string;
}

interface EditSubaccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageBoxId: string;
  subaccount: SubAccount | null;
  onSuccess: () => void;
}

export default function EditSubaccountModal({
  isOpen,
  onClose,
  storageBoxId,
  subaccount,
  onSuccess,
}: EditSubaccountModalProps) {
  const [formData, setFormData] = useState({
    comment: '',
    ssh: false,
    samba: false,
    webdav: false,
    readonly: false,
    external_reachability: false,
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (subaccount) {
      setFormData({
        comment: subaccount.comment || '',
        ssh: subaccount.ssh,
        samba: subaccount.samba,
        webdav: subaccount.webdav,
        readonly: subaccount.readonly,
        external_reachability: subaccount.external_reachability,
      });
      setShowDeleteConfirm(false);
    }
  }, [subaccount]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subaccount) return;

    setLoading(true);
    try {
      // Update access settings
      const response = await fetch(`/api/storage-boxes/${storageBoxId}/subaccounts/${subaccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update subaccount');
      }

      toast.success('Subaccount updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subaccount');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!subaccount) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/storage-boxes/${storageBoxId}/subaccounts/${subaccount.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete subaccount');
      }

      toast.success('Subaccount deleted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete subaccount');
    } finally {
      setDeleting(false);
    }
  };

  if (!subaccount) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Subaccount: {subaccount.username}</DialogTitle>
        </DialogHeader>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to delete this subaccount? This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Subaccount'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div>
                <Label>Username</Label>
                <Input value={subaccount.username} disabled />
              </div>

              <div>
                <Label>Home Directory</Label>
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                  <span className="font-mono text-sm text-gray-700">{subaccount.home_dir || '/'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Directory path cannot be changed after creation
                </p>
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

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Subaccount'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}