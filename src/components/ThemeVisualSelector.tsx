import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  UploadCloud,
} from 'lucide-react';
import type {
  AstroTemplateId,
  BlogTheme,
  ThemeCustomColors,
  ThemeMode,
  ThemeModeColorOverrides,
} from '../types/blog';
import { EDITORIAL_ASSETS } from '../data/assets';
import {
  applyColorOverridesToPalette,
  CURATED_COLOR_PRESETS,
  EDITORIAL_THEME_ORDER,
  EDITORIAL_THEMES,
  normalizeAstroTemplateId,
  normalizeHexColor,
  sanitizeThemeCustomColors,
} from '../data/themes';

interface ThemeVisualSelectorProps {
  theme: BlogTheme;
  selectedTemplate: AstroTemplateId | string | undefined;
  onSelectTemplate: (templateId: AstroTemplateId) => void;
  previewMode?: ThemeMode;
  onToggleThemeMode?: (mode: ThemeMode) => void;
  themeColors?: ThemeCustomColors;
  onChangeColors?: (nextColors: ThemeCustomColors | undefined) => void;
  previewSiteTitle?: string;
  previewHeaderTitle?: string;
  previewTagline?: string;
  previewAuthorName?: string;
  previewSiteIcon?: string;
  compact?: boolean;
  hasPendingChanges?: boolean;
  isApplying?: boolean;
  applyStatusText?: string | null;
  applyErrorText?: string | null;
  onApply?: () => void;
  onDiscard?: () => void;
}

const THEME_PREVIEW_ART: Record<
  AstroTemplateId,
  {
    heroImage: string;
    secondaryImage: string;
    sampleKicker: string;
    sampleHeadline: string;
    sampleLead: string;
    brief1: string;
    brief2: string;
  }
