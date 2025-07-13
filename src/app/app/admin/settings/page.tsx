'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Setting {
  key: string;
  value: string;
  encrypted: boolean;
  description: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      setSettings(data.settings);
      
      // Find API token setting
      const apiTokenSetting = data.settings.find((s: Setting) => s.key === 'storage_api_token');
      if (apiTokenSetting) {
        setApiToken(apiTokenSetting.value || '');
      }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiToken = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'storage_api_token',
          value: apiToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save API token');
      }

      toast.success('API token saved successfully');
      fetchSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save API token');
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Storage Provider API Configuration</CardTitle>
          <CardDescription>
            Configure the global API token for managing storage boxes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-token">API Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-token"
                  type={showApiToken ? 'text' : 'password'}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your storage provider API token"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiToken(!showApiToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showApiToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button 
                onClick={handleSaveApiToken}
                disabled={saving || !apiToken}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              This token will be used for all storage box operations. Keep it secure.
            </p>
          </div>

          {settings.find(s => s.key === 'storage_api_token')?.updated_at && (
            <div className="text-sm text-gray-500">
              Last updated: {new Date(settings.find(s => s.key === 'storage_api_token')!.updated_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}