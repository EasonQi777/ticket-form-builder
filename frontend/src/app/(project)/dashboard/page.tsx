'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Ticket, Users2, FolderKanban, ArrowRight } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import RecentActivityPanel from '@/components/dashboard/RecentActivityPanel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useAuth from '@/hooks/useAuth';
import { useProjectStore } from '@/lib/projectStore';
import { DashboardAPI, type DashboardSummary } from '@/lib/api/dashboardApi';

function StatTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3CCED7]/10 text-[#0F9AA6]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#3CCED7] hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const activeProject = useProjectStore((s) => s.activeProject);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    DashboardAPI.summary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = user?.first_name || user?.username || user?.email || 'there';

  return (
    <ProtectedRoute requiredAuth={true} fallback="/unauthorized">
      <DashboardLayout alerts={[]} upcomingMeetings={[]}>
        <div className="flex flex-col gap-6 p-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {user?.email}
              {activeProject ? ` · ${activeProject.name}` : ''}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-10">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile icon={FolderKanban} label="Projects" value={summary?.project_count ?? 0} href="/select-project" />
              <StatTile icon={ClipboardList} label="Ticket forms" value={summary?.ticket_form_count ?? 0} href="/admin/ticket-forms" />
              <StatTile icon={Ticket} label="Tickets" value={summary?.ticket_count ?? 0} />
              <StatTile icon={Users2} label="Experience groups" value={summary?.experience_group_count ?? 0} href="/admin/experience-groups" />
            </div>
          )}

          {/*
            Equal 50/50 split: "Ticket Form Builder" (Quick Access) takes half
            the row width, Recent Activity takes the other half — matches
            RECENT_ACTIVITY_FEATURE_DESIGN.md §3. Stacks to one column on
            narrow viewports, same convention as the stat-card grid above.
          */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Link
              href="/admin/ticket-forms"
              className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#3CCED7] hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-[#3CCED7] to-[#A6E661] text-white">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Ticket Form Builder</h2>
                  <p className="text-sm text-gray-500">
                    Create and manage support ticket forms, and configure the public request portal.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#0F9AA6]" />
            </Link>

            <RecentActivityPanel />
          </div>

          {!activeProject && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              You don&apos;t have an active project selected. Ticket forms are scoped to a project -{' '}
              <Link href="/select-project" className="font-medium underline underline-offset-2">
                choose or create one
              </Link>{' '}
              to get started.
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
