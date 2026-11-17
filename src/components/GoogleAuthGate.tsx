import { useState } from 'react';
import { BookOpenCheck, Loader2, Lock, Moon, ShieldCheck, Sun } from 'lucide-react';
import type { BlogTheme, ThemeMode } from '../types/blog';
import { signInWithGoogle } from '../firebase';
import { UserGuideContent } from './UserGuideContent';

interface GoogleAuthGateProps {
  theme: BlogTheme;
  onToggleTheme: (mode: ThemeMode) => void;
}

function mapFirebaseAuthError(err: any): string {
  const code = String(err?.code || '');
  if (code === 'auth/popup-closed-by-user') {
    return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép popup rồi thử lại.';
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return `Tên miền "${host}" chưa được thêm vào Authorized domains trong Firebase Console (Authentication → Settings → Authorized domains).`;
  }
  if (code === 'auth/network-request-failed') {
    return 'Lỗi kết nối mạng khi liên hệ Google Sign-In.';
  }
  return err?.message || 'Không thể đăng nhập bằng Google. Vui lòng thử lại.';
}

export function GoogleAuthGate({ theme, onToggleTheme }: GoogleAuthGateProps) {
  const { palette, fonts, isDark } = theme;
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: palette.canvas,
        color: palette.textPrimary,
        fontFamily: fonts.body,
      }}
      className="min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200"
    >
      {/* Top minimal bar */}
      <div className="max-w-[1180px] w-full mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <img
            src="./icon.svg"
            alt="BlogVN"
            className="w-7 h-7 rounded-md object-cover shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <span
            style={{ fontFamily: fonts.display }}
            className="text-lg font-bold tracking-tight"
          >
            BlogVN
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleTheme(isDark ? 'light' : 'dark')}
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
            color: palette.textPrimary,
          }}
          className="inline-flex items-center gap-1.5 px-3 min-h-[40px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{isDark ? 'Dương' : 'Âm'}</span>
        </button>
      </div>

      {/* Main Split Onboarding: Google Auth + Detailed User Guide */}
      <main className="max-w-[1180px] w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Google Sign-In Card */}
        <div className="lg:col-span-5 lg:sticky lg:top-8">
          <div
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surfaceElevated,
            }}
            className="rounded-2xl border p-6 sm:p-7 shadow-sm space-y-5"
          >
            <div className="space-y-2.5">
              <div
                style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                className="text-xs uppercase tracking-wider flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" style={{ color: palette.link }} />
                Không gian ứng dụng cá nhân hoá
              </div>

              <h1
                style={{ fontFamily: fonts.display, color: palette.textPrimary }}
                className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug text-balance"
              >
                Đăng nhập bằng Google để vào BlogVN
              </h1>

              <p style={{ color: palette.textSecondary }} className="text-sm leading-relaxed">
                Website này hoạt động như một ứng dụng thuần tuý. Mọi cấu hình blog, bản nháp và kết nối GitHub được lưu riêng trên thiết bị của bạn và tách biệt hoàn toàn theo từng tài khoản Google.
              </p>
            </div>

            <div
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
              className="p-4 rounded-xl border space-y-2 text-xs leading-relaxed"
            >
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Dữ liệu nằm trên máy &amp; GitHub của riêng bạn
              </div>
              <p style={{ color: palette.textMuted }}>
                Nhiều người có thể dùng chung URL ứng dụng này hoặc cùng một thiết bị mà không lẫn bài viết hay kho GitHub của nhau.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
              className="w-full min-h-[48px] px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-3 cursor-pointer hover:opacity-90 disabled:opacity-55 transition-opacity"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xác thực tài khoản Google...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                    />
                  </svg>
                  Đăng nhập bằng Google
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Detailed Vietnamese User Guide */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2.5">
            <BookOpenCheck className="w-5 h-5 shrink-0" style={{ color: palette.link }} />
            <div>
              <h2 style={{ fontFamily: fonts.display }} className="text-xl font-bold">
                Hướng dẫn sử dụng BlogVN chi tiết
              </h2>
              <p style={{ color: palette.textMuted }} className="text-xs">
                Xem nhanh quy trình thiết lập blog GitHub Pages, triển khai Astro 5 và viết bài chuẩn SEO ngay sau khi đăng nhập.
              </p>
            </div>
          </div>

          <UserGuideContent theme={theme} compact />
        </div>
      </main>

      <footer
        style={{ color: palette.textMuted, fontFamily: fonts.mono }}
        className="max-w-[1180px] w-full mx-auto text-center text-[11px] py-2"
      >
        BlogVN · Client-side GitHub Pages CMS
      </footer>
    </div>
  );
}
