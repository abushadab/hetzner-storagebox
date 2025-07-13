'use client';

import React, { useState } from 'react';
import { Copy, Eye, EyeOff, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Credential {
  label: string;
  value: string;
  isPassword?: boolean;
}

interface CredentialsDisplayProps {
  credentials: Credential[];
  className?: string;
}

export default function CredentialsDisplay({ credentials, className }: CredentialsDisplayProps) {
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {credentials.map((cred) => (
        <div key={cred.label} className="flex items-center gap-2">
          <span className="text-sm text-gray-600 min-w-[80px]">{cred.label}:</span>
          <div className="flex items-center gap-1 flex-1">
            {cred.isPassword ? (
              <>
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                  {showPassword[cred.label] ? cred.value : '••••••••••••'}
                </code>
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => ({
                    ...prev,
                    [cred.label]: !prev[cred.label]
                  }))}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title={showPassword[cred.label] ? "Hide password" : "Show password"}
                >
                  {showPassword[cred.label] ? (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </>
            ) : (
              <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                {cred.value}
              </code>
            )}
            <button
              type="button"
              onClick={() => copyToClipboard(cred.value, cred.label)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={`Copy ${cred.label.toLowerCase()}`}
            >
              {copiedField === cred.label ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}