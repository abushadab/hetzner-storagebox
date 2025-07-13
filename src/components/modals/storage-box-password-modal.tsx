'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Key } from 'lucide-react';
import { toast } from 'sonner';

interface StorageBoxPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageBox: {
    id: string;
    name: string;
    login: string;
    server: string;
  } | null;
}

export default function StorageBoxPasswordModal({
  isOpen,
  onClose,
  storageBox,
}: StorageBoxPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    if (storageBox && isOpen) {
      loadPassword();
    } else {
      setPassword('');
      setCurrentPassword('');
      setShowPassword(false);
      setShowCurrentPassword(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageBox, isOpen]);

  const loadPassword = async () => {
    if (!storageBox) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/storage-boxes/${storageBox.id}/password`);
      if (!response.ok) throw new Error('Failed to load password');
      
      const data = await response.json();
      setHasPassword(data.hasPassword);
      if (data.password) {
        setCurrentPassword(data.password);
      }
    } catch (error) {
      console.error('Failed to load password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!storageBox || !password) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/storage-boxes/${storageBox.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save password');
      }

      toast.success('Password saved successfully');
      setCurrentPassword(password);
      setPassword('');
      setHasPassword(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save password');
    } finally {
      setSaving(false);
    }
  };

  if (!storageBox) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Storage Box Password</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>{storageBox.name}</strong> ({storageBox.login}@{storageBox.server})
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {hasPassword && currentPassword && (
                <div>
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      readOnly
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="password">
                  {hasPassword ? 'New Password' : 'Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={hasPassword ? 'Enter new password' : 'Enter password'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This password is used for FTP/SSH access and directory browsing
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !password}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Password'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}