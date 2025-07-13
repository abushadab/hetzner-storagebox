'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, UserPlus, UserMinus, RefreshCw, HardDrive, Key } from 'lucide-react';
import { toast } from 'sonner';
import StorageBoxPasswordModal from '@/components/modals/storage-box-password-modal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StorageBox {
  id: string;
  hetzner_id: number;
  name: string;
  login: string;
  server: string;
  location: string;
  product: string;
  quota_gb: number;
  used_gb: number;
  is_assigned: boolean;
  user_id: string | null;
}

interface User {
  id: string;
  email: string;
}

export default function AdminStoragePage() {
  const [storageBoxes, setStorageBoxes] = useState<StorageBox[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBox, setSelectedBox] = useState<StorageBox | null>(null);
  const [newBoxId, setNewBoxId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedBoxForPassword, setSelectedBoxForPassword] = useState<StorageBox | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [boxesRes, usersRes] = await Promise.all([
        fetch('/api/admin/storage-boxes'),
        fetch('/api/admin/users')
      ]);

      if (!boxesRes.ok || !usersRes.ok) throw new Error('Failed to fetch data');
      
      const [boxesData, usersData] = await Promise.all([
        boxesRes.json(),
        usersRes.json()
      ]);

      setStorageBoxes(boxesData.storageBoxes);
      setUsers(usersData.users);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStorageBox = async () => {
    if (!newBoxId) return;
    
    setAdding(true);
    try {
      const response = await fetch('/api/admin/storage-boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_box_id: parseInt(newBoxId) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add storage box');
      }

      toast.success('Storage box added successfully');
      setNewBoxId('');
      setAddDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add storage box');
    } finally {
      setAdding(false);
    }
  };

  const handleAssignBox = async () => {
    if (!selectedBox || !selectedUserId) return;
    
    setAssigning(true);
    try {
      const response = await fetch('/api/admin/storage-boxes/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_box_id: selectedBox.id,
          user_id: selectedUserId,
        }),
      });

      if (!response.ok) throw new Error('Failed to assign storage box');

      toast.success('Storage box assigned successfully');
      setAssignDialogOpen(false);
      setSelectedBox(null);
      setSelectedUserId('');
      fetchData();
    } catch {
      toast.error('Failed to assign storage box');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignBox = async (boxId: string) => {
    try {
      const response = await fetch(`/api/admin/storage-boxes/assign?id=${boxId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to unassign storage box');

      toast.success('Storage box unassigned successfully');
      fetchData();
    } catch {
      toast.error('Failed to unassign storage box');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Storage Management</h1>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Storage Box
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Storage Box</DialogTitle>
                <DialogDescription>
                  Enter the ID of an existing storage box to add it to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="box-id">Storage Box ID</Label>
                  <Input
                    id="box-id"
                    type="number"
                    value={newBoxId}
                    onChange={(e) => setNewBoxId(e.target.value)}
                    placeholder="e.g. 12345"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddStorageBox}
                  disabled={!newBoxId || adding}
                >
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Storage Box'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Storage Boxes</CardTitle>
          <CardDescription>
            Manage storage boxes and assign them to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storageBoxes.map((box) => (
                <TableRow key={box.id}>
                  <TableCell className="font-mono">{box.hetzner_id}</TableCell>
                  <TableCell className="font-medium">{box.name}</TableCell>
                  <TableCell>{box.location}</TableCell>
                  <TableCell>{box.product}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {box.used_gb} / {box.quota_gb} GB
                    </div>
                  </TableCell>
                  <TableCell>
                    {box.is_assigned ? (
                      <Badge variant="secondary">Assigned</Badge>
                    ) : (
                      <span className="text-gray-500">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBoxForPassword(box);
                          setPasswordModalOpen(true);
                        }}
                        title="Manage Password"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      {box.is_assigned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnassignBox(box.id)}
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedBox(box);
                            setAssignDialogOpen(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {storageBoxes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <HardDrive className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No storage boxes found</p>
              <p className="text-sm mt-2">Add a storage box to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Storage Box</DialogTitle>
            <DialogDescription>
              Select a user to assign storage box {selectedBox?.name} to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedBox(null);
                setSelectedUserId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignBox}
              disabled={!selectedUserId || assigning}
            >
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Management Modal */}
      <StorageBoxPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setSelectedBoxForPassword(null);
        }}
        storageBox={selectedBoxForPassword}
      />
    </div>
  );
}