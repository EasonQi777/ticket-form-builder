'use client';

import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

/**
 * Shared app chrome for project routes so the header and sidebar stay mounted
 * when moving between Dashboard, Ticket Form Builder, and other admin pages.
 * Portal preview is a full-page shell and skips this chrome.
 */
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPreview = pathname?.includes('/preview');

  if (isPreview) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute requiredAuth fallback="/unauthorized">
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