> = {
  'newyorker-light': {
    heroImage: EDITORIAL_ASSETS.themeNewYorkerLiterary,
    secondaryImage: EDITORIAL_ASSETS.coverDesignCraft,
    sampleKicker: 'Tiểu luận · Văn hoá',
    sampleHeadline: 'Nghệ thuật giữ tâm trí tĩnh tại giữa dòng tin tức hối hả',
    sampleLead:
      'Một bài tiểu luận về thói quen viết chậm, đọc sâu và giữ một thư phòng chữ nghĩa độc lập khỏi thuật toán.',
    brief1: 'Bàn về nhịp câu chữ trong tạp chí văn chương hiện đại',
    brief2: 'Ghi chép bên tách cà phê sáng và cuốn sổ tay bìa vải',
  },
  'nytimes-light': {
    heroImage: EDITORIAL_ASSETS.heroWorkspaceEditorial,
    secondaryImage: EDITORIAL_ASSETS.coverTechArchitecture,
    sampleKicker: 'Tiêu điểm · Phân tích',
    sampleHeadline: 'Vì sao các toà soạn lớn quay lại bố cục báo in rõ ràng?',
    sampleLead:
      'Cấu trúc cột tin mạch lạc, đường kẻ chỉ sắc nét và hệ phân cấp tiêu đề giúp độc giả nắm bắt vấn đề trong vài giây.',
    brief1: 'Toàn cảnh kiến trúc web tĩnh tốc độ cao trên GitHub Pages',
    brief2: 'Chuẩn SEO tự nhiên cho ấn phẩm báo chí cá nhân',
  },
  'bbc-dark': {
    heroImage: EDITORIAL_ASSETS.themeBbcNewsroom,
    secondaryImage: EDITORIAL_ASSETS.coverEveningNotes,
    sampleKicker: 'Thời sự · Media',
    sampleHeadline: 'Tổ chức trang tin đa phương tiện & video YouTube sắc bén',
    sampleLead:
      'Phong cách phòng tin tương phản cao làm nổi bật ảnh bìa khổ rộng, trích xuất trực tiếp từ video hoặc ảnh chụp thực tế.',
    brief1: 'Góc nhìn quốc tế: Tối ưu trải nghiệm đọc trên màn hình nhỏ',
    brief2: 'Quy trình biên tập và xuất bản Markdown từ điện thoại',
  },
  'obsidian-broadsheet': {
    heroImage: EDITORIAL_ASSETS.coverTechArchitecture,
    secondaryImage: EDITORIAL_ASSETS.themeBbcNewsroom,
    sampleKicker: 'Nhật báo Đêm · Công nghệ',
    sampleHeadline: 'Thiết kế hệ thống blog Markdown bền vững suốt hàng chục năm',
    sampleLead:
      'Mực đêm xanh thẫm dịu mắt kết hợp tiêu đề Serif uy nghiêm, mang lại sự tập trung tối đa cho người đọc.',
    brief1: 'Lưu trữ trọn đời bằng tệp văn bản thuần trên Git repository',
    brief2: 'Tối ưu dữ liệu có cấu trúc BlogPosting JSON-LD cho Google',
  },
  'espresso-salon': {
    heroImage: EDITORIAL_ASSETS.coverEveningNotes,
    secondaryImage: EDITORIAL_ASSETS.themeNewYorkerLiterary,
    sampleKicker: 'Thư phòng · Suy tư',
    sampleHeadline: 'Những trang viết cuối ngày bên ánh đèn vàng ấm áp',
    sampleLead:
      'Sắc nền thư phòng êm dịu với chữ Serif cổ điển, giảm mỏi mắt cho những bài viết phân tích và hồi ký dài hơi.',
    brief1: 'Sổ tay đọc sách: Rút gọn đoạn mở đầu để giữ mạch cảm xúc',
    brief2: 'Xây dựng nhịp thở đều đặn qua từng đề mục bài viết',
  },
  'monocle-magazine': {
    heroImage: EDITORIAL_ASSETS.themeMonocleMagazine,
    secondaryImage: EDITORIAL_ASSETS.themeNewYorkerLiterary,
    sampleKicker: 'Ấn phẩm số · Văn hoá & Đời sống',
    sampleHeadline: 'Xây dựng tạp chí cá nhân nhiều chuyên trang mạch lạc như báo in',
    sampleLead:
      'Phân tách rõ Trang nhất, Chuyên mục, Kho lưu trữ theo năm, Trang tác giả và Liên hệ độc giả trong một hệ thống đồng nhất.',
    brief1: 'Nghệ thuật xuất bản độc lập qua từng chuyên đề hàng tháng',
    brief2: 'Quy chuẩn biên tập ảnh bìa, mục lục và hồ sơ tác giả',
  },
  'guardian-portal': {
    heroImage: EDITORIAL_ASSETS.themeGuardianPortal,
    secondaryImage: EDITORIAL_ASSETS.heroWorkspaceEditorial,
    sampleKicker: 'Chuyên trang Thời sự · Phân tích',
    sampleHeadline: 'Mô hình cổng tin đa chuyên mục dành cho người viết chuyên sâu',
    sampleLead:
      'Mỗi chuyên mục sở hữu trang đích riêng kèm phân trang kho bài viết, chỉ mục thẻ chủ đề và điều hướng liên bài mượt mà.',
    brief1: 'Tổ chức kho tri thức thành 4 chuyên trang độc lập',
    brief2: 'Chuẩn SEO chuyên mục, Breadcrumb và Sitemap đầy đủ',
  },
  'kyoto-folio': {
    heroImage: EDITORIAL_ASSETS.themeKyotoFolio,
    secondaryImage: EDITORIAL_ASSETS.coverDesignCraft,
    sampleKicker: '01 · Hồ sơ Triển lãm & Lưu trữ',
    sampleHeadline: 'Không gian lưu trữ chữ nghĩa theo dòng thời gian và chuyên đề',
    sampleLead:
      'Lấy cảm hứng từ sách chuyên khảo bảo tàng: trang chủ thanh nhã nối liền kho lưu trữ theo năm và trang tiểu sử tác giả.',
    brief1: 'Mục lục lưu trữ theo năm & tháng dễ tra cứu dài hạn',
    brief2: 'Trang giới thiệu tuyên ngôn viết và thông tin kết nối',
  },
  'economist-digest': {
    heroImage: EDITORIAL_ASSETS.themeEconomistDigest,
    secondaryImage: EDITORIAL_ASSETS.coverTechArchitecture,
    sampleKicker: 'Phân tích Hệ thống · Dữ liệu',
    sampleHeadline: 'Chuyên san phân tích đa trang với độ tương phản sắc nét',
    sampleLead:
      'Tổng hợp bài tiêu điểm, danh mục chuyên ngành, phân trang dữ liệu bài viết và thẻ chủ đề tối ưu cho đọc ban đêm.',
    brief1: 'Báo cáo chuyên đề: Kiến trúc thông tin cho blog trăm bài',
    brief2: 'Bộ lọc chủ đề và chuyển trang nhanh không giật màn hình',
  },
  'nordic-atlas': {
    heroImage: EDITORIAL_ASSETS.themeNordicAtlas,
    secondaryImage: EDITORIAL_ASSETS.coverEveningNotes,
    sampleKicker: 'Du ký & Hồ sơ · Bắc Âu',
    sampleHeadline: 'Ghi chép hành trình theo từng tập chuyên mục và bản đồ chủ đề',
    sampleLead:
      'Bảng màu xanh băng dịu mắt cho những chuyến đi, bài ký sự dài kỳ và kho ảnh tư liệu chia theo từng chuyên trang.',
    brief1: 'Hồ sơ chuyến đi: Từ ghi chú thực địa đến ấn phẩm tĩnh',
    brief2: 'Kết nối độc giả trực tiếp qua trang Liên hệ & Live Chat',
  },
};

