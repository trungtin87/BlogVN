import { HelpCircle, Moon, Sun } from 'lucide-react';
import type { BlogTheme, ThemeMode, WorkspaceTab } from '../types/blog';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onCreateNewPost: () => void;
  onToggleThemeMode: (mode: ThemeMode) => void;
  onOpenGuide: () => void;
  theme: BlogTheme;
  siteTitle: string;
  headerTitle?: string;
  siteIcon?: string;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'blog', label: 'Trang web' },
  { id: 'editor', label: 'Biên soạn' },
  { id: 'github', label: 'GitHub & App' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onCreateNewPost,
  onToggleThemeMode,
  onOpenGuide,
  theme,
  siteTitle,
  headerTitle,
  siteIcon,
}: TopBarProps) {
  const { palette, fonts, isDark } = theme;
  const brandLabel = (headerTitle || siteTitle || 'Đạo Ký').trim();
  const resolvedIcon = siteIcon || './assets/aistudio/1794978557793_3b5d5cb0.png';

  return (
    <header
      style={{
        backgroundColor: palette.canvas,
        borderColor: palette.border,
        color: palette.textPrimary,
      }}
      className="md:sticky md:top-0 z-40 border-b transition-colors duration-200"
    >
      <div className="max-w-[1200px] mx-auto px-3 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('blog')}
          style={{ fontFamily: fonts.display, color: palette.textPrimary }}
          className="text-base sm:text-lg md:text-xl font-bold tracking-tight whitespace-nowrap shrink-0 min-h-[44px] flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 max-w-[155px] sm:max-w-xs"
        >
          <img
            src={resolvedIcon}
            alt="Đạo Ký"
            className="w-7 h-7 rounded-full object-cover shrink-0 border"
            style={{ borderColor: palette.border }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="truncate">{brandLabel}</span>
        </button>

        {/* Zone 2: 3 Single-line Navigation Links (desktop) */}
        <nav
          className="hidden md:flex flex-1 justify-center items-center gap-8 text-sm font-medium"
          aria-label="Điều hướng chính"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                style={{
                  color: isActive ? palette.textPrimary : palette.textMuted,
                  borderColor: isActive ? palette.accent : 'transparent',
                }}
                className="py-1 border-b-2 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Guide + Global Dark Mode Toggle + Primary CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenGuide}
            aria-label="Mở hướng dẫn sử dụng Đạo Ký"
            title="Hướng dẫn sử dụng Đạo Ký"
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center justify-center gap-1.5 min-w-[38px] sm:px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0 transition-colors"
          >
            <HelpCircle className="w-4 h-4" style={{ color: palette.link }} />
            <span className="hidden sm:inline">Hướng dẫn</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleThemeMode(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={isDark ? 'Chuyển sang chế độ sáng (Mặt trời)' : 'Chuyển sang chế độ tối (Mặt trăng)'}
            style={{
              borderColor: palette.border,
              backgroundColor: palette.surface,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center justify-center gap-1.5 min-w-[38px] sm:px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isDark ? 'Sáng' : 'Tối'}</span>
          </button>

          <button
            type="button"
            onClick={onCreateNewPost}
            style={{
              backgroundColor: palette.accent,
              color: palette.accentText,
            }}
            className="inline-flex items-center justify-center px-3 sm:px-4 min-h-[38px] text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Viết mới
          </button>
        </div>
      </div>
    </header>
  );
}
