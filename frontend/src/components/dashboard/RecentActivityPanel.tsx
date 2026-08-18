'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ActivityAPI } from '@/lib/api/activityApi';
import type { ActivityItem, ActivityStatus } from '@/types/activity';

/**
 * Recent Activity panel — wired to GET /api/dashboard/activity/.
 *
 * Visual spec: RECENT_ACTIVITY_FEATURE_DESIGN.md §2, extracted from
 * design_dashboard/src/App.tsx:368-404 (colors, type scale, row anatomy).
 * Data contract: RECENT_ACTIVITY_FEATURE_DESIGN.md §6.
 */

const STATUS_STYLES: Record<ActivityStatus, { bg: string; text: string; label: string }> = {
  success: { bg: '#f0fdfa', text: '#0d9488', label: 'Created' },
  pending: { bg: '#fffbeb', text: '#d97706', label: 'Pending' },
  info: { bg: '#eff6ff', text: '#3b82f6', label: 'Updated' },
};

// DM Sans / Inter, scoped to just this panel (not the app's global font) —
// see RECENT_ACTIVITY_FEATURE_DESIGN.md §3 "Font note".
const HEADING_FONT = "'DM Sans', sans-serif";
const BODY_FONT = "'Inter', sans-serif";

const ROW_LIMIT = 4;

function relativeTime(isoTimestamp: string): string {
  try {
    return formatDistanceToNow(new Date(isoTimestamp), { addSuffix: true });
  } catch {
    return '';
  }
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
    <div>
      {/* Self-contained font import, scoped to this component only. */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@600;700&family=Inter:wght@400;500;600&display=swap');`}</style>

      <h2 className="mb-3.5 text-[15px] font-semibold text-[#0f2623]" style={{ fontFamily: HEADING_FONT }}>
        Recent Activity
      </h2>

      <div className="overflow-hidden rounded-xl border border-[#e8f0ee] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {loading ? (
          <div className="space-y-3 px-4 py-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 w-3/4 rounded bg-[#f0f4f3]" />
                <div className="h-2.5 w-1/2 rounded bg-[#f0f4f3]" />
              </div>
            ))}
          </div>
        ) : !items || items.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-[12.5px] text-[#94a3b8]"
            style={{ fontFamily: BODY_FONT }}
          >
            {items === null
              ? "Couldn't load recent activity."
              : 'No recent activity yet — actions you take will show up here.'}
          </div>
        ) : (
          <>
            {items.map((item, i) => {
              const s = STATUS_STYLES[item.status];
              return (
                <div
                  key={item.id}
                  className={`px-4 py-[13px] transition-colors hover:bg-[#f8fdfb] ${
                    i < items.length - 1 ? 'border-b border-[#f0f4f3]' : ''
                  }`}
                  style={{ fontFamily: BODY_FONT }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-[#1a2e2a]">{item.summary}</span>
                    <span
                      className="shrink-0 whitespace-nowrap rounded-full px-[7px] py-[2px] text-[10.5px] font-semibold"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.actor_name && (
                      <>
                        <span className="text-[11.5px] text-[#94a3b8]">by {item.actor_name}</span>
                        <span className="text-[11.5px] text-[#cbd5e1]">·</span>
                      </>
                    )}
                    <span className="text-[11.5px] text-[#94a3b8]">{relativeTime(item.created_at)}</span>
                  </div>
                </div>
              );
            })}
            <div className="border-t border-[#f0f4f3] px-4 py-[11px]">
              <button
                type="button"
                className="text-[12.5px] font-semibold text-[#0d9488] hover:underline"
                style={{ fontFamily: BODY_FONT }}
              >
                View all activity →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
