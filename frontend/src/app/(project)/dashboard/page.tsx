'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import RecentActivityPanel from '@/components/dashboard/RecentActivityPanel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import useAuth from '@/hooks/useAuth';
import { useProjectStore } from '@/lib/projectStore';
import { DashboardAPI, type DashboardSummary } from '@/lib/api/dashboardApi';

function IconProjects() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="2" fill="url(#stat-gp)" />
      <rect x="12" y="2" width="8" height="8" rx="2" fill="url(#stat-gp)" opacity="0.7" />
      <rect x="2" y="12" width="8" height="8" rx="2" fill="url(#stat-gp)" opacity="0.5" />
      <rect x="12" y="12" width="8" height="8" rx="2" fill="url(#stat-gp)" opacity="0.3" />
      <defs>
        <linearGradient id="stat-gp" x1="2" y1="2" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00c9a7" />
          <stop offset="1" stopColor="#7ecb5f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconForms() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="16" height="18" rx="2.5" stroke="url(#stat-gf)" strokeWidth="1.5" fill="none" />
      <line x1="7" y1="7" x2="15" y2="7" stroke="url(#stat-gf)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="11" x2="15" y2="11" stroke="url(#stat-gf)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="15" x2="11" y2="15" stroke="url(#stat-gf)" strokeWidth="1.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="stat-gf" x1="3" y1="2" x2="19" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00c9a7" />
          <stop offset="1" stopColor="#7ecb5f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconTickets() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M2 8.5C2 7.4 2.9 6.5 4 6.5h14c1.1 0 2 .9 2 2v5c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-5z" stroke="url(#stat-gt)" strokeWidth="1.5" fill="none" />
      <circle cx="7" cy="11" r="1.5" fill="url(#stat-gt)" />
      <line x1="10.5" y1="9.5" x2="16" y2="9.5" stroke="url(#stat-gt)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="10.5" y1="12.5" x2="14" y2="12.5" stroke="url(#stat-gt)" strokeWidth="1.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="stat-gt" x1="2" y1="6.5" x2="20" y2="15.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00c9a7" />
          <stop offset="1" stopColor="#7ecb5f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconGroups() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="8" r="3" stroke="url(#stat-gg)" strokeWidth="1.5" fill="none" />
      <circle cx="4.5" cy="9.5" r="2" stroke="url(#stat-gg)" strokeWidth="1.3" fill="none" />
      <circle cx="17.5" cy="9.5" r="2" stroke="url(#stat-gg)" strokeWidth="1.3" fill="none" />
      <path d="M5 18c0-2.76 2.686-5 6-5s6 2.24 6 5" stroke="url(#stat-gg)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <defs>
        <linearGradient id="stat-gg" x1="2" y1="6" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00c9a7" />
          <stop offset="1" stopColor="#7ecb5f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconFormsInverse() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3" y="2" width="16" height="18" rx="2.5" stroke="#ffffff" strokeWidth="1.5" fill="none" />
      <line x1="7" y1="7" x2="15" y2="7" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="11" x2="15" y2="11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="15" x2="11" y2="15" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCtaArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="url(#cta-ga)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="cta-ga" x1="3" y1="8" x2="13" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00c9a7" />
          <stop offset="1" stopColor="#7ecb5f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const CARD_SHADOW = '0 1px 4px rgba(30, 45, 64, 0.05)';
const DISPLAY_FONT = "'Outfit', sans-serif";

function StatTile({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'linear-gradient(135deg, #e8faf6 0%, #f0faf0 100%)' }}
      >
        {icon}
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
        <div className="flex flex-col gap-6 p-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-[#00c9a7] to-[#7ecb5f] bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>
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
              <StatTile icon={<IconProjects />} label="Projects" value={summary?.project_count ?? 0} href="/select-project" />
              <StatTile icon={<IconForms />} label="Ticket forms" value={summary?.ticket_form_count ?? 0} href="/admin/ticket-forms" />
              <StatTile icon={<IconTickets />} label="Tickets" value={summary?.ticket_count ?? 0} />
              <StatTile icon={<IconGroups />} label="Experience groups" value={summary?.experience_group_count ?? 0} href="/admin/experience-groups" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div
              className="flex h-full flex-col overflow-hidden rounded-xl border border-[#e2eaf0] bg-white lg:col-span-3"
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div className="brand-gradient-bg h-1.5 shrink-0" />
              <div className="flex flex-1 flex-col justify-between p-6">
                <div className="mb-6">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#00c9a7]">
                    Quick Access
                  </p>
                  <p className="text-sm text-[#637489]">Jump into your most-used tools</p>
                </div>
                <Link
                  href="/admin/ticket-forms"
                  className="group flex items-center gap-4 rounded-xl border border-[#e2eaf0] p-4 transition-all duration-200 hover:border-[#00c9a7] hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #f8fdfc 0%, #f8fdf5 100%)' }}
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: 'linear-gradient(135deg, #00c9a7 0%, #7ecb5f 100%)' }}
                  >
                    <IconFormsInverse />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p
                      className="mb-0.5 text-[15px] font-semibold text-[#1e2d40]"
                      style={{ fontFamily: DISPLAY_FONT }}
                    >
                      Ticket Form Builder
                    </p>
                    <p className="text-sm leading-relaxed text-[#637489]">
                      Create and manage support ticket forms, and configure the public request portal.
                    </p>
                  </div>
                  <div className="shrink-0 opacity-60 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
                    <IconCtaArrow />
                  </div>
                </Link>
              </div>
            </div>

            <div className="h-full lg:col-span-2">
              <RecentActivityPanel />
            </div>
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
  );
}
