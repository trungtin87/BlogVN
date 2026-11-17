import { useEffect, useRef } from 'react';
import {
  Bold,
  CheckSquare,
  ChevronDown,
  Code,
  Code2,
  Heading,
  ImagePlus,
  Images,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Undo2,
} from 'lucide-react';
import type { BlogTheme } from '../types/blog';
import type { ActiveFormatsState } from '../utils/obsidianFormat';

interface ObsidianMobileToolbarProps {
  theme: BlogTheme;
  visible: boolean;
  editorFocused: boolean;
  canUndo: boolean;
  canRedo: boolean;
  activeFormats: ActiveFormatsState;
  isUploadingImage: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCycleHeading: () => void;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleStrike: () => void;
  onToggleCode: () => void;
  onToggleBullet: () => void;
  onToggleOrdered: () => void;
  onToggleCheckbox: () => void;
  onToggleQuote: () => void;
  onOutdent: () => void;
  onIndent: () => void;
  onInsertLink: () => void;
  onInsertCodeBlock: () => void;
  onInsertTable: () => void;
  onInsertHr: () => void;
  onPickImage: () => void;
  onPickBatchImages: () => void;
  onDismissKeyboard: () => void;
}

export function ObsidianMobileToolbar({
  theme,
  visible,
  editorFocused,
  canUndo,
  canRedo,
  activeFormats,
  isUploadingImage,
  onUndo,
  onRedo,
  onCycleHeading,
  onToggleBold,
  onToggleItalic,
  onToggleStrike,
  onToggleCode,
  onToggleBullet,
  onToggleOrdered,
  onToggleCheckbox,
  onToggleQuote,
  onOutdent,
  onIndent,
  onInsertLink,
  onInsertCodeBlock,
  onInsertTable,
  onInsertHr,
  onPickImage,
  onPickBatchImages,
  onDismissKeyboard,
}: ObsidianMobileToolbarProps) {
  const { palette, isDark } = theme;
  const barRef = useRef<HTMLDivElement | null>(null);

  // Sync directly to window.visualViewport via DOM style updates so the accessory bar
  // stays locked immediately above the soft keyboard with 0 React re-render jitter.
  useEffect(() => {
    if (!visible) return;

    const updateDockPosition = () => {
      const bar = barRef.current;
      if (!bar) return;

      const vv = window.visualViewport;
      const layoutHeight = document.documentElement.clientHeight || window.innerHeight;

      if (!vv) {
        bar.style.bottom = editorFocused ? '0px' : '64px';
        bar.style.left = '0px';
        bar.style.width = '100%';
        return;
      }

      const bottomInset = Math.max(0, Math.round(layoutHeight - (vv.offsetTop + vv.height)));
      const keyboardOverlayActive = bottomInset > 60;
      const navOffset = !keyboardOverlayActive && !editorFocused ? 64 : 0;

      bar.style.bottom = `${bottomInset + navOffset}px`;
      bar.style.left = `${Math.round(vv.offsetLeft)}px`;
      bar.style.width = `${Math.round(vv.width)}px`;
    };

    updateDockPosition();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateDockPosition);
    vv?.addEventListener('scroll', updateDockPosition);
    window.addEventListener('resize', updateDockPosition);
    window.addEventListener('scroll', updateDockPosition, { passive: true });

    return () => {
      vv?.removeEventListener('resize', updateDockPosition);
      vv?.removeEventListener('scroll', updateDockPosition);
      window.removeEventListener('resize', updateDockPosition);
      window.removeEventListener('scroll', updateDockPosition);
    };
  }, [visible, editorFocused]);

  if (!visible) return null;

  // Keep textarea focused on mobile taps WITHOUT blocking horizontal swipe gestures!
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const renderToolBtn = (params: {
    key: string;
    label: string;
    onPress: () => void;
    active?: boolean;
    disabled?: boolean;
    badge?: string;
    icon: typeof Bold;
  }) => {
    const Icon = params.icon;
    return (
      <button
        key={params.key}
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={params.onPress}
        disabled={params.disabled}
        aria-label={params.label}
        title={params.label}
        aria-pressed={Boolean(params.active)}
        style={{
          color: params.active ? palette.accent : palette.textPrimary,
          backgroundColor: params.active
            ? isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(15,23,42,0.08)'
            : 'transparent',
          borderColor: params.active ? palette.accent : 'transparent',
        }}
        className="relative min-w-[40px] h-10 px-1.5 flex items-center justify-center rounded-lg border transition-colors shrink-0 cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={params.active ? 2.4 : 1.9} />
        {params.badge && (
          <span className="ml-0.5 text-[10px] font-bold leading-none tabular-nums">
            {params.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Thanh định dạng nhanh Obsidian"
      style={{
        backgroundColor: isDark ? 'rgba(20, 20, 23, 0.97)' : 'rgba(255, 255, 255, 0.97)',
        borderColor: palette.border,
        color: palette.textPrimary,
        bottom: editorFocused ? '0px' : '64px',
        left: '0px',
        width: '100%',
      }}
      className="md:hidden fixed z-50 border-t shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md select-none"
    >
      <div className="flex items-center h-12 px-1.5 gap-1">
        {/* Scrollable Obsidian formatting tools strip */}
        <div
          style={{
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
          }}
          className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1"
        >
          {renderToolBtn({
            key: 'undo',
            label: 'Hoàn tác',
            onPress: onUndo,
            disabled: !canUndo,
            icon: Undo2,
          })}
          {renderToolBtn({
            key: 'redo',
            label: 'Làm lại',
            onPress: onRedo,
            disabled: !canRedo,
            icon: Redo2,
          })}

          <span
            style={{ backgroundColor: palette.border }}
            className="w-px h-5 mx-1 shrink-0"
            aria-hidden="true"
          />

          {renderToolBtn({
            key: 'heading',
            label: 'Đổi cấp tiêu đề',
            onPress: onCycleHeading,
            active: activeFormats.headingLevel > 0,
            badge: activeFormats.headingLevel > 0 ? String(activeFormats.headingLevel) : undefined,
            icon: Heading,
          })}
          {renderToolBtn({
            key: 'bold',
            label: 'In đậm',
            onPress: onToggleBold,
            active: activeFormats.bold,
            icon: Bold,
          })}
          {renderToolBtn({
            key: 'italic',
            label: 'In nghiêng',
            onPress: onToggleItalic,
            active: activeFormats.italic,
            icon: Italic,
          })}
          {renderToolBtn({
            key: 'strike',
            label: 'Gạch ngang',
            onPress: onToggleStrike,
            active: activeFormats.strike,
            icon: Strikethrough,
          })}
          {renderToolBtn({
            key: 'code',
            label: 'Mã nội tuyến',
            onPress: onToggleCode,
            active: activeFormats.code,
            icon: Code,
          })}

          <span
            style={{ backgroundColor: palette.border }}
            className="w-px h-5 mx-1 shrink-0"
            aria-hidden="true"
          />

          {renderToolBtn({
            key: 'bullet',
            label: 'Danh sách gạch đầu dòng',
            onPress: onToggleBullet,
            active: activeFormats.bullet,
            icon: List,
          })}
          {renderToolBtn({
            key: 'ordered',
            label: 'Danh sách đánh số',
            onPress: onToggleOrdered,
            active: activeFormats.ordered,
            icon: ListOrdered,
          })}
          {renderToolBtn({
            key: 'checkbox',
            label: 'Danh sách kiểm tra (Checkbox)',
            onPress: onToggleCheckbox,
            active: activeFormats.checkbox,
            icon: CheckSquare,
          })}
          {renderToolBtn({
            key: 'quote',
            label: 'Trích dẫn',
            onPress: onToggleQuote,
            active: activeFormats.quote,
            icon: Quote,
          })}
          {renderToolBtn({
            key: 'outdent',
            label: 'Giảm thụt lề',
            onPress: onOutdent,
            icon: IndentDecrease,
          })}
          {renderToolBtn({
            key: 'indent',
            label: 'Thụt lề phải',
            onPress: onIndent,
            icon: IndentIncrease,
          })}

          <span
            style={{ backgroundColor: palette.border }}
            className="w-px h-5 mx-1 shrink-0"
            aria-hidden="true"
          />

          {renderToolBtn({
            key: 'link',
            label: 'Chèn liên kết',
            onPress: onInsertLink,
            icon: Link2,
          })}
          {renderToolBtn({
            key: 'image',
            label: 'Chèn ảnh từ máy',
            onPress: onPickImage,
            disabled: isUploadingImage,
            icon: isUploadingImage ? Loader2 : ImagePlus,
          })}
          {renderToolBtn({
            key: 'batch',
            label: 'Chèn loạt ảnh',
            onPress: onPickBatchImages,
            icon: Images,
          })}
          {renderToolBtn({
            key: 'codeblock',
            label: 'Khối mã nguồn',
            onPress: onInsertCodeBlock,
            icon: Code2,
          })}
          {renderToolBtn({
            key: 'table',
            label: 'Chèn bảng',
            onPress: onInsertTable,
            icon: Table,
          })}
          {renderToolBtn({
            key: 'hr',
            label: 'Đường phân cách',
            onPress: onInsertHr,
            icon: Minus,
          })}
        </div>

        {/* Right sticky action: Dismiss mobile keyboard cleanly */}
        {editorFocused && (
          <div
            style={{ borderColor: palette.border }}
            className="pl-1.5 border-l flex items-center shrink-0"
          >
            <button
              type="button"
              onMouseDown={preventFocusLoss}
              onClick={onDismissKeyboard}
              aria-label="Ẩn bàn phím"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg border text-xs font-semibold cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <ChevronDown className="w-4 h-4" />
              <span>Xong</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
