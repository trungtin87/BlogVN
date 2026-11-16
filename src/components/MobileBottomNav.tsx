import { BookOpen, GitBranch, PenSquare } from 'lucide-react';
import type { BlogTheme, WorkspaceTab } from '../types/blog';

interface MobileBottomNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  theme: BlogTheme;
}

const MOBILE_TABS: Array<{ id: WorkspaceTab; label: string; icon: typeof BookOpen }> = [
  { id: 'blog', label: 'Trang web', icon: BookOpen },
  { id: 'editor', label: 'Biên soạn', icon: PenSquare },
  { id: 'github', label: 'GitHub & App', icon: GitBranch },
];

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  theme,
}: MobileBottomNavProps) {
  const { palette, isDark } = theme;

  return (
    <nav
      aria-label="Điều hướng di động"
      style={{
        backgroundColor: isDark ? 'rgba(17, 17, 17, 0.94)' : 'rgba(255, 255, 255, 0.94)',
        borderColor: palette.border,
      }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-3 h-16 items-center">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              style={{
                color: active ? palette.textPrimary : palette.textMuted,
              }}
              className="min-h-[48px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors active:scale-95"
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 1.75} />
              <span
                className={`text-[11px] leading-none whitespace-nowrap ${
                  active ? 'font-semibold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
