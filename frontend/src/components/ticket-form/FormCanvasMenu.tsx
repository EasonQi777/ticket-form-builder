'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, Loader2, Save, Trash2 } from 'lucide-react';

interface Props {
  assignmentsHref: string;
  saving?: boolean;
  onSaveForm: () => void;
  onDeleteForm: () => void;
}

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3CCED7]/60 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

export default function FormCanvasMenu({
  assignmentsHref,
  saving = false,
  onSaveForm,
  onDeleteForm,
}: Props) {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirmingDelete) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setConfirmingDelete(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmingDelete(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [confirmingDelete]);

  return (
    <div className="relative" ref={containerRef} data-testid="form-canvas-menu">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={iconButtonClass}
          disabled={saving}
          aria-label={saving ? 'Saving form' : 'Save form'}
          title={saving ? 'Saving...' : 'Save form'}
          onClick={onSaveForm}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
        </button>

        <button
          type="button"
          className={iconButtonClass}
          aria-label="Go to assignments"
          title="Go to assignments"
          onClick={() => router.push(assignmentsHref)}
        >
          <Link2 className="h-4 w-4" aria-hidden />
        </button>

        <button
          type="button"
          className={`${iconButtonClass} ${
            confirmingDelete
              ? 'border border-red-200 bg-red-50 text-red-600'
              : 'hover:border-red-200 hover:bg-red-50 hover:text-red-600'
          }`}
          aria-label="Delete form"
          title="Delete form"
          aria-expanded={confirmingDelete}
          onClick={() => setConfirmingDelete((prev) => !prev)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {confirmingDelete && (
        <div
          role="alertdialog"
          aria-label="Confirm form deletion"
          className="absolute right-0 top-full z-20 mt-2 w-52 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
        >
          <p className="text-xs leading-5 text-gray-600">
            Delete this form? This cannot be undone.
          </p>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
              onClick={() => setConfirmingDelete(false)}
            >
              No
            </button>
            <button
              type="button"
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700"
              onClick={() => {
                setConfirmingDelete(false);
                onDeleteForm();
              }}
            >
              Yes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
