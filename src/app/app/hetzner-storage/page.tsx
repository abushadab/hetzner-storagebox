"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { HardDrive, RefreshCw, Loader2, AlertCircle, Server, MapPin, Package } from 'lucide-react';

interface StorageBox {
  id: string;
  hetzner_id: number;
  login: string;
  name: string;
  location: string;
  product: string;
  server: string;
  quota_gb: number;
  used_gb: number;
  is_active: boolean;
  last_synced_at: string;
  created_at: string;
}

export default function HetznerStoragePage() {
  const router = useRouter();
  const [storageBoxes, setStorageBoxes] = useState<StorageBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadStorageBoxes();
  }, []);

  const loadStorageBoxes = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/storage-boxes');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view your storage boxes');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load storage boxes');
      }
      
      const data = await response.json();
      setStorageBoxes(data.storageBoxes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage boxes');
      console.error('Error loading storage boxes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Removed handleAddStorageBox - customers can't add storage boxes

  const handleSync = async (storageBoxId: string) => {
    try {
      setSyncing(storageBoxId);
      
      const response = await fetch(`/api/storage-boxes/${storageBoxId}/sync`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to sync storage box');
      
      await loadStorageBoxes();
    } catch (err) {
      setError('Failed to sync storage box');
      console.error('Error syncing storage box:', err);
    } finally {
      setSyncing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUsagePercentage = (used: number, quota: number) => {
    return quota > 0 ? Math.round((used / quota) * 100) : 0;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">My Storage</h1>
        <p className="text-gray-600 mt-1">Manage your assigned storage boxes</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : storageBoxes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <HardDrive className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No storage boxes assigned to your account</p>
            <p className="text-sm text-gray-500 mt-1">Please contact your administrator to get storage boxes assigned</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {storageBoxes.map((box) => {
            const usagePercent = getUsagePercentage(box.used_gb, box.quota_gb);
            
            return (
              <Card key={box.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{box.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {box.login}@{box.server}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSync(box.id)}
                      disabled={syncing === box.id}
                    >
                      <RefreshCw 
                        className={`w-4 h-4 ${syncing === box.id ? 'animate-spin' : ''}`} 
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Storage Usage</span>
                      <span className="font-medium">
                        {box.used_gb} GB / {box.quota_gb} GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          usagePercent > 90 ? 'bg-red-500' : 
                          usagePercent > 70 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-right">{usagePercent}% used</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-1" />
                      {box.location}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Package className="w-4 h-4 mr-1" />
                      {box.product}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Server className="w-4 h-4 mr-1" />
                      ID: {box.hetzner_id}
                    </div>
                  </div>

                  {box.last_synced_at && (
                    <p className="text-xs text-gray-500">
                      Last synced: {formatDate(box.last_synced_at)}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/app/hetzner-storage/${box.id}`)}
                    >
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}