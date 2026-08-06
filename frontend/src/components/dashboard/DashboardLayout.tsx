'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, LogOut } from 'lucide-react';
import useAuth from '@/hooks/useAuth';

/**
 * Trimmed-down replacement for mediaJira's DashboardLayout.
 *
 * The original component wired in the full app shell: a sidebar with links
 * to every module (campaigns, meetings, chat, spreadsheets, ...), a
 * notifications SSE connection + drawer, an agent side panel, an upcoming
 * meetings panel, and a quick-start checklist - none of which are part of
 * this extracted project (auth + dashboard + ticket form builder only).
 * See README "Known simplifications".
 *
 * `alerts` / `upcomingMeetings` / `hideRightPanel` are accepted (and
 * ignored) so the admin/ticket-forms and admin/experience-groups pages -
 * copied verbatim from mediaJira - don't need to be edited just to drop
 * those props.
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
  alerts?: unknown[];
  upcomingMeetings?: unknown[];
  hideRightPanel?: boolean;
  mainClassName?: string;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/ticket-forms', label: 'Ticket Form Builder', icon: Ticket },
];

export default function DashboardLayout({
  children,
  mainClassName = '',
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-full bg-[#F7F8FA] overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-12 items-center px-4 border-b border-gray-200">
          <span className="truncate font-semibold text-gray-900">Ticket Form Builder</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || !!pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-3">
          {user && (
            <div className="mb-2 truncate px-1 text-xs text-gray-500" title={user.email}>
              {user.email}
            </div>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-h-0 flex-1 flex flex-col min-w-0">
        <main
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 sm:p-5 ${mainClassName}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