export function ThemeVisualSelector({
  theme,
  selectedTemplate,
  onSelectTemplate,
  previewMode,
  onToggleThemeMode,
  themeColors,
  onChangeColors,
  previewSiteTitle,
  previewHeaderTitle,
  previewTagline,
  previewAuthorName,
  previewSiteIcon,
  compact = false,
  hasPendingChanges = false,
  isApplying = false,
  applyStatusText = null,
  applyErrorText = null,
  onApply,
  onDiscard,
}: ThemeVisualSelectorProps) {
  const { palette, fonts } = theme;
  const currentMode: ThemeMode = previewMode || (theme.isDark ? 'dark' : 'light');
  const normalizedSelected = normalizeAstroTemplateId(selectedTemplate, currentMode);
  const [toneFilter, setToneFilter] = useState<'all' | 'multipage' | 'basic' | 'light' | 'dark'>('all');
  const [livePreviewView, setLivePreviewView] = useState<'home' | 'categories' | 'article'>('home');
  const [applyGlobalModeOnCards, setApplyGlobalModeOnCards] = useState(false);
  const [editingColorMode, setEditingColorMode] = useState<ThemeMode>(currentMode);

  useEffect(() => {
    setEditingColorMode(currentMode);
  }, [currentMode]);

  const visibleThemes = EDITORIAL_THEME_ORDER.map((id) => EDITORIAL_THEMES[id]).filter((preset) => {
    if (toneFilter === 'multipage') return Boolean(preset.isMultiPage);
    if (toneFilter === 'basic') return !preset.isMultiPage;
    if (toneFilter === 'light') return !preset.isDark;
    if (toneFilter === 'dark') return preset.isDark;
    return true;
  });

  const activePreset = EDITORIAL_THEMES[normalizedSelected];
  const activeBasePalette = activePreset.palettes[currentMode] || activePreset.palette;
  const activePalette = applyColorOverridesToPalette(
    activeBasePalette,
    themeColors?.[currentMode],
    currentMode === 'dark'
  );
  const activeArt = THEME_PREVIEW_ART[normalizedSelected];
  const displaySiteTitle = (previewSiteTitle || 'Đạo Ký').trim();
  const displayBrand = (previewHeaderTitle || displaySiteTitle).trim();
  const displayTagline = (
    previewTagline || 'Ghi chép cá nhân, tiểu luận chuyên sâu và góc nhìn tĩnh tại.'
  ).trim();
  const displayAuthor = (previewAuthorName || 'Tác giả').trim();
  const displayIcon = (previewSiteIcon || './assets/aistudio/1794978557793_3b5d5cb0.png').trim();

  const handleToggleMode = (nextMode: ThemeMode) => {
    setApplyGlobalModeOnCards(true);
    setEditingColorMode(nextMode);
    onToggleThemeMode?.(nextMode);
  };

  const hasAnyCustomColor = Boolean(
    sanitizeThemeCustomColors(themeColors)
  );

  const colorEditBase = activePreset.palettes[editingColorMode] || activePreset.palette;
  const colorEditOverrides = themeColors?.[editingColorMode];
  const resolvedEditPalette = applyColorOverridesToPalette(
    colorEditBase,
    colorEditOverrides,
    editingColorMode === 'dark'
  );

  const updateSingleColor = (
    mode: ThemeMode,
    key: keyof ThemeModeColorOverrides,
    hexValue?: string
  ) => {
    if (!onChangeColors) return;
    const prevModeMap = { ...(themeColors?.[mode] || {}) };
    if (hexValue) {
      const normalized = normalizeHexColor(hexValue);
      if (!normalized) return;
      prevModeMap[key] = normalized;
    } else {
      delete prevModeMap[key];
    }
    const nextRaw: ThemeCustomColors = {
      ...(themeColors || {}),
      [mode]: prevModeMap,
    };
    onChangeColors(sanitizeThemeCustomColors(nextRaw));
  };

  const resetModeColors = (mode: ThemeMode) => {
    if (!onChangeColors) return;
    const nextRaw: ThemeCustomColors = { ...(themeColors || {}) };
    delete nextRaw[mode];
    onChangeColors(sanitizeThemeCustomColors(nextRaw));
  };

  const applyDualPreset = (presetColors: {
    light: ThemeModeColorOverrides;
    dark: ThemeModeColorOverrides;
  }) => {
    if (!onChangeColors) return;
    onChangeColors(
      sanitizeThemeCustomColors({
        light: { ...presetColors.light },
        dark: { ...presetColors.dark },
      })
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Filter + Sun/Moon Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-base font-bold">
            Mẫu giao diện Blog (5 Cơ bản · 5 Nhiều trang)
          </div>
          <p style={{ color: palette.textMuted }} className="text-xs sm:text-sm mt-0.5">
            Tất cả mẫu đều hỗ trợ chuyển nhanh Sáng / Tối (☀ / ☾). Chọn mẫu bên dưới để xem thử cục bộ trước khi nhấn Áp dụng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
            className="inline-flex flex-wrap p-1 rounded-xl border gap-1"
            role="group"
            aria-label="Lọc giao diện"
          >
            {(
              [
                { id: 'all', label: 'Tất cả (10)' },
                { id: 'multipage', label: 'Nhiều trang (5)' },
                { id: 'basic', label: 'Cơ bản (5)' },
                { id: 'light', label: '5 Sáng', icon: Sun },
                { id: 'dark', label: '5 Tối', icon: Moon },
              ] as const
            ).map((tab) => {
              const active = toneFilter === tab.id;
              const Icon = 'icon' in tab ? tab.icon : null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setToneFilter(tab.id)}
                  style={{
                    backgroundColor: active ? palette.accent : 'transparent',
                    color: active ? palette.accentText : palette.textSecondary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleToggleMode(currentMode === 'dark' ? 'light' : 'dark')}
            style={{
              borderColor: palette.border,
              backgroundColor: palette.canvas,
              color: palette.textPrimary,
            }}
            className="inline-flex items-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[40px] text-xs font-semibold rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
            title={
              currentMode === 'dark'
                ? 'Đang ở chế độ Tối — nhấn để chuyển sang Sáng (Mặt trời)'
                : 'Đang ở chế độ Sáng — nhấn để chuyển sang Tối (Mặt trăng)'
            }
          >
            {currentMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
            <span>{currentMode === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}</span>
          </button>
        </div>
      </div>

      {/* Visual Theme Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
        {visibleThemes.map((preset) => {
          const isSelected = normalizedSelected === preset.id;
          const art = THEME_PREVIEW_ART[preset.id];
          const cardMode: ThemeMode =
            applyGlobalModeOnCards || isSelected
              ? currentMode
              : preset.isDark
              ? 'dark'
              : 'light';
          const baseP = preset.palettes[cardMode] || preset.palette;
          const p = isSelected
            ? applyColorOverridesToPalette(baseP, themeColors?.[cardMode], cardMode === 'dark')
            : baseP;
          const isNewYorker = preset.id === 'newyorker-light';
          const isBroadsheet =
            preset.id === 'nytimes-light' ||
            preset.id === 'obsidian-broadsheet' ||
            preset.id === 'guardian-portal' ||
            preset.id === 'kyoto-folio';

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setApplyGlobalModeOnCards(false);
                onSelectTemplate(preset.id);
              }}
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: isSelected ? palette.link : palette.border,
              }}
              className={`group text-left rounded-2xl border overflow-hidden transition-all cursor-pointer flex flex-col h-full ${
                isSelected ? 'ring-2 ring-offset-0' : 'hover:opacity-95'
              }`}
            >
              {/* Miniature Blog Visual Screenshot Preview */}
              <div
                style={{
                  backgroundColor: p.canvas,
                  color: p.textPrimary,
                  borderColor: p.border,
                  fontFamily: preset.fonts.body,
                }}
                className="p-3.5 border-b space-y-2.5 select-none w-full"
              >
                {/* Mini Masthead Bar */}
                <div
                  style={{
                    borderColor: p.border,
                    borderBottomWidth: isNewYorker ? '3px' : '1px',
                    borderBottomStyle: isNewYorker ? 'double' : 'solid',
                  }}
                  className={`pb-2 min-h-[36px] flex items-center justify-between gap-2 ${
                    isNewYorker ? 'flex-col sm:flex-row text-center sm:text-left' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <img
                      src={displayIcon}
                      alt=""
                      className="w-4 h-4 rounded-full object-cover shrink-0 border"
                      style={{ borderColor: p.border }}
                    />
                    <span
                      style={{ fontFamily: preset.fonts.display }}
                      className="text-xs font-bold tracking-tight truncate"
                    >
                      {displayBrand}
                    </span>
                  </div>
                  <div
                    style={{ color: p.textMuted, fontFamily: preset.fonts.mono }}
                    className="text-[8.5px] flex items-center gap-1.5 shrink-0"
                  >
                    {preset.isMultiPage ? (
                      <>
                        <span>Chuyên mục</span>
                        <span>Lưu trữ</span>
                        <span>Giới thiệu</span>
                      </>
                    ) : (
                      <>
                        <span>Trang nhất</span>
                        <span>Bài viết</span>
                      </>
                    )}
                    <span aria-hidden="true">{cardMode === 'dark' ? '☾' : '☀'}</span>
                  </div>
                </div>

                {/* Mini Front-page Lead + Visual */}
                <div className="grid grid-cols-12 gap-2.5 items-center">
                  <div className="col-span-7 space-y-1 min-w-0">
                    <div
                      style={{ color: p.link, fontFamily: preset.fonts.mono }}
                      className="text-[9px] font-semibold uppercase tracking-wider truncate"
                    >
                      {art.sampleKicker}
                    </div>
                    <div
                      style={{ fontFamily: preset.fonts.display, color: p.textPrimary }}
                      className="text-[11px] font-bold leading-snug line-clamp-2 min-h-[28px]"
                    >
                      {art.sampleHeadline}
                    </div>
                    <div
                      style={{ color: p.textMuted }}
                      className="text-[9px] leading-snug line-clamp-2"
                    >
                      {art.sampleLead}
                    </div>
                  </div>
                  <div
                    style={{ borderColor: p.border, backgroundColor: p.surface }}
                    className={`col-span-5 aspect-[4/3] overflow-hidden border ${
                      isBroadsheet || isNewYorker ? 'rounded-sm' : 'rounded-lg'
                    }`}
                  >
                    <img
                      src={art.heroImage}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Mini Secondary Broadsheet / Multi-Page Strip */}
                <div
                  style={{ borderColor: p.border }}
                  className="pt-2 border-t grid grid-cols-2 gap-2 text-[9px] min-h-[36px]"
                >
                  <div className="flex items-start gap-1.5 min-w-0">
                    <img
                      src={art.secondaryImage}
                      alt=""
                      className="w-6 h-6 rounded-sm object-cover shrink-0 mt-0.5"
                    />
                    <span
                      style={{ fontFamily: preset.fonts.display, color: p.textSecondary }}
                      className="font-semibold leading-tight line-clamp-2"
                    >
                      {art.brief1}
                    </span>
                  </div>
                  <div
                    style={{ borderColor: p.border }}
                    className="pl-2 border-l min-w-0"
                  >
                    <span
                      style={{ fontFamily: preset.fonts.display, color: p.textSecondary }}
                      className="font-semibold leading-tight line-clamp-2 block"
                    >
                      {art.brief2}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Metadata Footer */}
              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between w-full">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold flex items-center gap-1.5 min-w-0 truncate">
                      <span className="truncate">{preset.name}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0" style={{ color: palette.link }} />
                      )}
                    </span>
                    <span
                      style={{ color: isSelected ? palette.link : palette.textMuted, fontFamily: fonts.mono }}
                      className="text-[10.5px] font-medium whitespace-nowrap shrink-0"
                    >
                      {preset.toneLabel} · {preset.layoutTag}
                    </span>
                  </div>
                  <div style={{ color: palette.link }} className="text-[11px] font-medium">
                    {preset.inspiration}
                  </div>
                  <p style={{ color: palette.textSecondary }} className="text-xs leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                {/* Color Swatch Strip */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5" aria-label="Bảng màu giao diện">
                    {[p.canvas, p.surface, p.textPrimary, p.link].map((hex, i) => (
                      <span
                        key={`${preset.id}-${i}`}
                        style={{ backgroundColor: hex, borderColor: palette.border }}
                        className="w-4 h-4 rounded-full border"
                        title={hex}
                      />
                    ))}
                  </div>
                  <span
                    style={{ color: isSelected ? palette.link : palette.textMuted }}
                    className="text-[11px] font-semibold"
                  >
                    {isSelected ? 'Đang chọn' : 'Chọn mẫu này'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dual-Mode Theme Color Customizer (Light & Dark) */}
      {onChangeColors && (
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surfaceElevated,
          }}
          className="rounded-2xl border p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Palette className="w-4 h-4 shrink-0" style={{ color: palette.link }} />
                <span>Tuỳ chỉnh màu sắc mặc định (Sáng &amp; Tối)</span>
              </div>
              <p style={{ color: palette.textMuted }} className="text-xs">
                Chọn giao diện <strong>{activePreset.name}</strong> &amp; phối màu để <strong>xem thử cục bộ</strong> bên dưới — chỉ khi nhấn <strong>Áp dụng</strong> mới lưu lên máy &amp; đồng bộ GitHub.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div
                style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
                className="inline-flex p-0.5 rounded-xl border"
                role="group"
                aria-label="Chọn chế độ màu đang chỉnh"
              >
                {(
                  [
                    { id: 'light', label: 'Màu Sáng', icon: Sun },
                    { id: 'dark', label: 'Màu Tối', icon: Moon },
                  ] as const
                ).map((tab) => {
                  const active = editingColorMode === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setEditingColorMode(tab.id);
                        handleToggleMode(tab.id);
                      }}
                      style={{
                        backgroundColor: active ? palette.accent : 'transparent',
                        color: active ? palette.accentText : palette.textSecondary,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 min-h-[34px] text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {hasAnyCustomColor && (
                <button
                  type="button"
                  onClick={() => onChangeColors(undefined)}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.canvas,
                    color: palette.textSecondary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[36px] text-xs font-medium rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap"
                  title="Xoá toàn bộ tuỳ chỉnh và dùng màu gốc của mẫu giao diện"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Khôi phục màu gốc
                </button>
              )}
            </div>
          </div>

          {/* Quick Dual-Mode Curated Palettes */}
          <div className="space-y-2.5">
            <div style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
              Bảng màu gợi ý (Sáng &amp; Tối)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {CURATED_COLOR_PRESETS.map((preset) => {
                const isMatched =
                  themeColors?.light?.accent === preset.light.accent &&
                  themeColors?.light?.canvas === preset.light.canvas &&
                  themeColors?.dark?.accent === preset.dark.accent &&
                  themeColors?.dark?.canvas === preset.dark.canvas;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyDualPreset(preset)}
                    style={{
                      borderColor: isMatched ? palette.link : palette.border,
                      backgroundColor: palette.canvas,
                      color: palette.textPrimary,
                    }}
                    className={`flex items-center justify-between gap-2.5 px-3.5 min-h-[46px] rounded-xl border text-left text-xs sm:text-sm font-medium cursor-pointer transition-all ${
                      isMatched ? 'ring-1' : 'hover:opacity-90'
                    }`}
                  >
                    <span className="truncate">{preset.name}</span>
                    <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
                      <span
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ backgroundColor: preset.light.canvas, borderColor: palette.border }}
                        title={`Sáng: ${preset.light.canvas}`}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ backgroundColor: preset.light.accent, borderColor: palette.border }}
                        title={`Nhấn sáng: ${preset.light.accent}`}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ backgroundColor: preset.dark.canvas, borderColor: palette.border }}
                        title={`Tối: ${preset.dark.canvas}`}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ backgroundColor: preset.dark.accent, borderColor: palette.border }}
                        title={`Nhấn tối: ${preset.dark.accent}`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Fine-Grained Color Pickers for Active Editing Mode */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div style={{ color: palette.textMuted }} className="text-xs font-semibold uppercase tracking-wider">
                Tinh chỉnh từng màu ({editingColorMode === 'dark' ? 'Chế độ Tối ☾' : 'Chế độ Sáng ☀'})
              </div>
              {colorEditOverrides && Object.keys(colorEditOverrides).length > 0 && (
                <button
                  type="button"
                  onClick={() => resetModeColors(editingColorMode)}
                  style={{ color: palette.link }}
                  className="text-xs font-medium hover:underline cursor-pointer min-h-[32px]"
                >
                  Đặt lại riêng chế độ {editingColorMode === 'dark' ? 'Tối' : 'Sáng'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {(
                [
                  { key: 'canvas', label: 'Nền trang', val: resolvedEditPalette.canvas },
                  { key: 'surface', label: 'Nền thẻ / Phụ', val: resolvedEditPalette.surface },
                  { key: 'textPrimary', label: 'Màu chữ chính', val: resolvedEditPalette.textPrimary },
                  { key: 'accent', label: 'Màu nhấn / Nút', val: resolvedEditPalette.accent },
                  { key: 'link', label: 'Liên kết', val: resolvedEditPalette.link },
                ] as const
              ).map((item) => {
                const isCustomField = Boolean(colorEditOverrides?.[item.key]);
                return (
                  <div
                    key={`${editingColorMode}-${item.key}`}
                    style={{
                      borderColor: isCustomField ? palette.link : palette.border,
                      backgroundColor: palette.canvas,
                    }}
                    className="p-3 min-h-[54px] rounded-xl border flex items-center gap-3 min-w-0"
                  >
                    <label className="relative w-9 h-9 rounded-lg overflow-hidden border shrink-0 cursor-pointer" style={{ borderColor: palette.border, backgroundColor: item.val }}>
                      <input
                        type="color"
                        value={item.val}
                        onChange={(e) => updateSingleColor(editingColorMode, item.key, e.target.value)}
                        aria-label={`${item.label} (${editingColorMode === 'dark' ? 'Tối' : 'Sáng'})`}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div
                        style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                        className="text-xs uppercase"
                      >
                        {item.val}
                      </div>
                    </div>
                    {isCustomField && (
                      <button
                        type="button"
                        onClick={() => updateSingleColor(editingColorMode, item.key, undefined)}
                        style={{ color: palette.textMuted }}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:opacity-80 cursor-pointer shrink-0"
                        title="Về màu mặc định"
                        aria-label={`Khôi phục ${item.label}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {onApply && (
            <div
              style={{
                borderColor: hasPendingChanges ? palette.link : palette.border,
                backgroundColor: palette.canvas,
              }}
              className="rounded-xl border p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  {hasPendingChanges ? (
                    <span style={{ color: palette.link }}>
                      Đang xem thử cục bộ — chưa lưu trên máy &amp; GitHub
                    </span>
                  ) : applyStatusText ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {applyStatusText}
                    </span>
                  ) : (
                    <span style={{ color: palette.textSecondary }}>
                      Đang dùng cấu hình trên máy. Bạn có thể chọn thử mẫu/màu khác trước khi nhấn Áp dụng.
                    </span>
                  )}
                </div>
                {applyErrorText && (
                  <div className="text-xs text-red-600 dark:text-red-400 break-words [overflow-wrap:anywhere] max-w-full">
                    {applyErrorText}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full sm:w-auto">
                {hasPendingChanges && onDiscard && (
                  <button
                    type="button"
                    onClick={onDiscard}
                    disabled={isApplying}
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.surface,
                      color: palette.textPrimary,
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] sm:min-h-[40px] text-xs font-medium rounded-xl border cursor-pointer hover:opacity-85 disabled:opacity-50 whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Huỷ xem thử
                  </button>
                )}
                <button
                  type="button"
                  onClick={onApply}
                  disabled={isApplying}
                  style={{
                    backgroundColor: hasPendingChanges ? palette.accent : palette.surface,
                    color: hasPendingChanges ? palette.accentText : palette.textPrimary,
                    borderColor: hasPendingChanges ? palette.accent : palette.border,
                  }}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] sm:min-h-[40px] text-xs sm:text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang áp dụng...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      {hasPendingChanges ? 'Áp dụng & Lưu GitHub' : 'Đồng bộ lại lên GitHub'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live Interactive Full Blog Preview Stage */}
      {!compact && (
        <div
          style={{
            borderColor: palette.border,
            backgroundColor: palette.canvas,
          }}
          className="rounded-2xl border overflow-hidden"
        >
          <div
            style={{ borderColor: palette.border, backgroundColor: palette.surface }}
            className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Eye className="w-4 h-4 shrink-0" style={{ color: palette.link }} />
              <span>
                Xem trực quan: <strong>{activePreset.name}</strong> ({currentMode === 'dark' ? 'Tối' : 'Sáng'}
                {activePreset.isMultiPage ? ' · Nhiều trang' : ''})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sun / Moon Toggle right in Live Preview */}
              <button
                type="button"
                onClick={() => handleToggleMode(currentMode === 'dark' ? 'light' : 'dark')}
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                  color: palette.textPrimary,
                }}
                className="inline-flex items-center gap-1.5 px-2.5 min-h-[34px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap"
                title="Đổi Sáng/Tối cho mẫu đang chọn"
              >
                {currentMode === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span>{currentMode === 'dark' ? 'Sáng' : 'Tối'}</span>
              </button>

              <div
                style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
                className="inline-flex p-0.5 rounded-lg border"
              >
                <button
                  type="button"
                  onClick={() => setLivePreviewView('home')}
                  style={{
                    backgroundColor: livePreviewView === 'home' ? palette.accent : 'transparent',
                    color: livePreviewView === 'home' ? palette.accentText : palette.textSecondary,
                  }}
                  className="px-2.5 sm:px-3 min-h-[32px] text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
                >
                  Trang nhất
                </button>
                <button
                  type="button"
                  onClick={() => setLivePreviewView('categories')}
                  style={{
                    backgroundColor: livePreviewView === 'categories' ? palette.accent : 'transparent',
                    color: livePreviewView === 'categories' ? palette.accentText : palette.textSecondary,
                  }}
                  className="px-2.5 sm:px-3 min-h-[32px] text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
                >
                  Chuyên mục
                </button>
                <button
                  type="button"
                  onClick={() => setLivePreviewView('article')}
                  style={{
                    backgroundColor: livePreviewView === 'article' ? palette.accent : 'transparent',
                    color: livePreviewView === 'article' ? palette.accentText : palette.textSecondary,
                  }}
                  className="px-2.5 sm:px-3 min-h-[32px] text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
                >
                  Trang đọc bài
                </button>
              </div>
            </div>
          </div>

          {/* Authentic Scaled Live Render with User's Brand & Selected Editorial Palette */}
          <div
            style={{
              backgroundColor: activePalette.canvas,
              color: activePalette.textPrimary,
              fontFamily: activePreset.fonts.body,
            }}
            className="p-5 sm:p-7 transition-colors duration-200"
          >
            {/* Preview Site Header */}
            <div
              style={{
                borderColor: activePalette.border,
                borderBottomWidth: activePreset.id === 'newyorker-light' ? '3px' : '1px',
                borderBottomStyle: activePreset.id === 'newyorker-light' ? 'double' : 'solid',
              }}
              className={`pb-4 mb-5 flex flex-wrap items-center justify-between gap-3 ${
                activePreset.id === 'newyorker-light' ? 'flex-col text-center' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={displayIcon}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover border"
                  style={{ borderColor: activePalette.border }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span
                  style={{ fontFamily: activePreset.fonts.display }}
                  className="text-lg sm:text-xl font-bold tracking-tight"
                >
                  {displaySiteTitle}
                </span>
              </div>
              <div
                style={{
                  color: activePalette.textMuted,
                  fontFamily: activePreset.fonts.mono,
                }}
                className="text-[11px] flex flex-wrap items-center gap-3.5"
              >
                <span>Trang nhất</span>
                {activePreset.isMultiPage && <span>Chuyên mục</span>}
                <span>Kho bài</span>
                {activePreset.isMultiPage && <span>Lưu trữ</span>}
                {activePreset.isMultiPage && <span>Giới thiệu</span>}
                <span>RSS</span>
                <span aria-hidden="true">{currentMode === 'dark' ? '☀' : '☾'}</span>
              </div>
            </div>

            {livePreviewView === 'home' ? (
              <div className="space-y-5">
                <div
                  style={{ borderColor: activePalette.border }}
                  className={`pb-4 border-b ${
                    activePreset.id === 'newyorker-light' ? 'text-center' : ''
                  }`}
                >
                  <div
                    style={{
                      color: activePalette.link,
                      fontFamily: activePreset.fonts.mono,
                    }}
                    className="text-[11px] uppercase tracking-wider mb-1"
                  >
                    {displayAuthor} · {activePreset.isMultiPage ? 'Ấn phẩm nhiều trang' : 'Ấn phẩm cá nhân'}
                  </div>
                  <p
                    style={{ color: activePalette.textSecondary }}
                    className={`text-xs sm:text-sm max-w-2xl ${
                      activePreset.id === 'newyorker-light' ? 'mx-auto' : ''
                    }`}
                  >
                    {displayTagline}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <div
                      style={{
                        color: activePalette.link,
                        fontFamily: activePreset.fonts.mono,
                      }}
                      className="text-[11px] uppercase tracking-wider font-semibold"
                    >
                      {activeArt.sampleKicker}
                    </div>
                    <h3
                      style={{ fontFamily: activePreset.fonts.display }}
                      className="text-xl sm:text-2xl font-bold leading-tight text-balance"
                    >
                      {activeArt.sampleHeadline}
                    </h3>
                    <p
                      style={{ color: activePalette.textSecondary }}
                      className="text-xs sm:text-sm leading-relaxed"
                    >
                      {activeArt.sampleLead}
                    </p>
                    <div
                      style={{
                        color: activePalette.textMuted,
                        fontFamily: activePreset.fonts.mono,
                      }}
                      className="text-[11px] pt-1"
                    >
                      Hôm nay · 4 phút đọc
                    </div>
                  </div>
                  <div
                    style={{ borderColor: activePalette.border }}
                    className="md:col-span-5 aspect-[16/10] overflow-hidden rounded-lg border"
                  >
                    <img
                      src={activeArt.heroImage}
                      alt={activeArt.sampleHeadline}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {activePreset.isMultiPage && (
                  <div
                    style={{ borderColor: activePalette.border }}
                    className="pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
                  >
                    {[
                      { title: 'Chuyên mục', sub: 'Phân trang theo chủ đề' },
                      { title: 'Kho bài viết', sub: 'Tìm kiếm & phân trang' },
                      { title: 'Lưu trữ năm', sub: 'Mục lục theo thời gian' },
                      { title: 'Giới thiệu & Liên hệ', sub: 'Hồ sơ tác giả & chat' },
                    ].map((hub) => (
                      <div
                        key={hub.title}
                        style={{
                          borderColor: activePalette.border,
                          backgroundColor: activePalette.surface,
                        }}
                        className="p-2.5 rounded-lg border"
                      >
                        <div className="font-semibold" style={{ color: activePalette.textPrimary }}>
                          {hub.title}
                        </div>
                        <div className="text-[10.5px] mt-0.5" style={{ color: activePalette.textMuted }}>
                          {hub.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : livePreviewView === 'categories' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b" style={{ borderColor: activePalette.border }}>
                  <div>
                    <h3 style={{ fontFamily: activePreset.fonts.display }} className="text-lg font-bold">
                      Danh bạ Chuyên mục &amp; Chủ đề
                    </h3>
                    <p style={{ color: activePalette.textMuted }} className="text-xs">
                      Mỗi chuyên mục có trang tĩnh riêng (/chuyen-muc/...) và lọc trực tiếp trên Kho bài.
                    </p>
                  </div>
                  <span style={{ color: activePalette.link, fontFamily: activePreset.fonts.mono }} className="text-[11px]">
                    4 chuyên mục · 6 bài mẫu
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'Tiêu điểm & Phân tích', count: '2 bài viết', note: activeArt.sampleHeadline },
                    { name: 'Văn hoá & Đời sống', count: '2 bài viết', note: activeArt.brief1 },
                    { name: 'Công nghệ & Xuất bản', count: '1 bài viết', note: activeArt.brief2 },
                    { name: 'Lưu trữ & Ghi chép', count: '1 bài viết', note: 'Mục lục theo năm và hồ sơ tác giả' },
                  ].map((cat) => (
                    <div
                      key={cat.name}
                      style={{
                        borderColor: activePalette.border,
                        backgroundColor: activePalette.surface,
                      }}
                      className="p-3.5 rounded-xl border space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold" style={{ color: activePalette.textPrimary }}>
                          {cat.name}
                        </span>
                        <span style={{ color: activePalette.link, fontFamily: activePreset.fonts.mono }} className="text-[10.5px]">
                          {cat.count}
                        </span>
                      </div>
                      <p style={{ color: activePalette.textSecondary }} className="text-[11px] line-clamp-1">
                        {cat.note}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto space-y-4">
                <div
                  style={{
                    color: activePalette.link,
                    fontFamily: activePreset.fonts.mono,
                  }}
                  className="text-[11px] uppercase tracking-wider font-semibold"
                >
                  Trang nhất · {activeArt.sampleKicker} · 4 phút đọc
                </div>
                <h3
                  style={{ fontFamily: activePreset.fonts.display }}
                  className="text-xl sm:text-2xl font-bold leading-tight"
                >
                  {activeArt.sampleHeadline}
                </h3>
                <div
                  style={{ color: activePalette.textMuted }}
                  className="text-xs"
                >
                  Bởi <strong>{displayAuthor}</strong>
                </div>
                <img
                  src={activeArt.heroImage}
                  alt=""
                  className="w-full h-44 object-cover rounded-lg"
                />
                <p
                  style={{ color: activePalette.textSecondary }}
                  className="text-sm leading-relaxed"
                >
                  <span
                    style={{
                      fontFamily: activePreset.fonts.display,
                      color: activePalette.textPrimary,
                    }}
                    className="float-left text-4xl font-bold leading-none mr-2 mt-1"
                  >
                    K
                  </span>
                  hi viết trên không gian blog do chính mình làm chủ, câu chữ giữ được sự mạch lạc và độ sâu hiếm có. Không khung mục lục rườm rà che màn hình, chỉ có nội dung tinh gọn, hình ảnh sắc nét và hạ tầng SEO ngầm hoạt động bền bỉ.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
