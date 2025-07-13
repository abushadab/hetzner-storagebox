import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';
import Link from 'next/link';
import { Users, HardDrive, Settings, ArrowLeft } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await isAdmin();
  
  if (!adminUser) {
    redirect('/app/hetzner-storage');
  }

  return (
    <div className="flex min-h-screen">
      {/* Admin Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
          
          <nav className="space-y-2">
            <Link 
              href="/app/admin/users" 
              className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </Link>
            
            <Link 
              href="/app/admin/storage" 
              className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              <HardDrive className="w-5 h-5" />
              <span>Storage Boxes</span>
            </Link>
            
            <Link 
              href="/app/admin/settings" 
              className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </nav>
          
          <div className="mt-8 pt-8 border-t border-gray-700">
            <Link 
              href="/app/hetzner-storage" 
              className="flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-800 transition-colors text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to App</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}