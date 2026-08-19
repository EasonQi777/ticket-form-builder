'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ActivityAPI } from '@/lib/api/activityApi';
import type { ActivityItem, ActivityStatus } from '@/types/activity';

/**
 * Recent Activity panel — wired to GET /api/dashboard/activity/.
 *
 * Visual spec: DASHBOARD_UI_ELEMENTS.md §2.7.
 * Data contract: RECENT_ACTIVITY_FEATURE_DESIGN.md §6.
 */

const STATUS_STYLES: Record<ActivityStatus, { bg: string; text: string; label: string }> = {
  success: {
    bg: 'linear-gradient(135deg, #e8faf6 0%, #f0faf0 100%)',
    text: '#00a887',
    label: 'Created',
  },
  pending: { bg: '#fffbeb', text: '#d97706', label: 'Pending' },
  info: { bg: '#eff6ff', text: '#3b82f6', label: 'Updated' },
};

const HEADING_FONT = "'Outfit', sans-serif";
const ROW_LIMIT = 3;
const CARD_SHADOW = '0 1px 4px rgba(30, 45, 64, 0.05)';

function relativeTime(isoTimestamp: string): string {
  try {
    return formatDistanceToNow(new Date(isoTimestamp), { addSuffix: true });
  } catch {
    return '';
  }
}

function metaLine(item: ActivityItem): string {
  const time = relativeTime(item.created_at);
  return item.actor_name ? `by ${item.actor_name} · ${time}` : time;
}

export default function RecentActivityPanel() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ActivityAPI.recent(ROW_LIMIT)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((error) => {
        console.error('Failed to load recent activity:', error);
        if (!cancelled) setItems(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl border border-[#e2eaf0] bg-white"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="brand-gradient-bg h-1.5 shrink-0" />
      <div className="flex flex-1 flex-col p-6">
        <h2
          className="mb-4 text-[15px] font-semibold text-[#1e2d40]"
          style={{ fontFamily: HEADING_FONT }}
        >
          Recent Activity
        </h2>

        {loading ? (
          <div className="space-y-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="-mx-3 animate-pulse rounded-lg px-3 py-3">
                <div className="h-3 w-3/4 rounded bg-[#e8faf6]" />
                <div className="mt-2 h-2.5 w-1/2 rounded bg-[#f0faf0]" />
              </div>
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <p className="text-sm text-[#637489]">
            {items === null
              ? "Couldn't load recent activity."
              : 'No recent activity yet — actions you take will show up here.'}
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const s = STATUS_STYLES[item.status];
              return (
                <div
                  key={item.id}
                  className="flex cursor-default items-start justify-between rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-[#f0faf8]"
                >
                  <div className="flex items-start gap-3">
                    <div className="brand-gradient-bg mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <div>
                      <p className="mb-0.5 text-sm font-medium leading-snug text-[#1e2d40]">
                        {item.summary}
                      </p>
                      <p className="text-xs text-[#637489]">{metaLine(item)}</p>
                    </div>
                  </div>
                  <span
                    className="ml-3 mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: s.bg, color: s.text }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="group mt-4 flex items-center gap-1.5 text-sm font-medium text-[#00c9a7]"
        >
          <span>View all activity</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </button>
      </div>
    </div>
  );
}
