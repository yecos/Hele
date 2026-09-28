'use client';

import { useRouter } from 'next/navigation';
import AdminPanel from '@/components/guardian/AdminPanel';

export default function GuardianAdminPage() {
  const router = useRouter();

  return (
    <AdminPanel
      mode="page"
      onClose={() => router.push('/live')}
    />
  );
}
