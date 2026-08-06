'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';

/**
 * Root route. mediaJira's "/" was the marketing site (out of scope for this
 * extracted project - see README "Known simplifications"). This just sends
 * signed-in users to their dashboard and everyone else to login.
 */
export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, loading, router]);

  return null;
}
