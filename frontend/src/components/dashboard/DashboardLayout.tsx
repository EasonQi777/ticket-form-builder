'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, Settings, User } from 'lucide-react';
import useAuth from '@/hooks/useAuth';

function IconDashboard({ active }: { active: boolean }) {
  const fill = active ? 'url(#sidebar-dashboard-g1)' : '#637489';
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="1" y="1" width="7" height="7" rx="1.5" fill={fill} />
      <rect x="10" y="1" width="7" height="7" rx="1.5" fill={fill} />
      <rect x="1" y="10" width="7" height="7" rx="1.5" fill={fill} />
      <rect x="10" y="10" width="7" height="7" rx="1.5" fill={fill} />
      <defs>
        <linearGradient id="sidebar-dashboard-g1" x1="1" y1="1" x2="17" y2="17" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00c9a7" />
          <stop offset="1" stopColor="#7ecb5f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconTicketForm({ active }: { active: boolean }) {
  const stroke = active ? '#00c9a7' : '#637489';
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0">
      <rect x="2" y="1" width="14" height="16" rx="2" stroke={stroke} strokeWidth="1.5" fill="none" />
      <line x1="5" y1="5.5" x2="13" y2="5.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="8.5" x2="13" y2="8.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="11.5" x2="9" y2="11.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/ticket-forms', label: 'Ticket Form Builder' },
];

const HEADER_ICON_BUTTON_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

export default function DashboardLayout({
  children,
  mainClassName = '',
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const flushMain =
    !!pathname?.startsWith('/admin/csm/settings') ||
    /^\/admin\/ticket-forms\/[^/]+\/assignments\/?$/.test(pathname ?? '');
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
        <span className="truncate text-[15px] font-bold tracking-tight text-[#1e2d40]">Ticket Form Builder</span>
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
          {NAV_ITEMS.map(({ href, label }) => {
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
                {href === '/dashboard' ? (
                  <IconDashboard active={active} />
                ) : (
                  <IconTicketForm active={active} />
                )}
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
            className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${
              flushMain ? '' : 'p-3 space-y-4 sm:p-5'
            } ${mainClassName}`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
