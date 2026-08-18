'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LayoutDashboard, LogOut, Settings, Ticket, User } from 'lucide-react';
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

const HEADER_ICON_BUTTON_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

export default function DashboardLayout({
  children,
  mainClassName = '',
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPeeking, setSidebarPeeking] = useState(false);
  const peekingRef = useRef(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userMenuOpen]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#ECF3EF]">
      <header className="flex h-16 shrink-0 items-center justify-between bg-[#ECF3EF] px-6">
        <span className="truncate text-2xl font-bold text-gray-900">Ticket Form Builder</span>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/csm/settings"
            className={HEADER_ICON_BUTTON_CLASS}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className={HEADER_ICON_BUTTON_CLASS}
              title="Account"
              aria-label="Account"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
              >
                {user && (
                  <div className="truncate px-2 py-1.5 text-xs text-gray-500" title={user.email}>
                    {user.email}
                  </div>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden ml-2.5 rounded-tl-[28px] bg-[#F4F8F5] shadow-[-4px_-4px_24px_rgba(0,0,0,0.03)]">
        <nav
          className={`flex shrink-0 flex-col space-y-1 bg-[#F4F8F5] overflow-hidden transition-all duration-300 ease-in-out ${
            sidebarOpen
              ? 'w-56 p-3 pt-4'
              : sidebarPeeking
                ? 'w-[25px] p-0'
                : 'w-[20px] p-0'
          }`}
          aria-hidden={!sidebarOpen}
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || !!pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                tabIndex={sidebarOpen ? 0 : -1}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                  sidebarOpen ? '' : 'invisible pointer-events-none'
                } ${
                  active
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col rounded-tl-[28px] bg-white shadow-[-4px_-4px_24px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            onClick={() => { setSidebarOpen((prev) => !prev); setSidebarPeeking(false); peekingRef.current = false; }}
            onMouseEnter={() => {
              if (!sidebarOpen && !peekingRef.current) {
                peekingRef.current = true;
                setSidebarPeeking(true);
              }
            }}
            onMouseLeave={() => { setSidebarPeeking(false); peekingRef.current = false; }}
            className="absolute left-0 top-8 z-20 flex h-8 w-4 -translate-x-full items-center justify-center rounded-l-md bg-white/40 text-gray-400 shadow-md transition hover:bg-white/90 hover:text-gray-700"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <main
            className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 sm:p-5 ${mainClassName}`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
