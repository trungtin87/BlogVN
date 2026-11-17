import { useEffect } from 'react';
import { BookOpenCheck, X } from 'lucide-react';
import type { BlogTheme, WorkspaceTab } from '../types/blog';
import { UserGuideContent } from './UserGuideContent';

interface UserGuideModalProps {
  open: boolean;
  theme: BlogTheme;
  onClose: () => void;
  onNavigateTab?: (tab: WorkspaceTab) => void;
}

export function UserGuideModal({
  open,
  theme,
  onClose,
  onNavigateTab,
}: UserGuideModalProps) {
  const { palette, fonts } = theme;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="blogvn-guide-title"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: palette.canvas,
          borderColor: palette.border,
          color: palette.textPrimary,
          fontFamily: fonts.body,
        }}
        className="w-full max-w-3xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
      >
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="px-5 py-4 border-b flex items-center justify-between gap-4 shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpenCheck className="w-5 h-5 shrink-0" style={{ color: palette.link }} />
            <div className="min-w-0">
              <h2
                id="blogvn-guide-title"
                style={{ fontFamily: fonts.display }}
                className="text-base sm:text-lg font-bold truncate"
              >
                Hướng dẫn sử dụng BlogVN từ A–Z
              </h2>
              <p style={{ color: palette.textMuted }} className="text-xs truncate">
                Quy trình kết nối GitHub Pages, triển khai Astro 5, tuỳ chỉnh thương hiệu và viết bài SEO
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn"
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
              color: palette.textPrimary,
            }}
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer hover:opacity-80 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <UserGuideContent
            theme={theme}
            onJumpToTab={
              onNavigateTab
                ? (tab) => {
                    onNavigateTab(tab);
                    onClose();
                  }
                : undefined
            }
          />
        </div>

        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="px-5 py-3 border-t flex items-center justify-end gap-3 shrink-0"
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="px-4 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer hover:opacity-90"
          >
            Đã hiểu, đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}
