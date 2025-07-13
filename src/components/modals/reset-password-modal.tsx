'use client';

import { useState } from 'react';
import { X, RefreshCw, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: (password: string) => Promise<{ success: boolean; error?: string }>;
  accountType: 'main' | 'subaccount';
  accountName: string;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  onReset,
  accountType,
  accountName
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const generatePassword = async () => {
    try {
      const response = await fetch('/api/utils/generate-password');
      const data = await response.json();
      setPassword(data.password);
      setError(null);
    } catch {
      setError('Failed to generate password');
    }
  };

  const handleReset = async () => {
    if (!password) {
      setError('Please enter or generate a password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onReset(password);
      if (result.success) {
        setSuccess(true);
        // Auto-hide modal after 30 seconds
        setTimeout(() => {
          onClose();
        }, 30000);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy password');
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setCopied(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Reset Password - {accountType === 'main' ? 'Storage Box' : 'Subaccount'} {accountName}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!success ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Warning: Resetting the password will disconnect all active connections.
                Make sure to update your applications with the new password.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password or generate one"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  onClick={generatePassword}
                  variant="outline"
                  className="px-3"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                disabled={loading || !password}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">Password reset successfully!</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-700">New Password:</p>
                <button
                  onClick={copyToClipboard}
                  className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <code className="block p-3 bg-white border border-gray-200 rounded text-sm font-mono break-all">
                {password}
              </code>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2">Please save this password securely. You won&apos;t be able to see it again.</p>
              <p>This modal will close automatically in 30 seconds.</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}