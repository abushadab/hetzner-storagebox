import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/app/admin/users');
}