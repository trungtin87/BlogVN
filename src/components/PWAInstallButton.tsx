import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import type { BlogTheme } from '../types/blog';

interface PWAInstallButtonProps {
  theme: BlogTheme;
  compact?: boolean;
}

export function PWAInstallButton({ theme, compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { palette } = theme;

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        style={{
          backgroundColor: palette.accent,
          color: palette.accentText,
        }}
        className={`inline-flex items-center justify-center gap-2 ${
          compact ? 'px-3 min-h-[40px] text-xs' : 'px-4 min-h-[44px] text-sm'
        } font-semibold rounded-xl cursor-pointer whitespace-nowrap shrink-0 transition-opacity hover:opacity-90`}
      >
        <Download className="w-4 h-4" />
        Cài đặt thành App trên máy
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            color: palette.textPrimary,
          }}
          className={`inline-flex items-center justify-center gap-2 ${
            compact ? 'px-3 min-h-[40px] text-xs' : 'px-4 min-h-[44px] text-sm'
          } font-medium rounded-xl border cursor-pointer whitespace-nowrap shrink-0`}
        >
          <Smartphone className="w-4 h-4" />
          Cài lên iPhone / iPad
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs sm:p-4">
            <div
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
              className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Cài đặt lên màn hình chính iOS</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Đóng"
                  className="p-2 rounded-lg hover:bg-black/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ol
                style={{ color: palette.textSecondary }}
                className="text-sm space-y-2 list-decimal pl-5 leading-relaxed"
              >
                <li>Mở trang này bằng trình duyệt <strong>Safari</strong>.</li>
                <li>Nhấn biểu tượng <strong>Chia sẻ (Share)</strong> ở thanh dưới cùng.</li>
                <li>Chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                style={{
                  backgroundColor: palette.accent,
                  color: palette.accentText,
                }}
                className="w-full min-h-[44px] rounded-xl text-sm font-semibold cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator({ theme }: { theme: BlogTheme }) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      style={{
        backgroundColor: theme.palette.surfaceElevated,
        borderColor: theme.palette.border,
        color: theme.palette.textPrimary,
      }}
      className="fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
      <span>Đang ngoại tuyến — Bản nháp cục bộ vẫn được lưu</span>
    </div>
  );
}
