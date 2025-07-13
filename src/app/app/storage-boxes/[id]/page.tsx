'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  ArrowLeft, 
  HardDrive, 
  Users, 
  RefreshCw,
  AlertCircle,
  Plus,
  Settings,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import AddSubaccountModal from '@/components/modals/add-subaccount-modal';
import EditSubaccountModal from '@/components/modals/edit-subaccount-modal';
import { ResetPasswordModal } from '@/components/modals/reset-password-modal';
import CredentialsDisplay from '@/components/ui/credentials-display';

interface StorageBox {
  id: string;
  hetzner_id: number;
  name: string;
  login: string;
  location: string;
  product: string;
  server: string;
  quota_gb: number;
  used_gb: number;
  is_active: boolean;
  last_synced_at: string;
  password?: string;
}

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
  password?: string;
}

export default function StorageBoxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [storageBox, setStorageBox] = useState<StorageBox | null>(null);
  const [subaccounts, setSubaccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingSubaccounts, setSyncingSubaccounts] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubaccount, setSelectedSubaccount] = useState<SubAccount | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{
    type: 'main' | 'subaccount';
    name: string;
    id?: string;
  } | null>(null);

  useEffect(() => {
    if (id) {
      loadStorageBox();
      loadSubaccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadStorageBox = async () => {
    try {
      const response = await fetch(`/api/storage-boxes/${id}`);
      if (!response.ok) throw new Error('Failed to load storage box');
      
      const data = await response.json();
      setStorageBox(data.storageBox);
    } catch (err) {
      setError('Failed to load storage box details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubaccounts = async () => {
    try {
      const response = await fetch(`/api/storage-boxes/${id}/subaccounts`);
      if (!response.ok) throw new Error('Failed to load subaccounts');
      
      const data = await response.json();
      setSubaccounts(data.subaccounts || []);
      
      // If no subaccounts in database, automatically sync from storage API
      if (!data.subaccounts || data.subaccounts.length === 0) {
        console.log('No subaccounts found in database, syncing from storage API...');
        await syncSubaccounts(false); // false = don't show toast notification
      }
    } catch (err) {
      console.error('Failed to load subaccounts:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/storage-boxes/${id}/sync`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to sync');

      toast.success('Storage box synced successfully');
      loadStorageBox();
    } catch {
      toast.error('Failed to sync storage box');
    } finally {
      setSyncing(false);
    }
  };

  const syncSubaccounts = async (showToast = true) => {
    setSyncingSubaccounts(true);
    try {
      const response = await fetch(`/api/storage-boxes/${id}/sync-subaccounts`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to sync subaccounts');

      const data = await response.json();
      
      // Only show toast if explicitly requested (manual sync)
      if (showToast) {
        toast.success(`Synced ${data.synced} new, ${data.updated} updated, ${data.deleted} removed subaccounts`);
      }
      
      // Update subaccounts state directly with the returned data
      if (data.subaccounts) {
        setSubaccounts(data.subaccounts);
      }
    } catch (err) {
      if (showToast) {
        toast.error('Failed to sync subaccounts');
      }
      console.error('Failed to sync subaccounts:', err);
    } finally {
      setSyncingSubaccounts(false);
    }
  };

  const getUsagePercentage = (used: number, quota: number) => {
    return quota > 0 ? Math.round((used / quota) * 100) : 0;
  };

  const handleResetPassword = async (password: string) => {
    if (!resetPasswordTarget) {
      return { success: false, error: 'No target selected' };
    }

    try {
      let response;
      if (resetPasswordTarget.type === 'main') {
        response = await fetch(`/api/storage-boxes/${id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
      } else {
        response = await fetch(`/api/storage-boxes/${id}/subaccounts/${resetPasswordTarget.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error };
      }

      toast.success(`Password reset successfully for ${resetPasswordTarget.name}`);
      
      // Reload data to get updated password
      if (resetPasswordTarget.type === 'main') {
        loadStorageBox();
      } else {
        loadSubaccounts();
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Failed to reset password' };
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !storageBox) {
    return (
      <div className="space-y-6 p-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/app/storage-boxes')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Storage
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Storage box not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const usagePercent = getUsagePercentage(storageBox.used_gb, storageBox.quota_gb);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/app/storage-boxes')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Storage
        </Button>
        
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Storage Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              {storageBox.name}
            </CardTitle>
            <CardDescription>
              {storageBox.login}@{storageBox.server}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Storage Usage</span>
                <span className="font-medium">
                  {storageBox.used_gb} GB / {storageBox.quota_gb} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    usagePercent > 90 ? 'bg-red-500' : 
                    usagePercent > 70 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-right mt-1">{usagePercent}% used</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium">{storageBox.location}</p>
              </div>
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium">{storageBox.product}</p>
              </div>
              <div>
                <p className="text-gray-500">Storage ID</p>
                <p className="font-medium">{storageBox.hetzner_id}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={storageBox.is_active ? 'default' : 'secondary'}>
                  {storageBox.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Main Storage Box Credentials */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Connection Details</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setResetPasswordTarget({ type: 'main', name: storageBox.name });
                    setShowResetPasswordModal(true);
                  }}
                >
                  <Key className="w-3 h-3 mr-1" />
                  Reset Password
                </Button>
              </div>
              <div className="space-y-4">
                {/* FTP Credentials */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-2">FTP</p>
                  <CredentialsDisplay
                    credentials={[
                      { label: 'Host', value: `${storageBox.login}.your-storagebox.de` },
                      { label: 'Port', value: '21' },
                      { label: 'Username', value: storageBox.login },
                      { label: 'Password', value: storageBox.password || 'Not set', isPassword: true },
                    ]}
                  />
                </div>
              </div>
              
              {/* Service Badges */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>SSH</Badge>
                <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>Samba</Badge>
                <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>WebDAV</Badge>
                <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>External</Badge>
              </div>
            </div>

            {storageBox.last_synced_at && (
              <p className="text-xs text-gray-500 mt-4">
                Last synced: {new Date(storageBox.last_synced_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subaccounts Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Subaccounts
                </CardTitle>
                <CardDescription>
                  Manage subaccount access
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => syncSubaccounts(true)}
                  disabled={syncingSubaccounts}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${syncingSubaccounts ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
                <Button size="sm" onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {subaccounts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No subaccounts created yet
              </p>
            ) : (
              <div className="space-y-3">
                {subaccounts.map((subaccount) => (
                  <div key={subaccount.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{subaccount.username}</p>
                        <p className="text-sm text-gray-500">
                          {subaccount.comment && subaccount.comment !== subaccount.home_dir ? (
                            <>Home: {subaccount.home_dir} • Description: {subaccount.comment}</>
                          ) : (
                            <>Home: {subaccount.home_dir}</>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setResetPasswordTarget({ 
                              type: 'subaccount', 
                              name: subaccount.username, 
                              id: subaccount.id 
                            });
                            setShowResetPasswordModal(true);
                          }}
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedSubaccount(subaccount);
                            setShowEditModal(true);
                          }}
                          title="Edit Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Connection Details */}
                    <div className="space-y-3">
                      {/* FTP Credentials - Always show */}
                      <div>
                        <p className="text-sm font-bold text-gray-700 mb-2">FTP</p>
                        <CredentialsDisplay
                          credentials={[
                            { label: 'Host', value: `${subaccount.username}.your-storagebox.de` },
                            { label: 'Port', value: '21' },
                            { label: 'Username', value: subaccount.username },
                            { label: 'Password', value: subaccount.password || 'Not set', isPassword: true },
                          ]}
                        />
                      </div>
                      
                    </div>
                    
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {subaccount.ssh && <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>SSH</Badge>}
                      {subaccount.samba && <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>Samba</Badge>}
                      {subaccount.webdav && <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>WebDAV</Badge>}
                      {subaccount.readonly && <Badge variant="secondary">Read-only</Badge>}
                      {subaccount.external_reachability && <Badge className="hover:bg-[#f2fdf6] border-0" style={{ backgroundColor: '#f2fdf6', color: '#17a64e' }}>External</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Subaccount Modal */}
      <AddSubaccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        storageBoxId={id}
        onSuccess={loadSubaccounts}
      />

      {/* Edit Subaccount Modal */}
      <EditSubaccountModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSubaccount(null);
        }}
        storageBoxId={id}
        subaccount={selectedSubaccount}
        onSuccess={loadSubaccounts}
      />

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setResetPasswordTarget(null);
          }}
          onReset={handleResetPassword}
          accountType={resetPasswordTarget.type}
          accountName={resetPasswordTarget.name}
        />
      )}
    </div>
  );
}