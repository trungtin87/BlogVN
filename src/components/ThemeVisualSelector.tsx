import { useState } from 'react';
import { Check, Eye, Moon, Sun } from 'lucide-react';
import type { AstroTemplateId, BlogTheme } from '../types/blog';
import { EDITORIAL_ASSETS } from '../data/assets';
import {
  EDITORIAL_THEME_ORDER,
  EDITORIAL_THEMES,
  normalizeAstroTemplateId,
} from '../data/themes';

interface ThemeVisualSelectorProps {
  theme: BlogTheme;
  selectedTemplate: AstroTemplateId | string | undefined;
  onSelectTemplate: (templateId: AstroTemplateId) => void;
  previewSiteTitle?: string;
  previewHeaderTitle?: string;
  previewTagline?: string;
  previewAuthorName?: string;
  previewSiteIcon?: string;
  compact?: boolean;
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
      'Nền than chì studio tương phản cao làm nổi bật ảnh bìa khổ rộng, trích xuất trực tiếp từ video hoặc ảnh chụp thực tế.',
    brief1: 'Góc nhìn quốc tế: Tối ưu trải nghiệm đọc trên màn hình nhỏ',
    brief2: 'Quy trình biên tập và xuất bản Markdown từ điện thoại',
  },
  'obsidian-broadsheet': {
    heroImage: EDITORIAL_ASSETS.coverTechArchitecture,
    secondaryImage: EDITORIAL_ASSETS.themeBbcNewsroom,
    sampleKicker: 'Nhật báo Đêm · Công nghệ',
    sampleHeadline: 'Thiết kế hệ thống blog Markdown bền vững suốt hàng chục năm',
    sampleLead:
      'Mực đêm xanh thẫm dịu mắt kết hợp tiêu đề Serif uy nghiêm, mang lại sự tập trung tối đa cho người đọc buổi tối.',
    brief1: 'Lưu trữ trọn đời bằng tệp văn bản thuần trên Git repository',
    brief2: 'Tối ưu dữ liệu có cấu trúc BlogPosting JSON-LD cho Google',
  },
  'espresso-salon': {
    heroImage: EDITORIAL_ASSETS.coverEveningNotes,
    secondaryImage: EDITORIAL_ASSETS.themeNewYorkerLiterary,
    sampleKicker: 'Thư phòng · Suy tư',
    sampleHeadline: 'Những trang viết cuối ngày bên ánh đèn vàng ấm áp',
    sampleLead:
      'Sắc nền espresso êm dịu với chữ Serif cổ điển, giảm mỏi mắt cho những bài viết phân tích và hồi ký dài hơi.',
    brief1: 'Sổ tay đọc sách: Rút gọn đoạn mở đầu để giữ mạch cảm xúc',
    brief2: 'Xây dựng nhịp thở đều đặn qua từng đề mục bài viết',
  },
};

export function ThemeVisualSelector({
  theme,
  selectedTemplate,
  onSelectTemplate,
  previewSiteTitle,
  previewHeaderTitle,
  previewTagline,
  previewAuthorName,
  previewSiteIcon,
  compact = false,
}: ThemeVisualSelectorProps) {
  const { palette, fonts } = theme;
  const normalizedSelected = normalizeAstroTemplateId(
    selectedTemplate,
    theme.isDark ? 'dark' : 'light'
  );
  const [toneFilter, setToneFilter] = useState<'all' | 'light' | 'dark'>('all');
  const [livePreviewView, setLivePreviewView] = useState<'home' | 'article'>('home');

  const visibleThemes = EDITORIAL_THEME_ORDER.map((id) => EDITORIAL_THEMES[id]).filter((preset) => {
    if (toneFilter === 'light') return !preset.isDark;
    if (toneFilter === 'dark') return preset.isDark;
    return true;
  });

  const activePreset = EDITORIAL_THEMES[normalizedSelected];
  const activeArt = THEME_PREVIEW_ART[normalizedSelected];
  const displaySiteTitle = (previewSiteTitle || 'Huyền Không Thư Quán').trim();
  const displayBrand = (previewHeaderTitle || displaySiteTitle).trim();
  const displayTagline = (
    previewTagline || 'Ghi chép cá nhân, tiểu luận chuyên sâu và góc nhìn tĩnh tại.'
  ).trim();
  const displayAuthor = (previewAuthorName || 'Tác giả').trim();

  return (
    <div className="space-y-5">
      {/* Header & 2 Light / 3 Dark Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">
            Chọn mẫu giao diện Blog (2 mẫu Sáng · 3 mẫu Tối)
          </div>
          <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">
            Thiết kế thuần túy cho viết &amp; đọc blog — xem trực quan trước khi áp dụng và triển khai Astro.
          </p>
        </div>

        <div
          style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
          className="inline-flex p-1 rounded-xl border self-start"
          role="group"
          aria-label="Lọc giao diện sáng tối"
        >
          {(
            [
              { id: 'all', label: 'Tất cả (5)' },
              { id: 'light', label: '2 Sáng', icon: Sun },
              { id: 'dark', label: '3 Tối', icon: Moon },
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
                className="inline-flex items-center gap-1.5 px-3 min-h-[36px] text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap"
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 Visual Theme Cards with Authentic Scaled Miniature Blog Mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleThemes.map((preset) => {
          const isSelected = normalizedSelected === preset.id;
          const art = THEME_PREVIEW_ART[preset.id];
          const p = preset.palette;
          const isNewYorker = preset.id === 'newyorker-light';
          const isBroadsheet =
            preset.id === 'nytimes-light' || preset.id === 'obsidian-broadsheet';

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectTemplate(preset.id)}
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: isSelected ? palette.link : palette.border,
              }}
              className={`group text-left rounded-2xl border overflow-hidden transition-all cursor-pointer flex flex-col ${
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
                className="p-3.5 border-b space-y-2.5 select-none"
              >
                {/* Mini Masthead Bar */}
                <div
                  style={{
                    borderColor: p.border,
                    borderBottomWidth: isNewYorker ? '3px' : '1px',
                    borderBottomStyle: isNewYorker ? 'double' : 'solid',
                  }}
                  className={`pb-2 flex items-center justify-between gap-2 ${
                    isNewYorker ? 'flex-col text-center' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      style={{ backgroundColor: p.accent, color: p.accentText }}
                      className="w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0"
                    >
                      {(displayBrand[0] || 'B').toUpperCase()}
                    </span>
                    <span
                      style={{ fontFamily: preset.fonts.display }}
                      className="text-xs font-bold tracking-tight truncate"
                    >
                      {displayBrand}
                    </span>
                  </div>
                  <div
                    style={{ color: p.textMuted, fontFamily: preset.fonts.mono }}
                    className="text-[9px] flex items-center gap-2 shrink-0"
                  >
                    <span>Trang nhất</span>
                    <span>Bài viết</span>
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
                      className="text-[11px] font-bold leading-snug line-clamp-2"
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

                {/* Mini Secondary Broadsheet / Story Strip */}
                <div
                  style={{ borderColor: p.border }}
                  className="pt-2 border-t grid grid-cols-2 gap-2 text-[9px]"
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
              <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      {preset.name}
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0" style={{ color: palette.link }} />
                      )}
                    </span>
                    <span
                      style={{ color: isSelected ? palette.link : palette.textMuted, fontFamily: fonts.mono }}
                      className="text-[11px] font-medium whitespace-nowrap"
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
              <Eye className="w-4 h-4" style={{ color: palette.link }} />
              <span>
                Xem trực quan Blog của bạn theo mẫu: <strong>{activePreset.name}</strong>
              </span>
            </div>

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
                className="px-3 min-h-[32px] text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
              >
                Trang nhất
              </button>
              <button
                type="button"
                onClick={() => setLivePreviewView('article')}
                style={{
                  backgroundColor: livePreviewView === 'article' ? palette.accent : 'transparent',
                  color: livePreviewView === 'article' ? palette.accentText : palette.textSecondary,
                }}
                className="px-3 min-h-[32px] text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
              >
                Trang đọc bài
              </button>
            </div>
          </div>

          {/* Authentic Scaled Live Render with User's Brand & Selected Editorial Palette */}
          <div
            style={{
              backgroundColor: activePreset.palette.canvas,
              color: activePreset.palette.textPrimary,
              fontFamily: activePreset.fonts.body,
            }}
            className="p-5 sm:p-7 transition-colors duration-200"
          >
            {/* Preview Site Header */}
            <div
              style={{
                borderColor: activePreset.palette.border,
                borderBottomWidth: activePreset.id === 'newyorker-light' ? '3px' : '1px',
                borderBottomStyle: activePreset.id === 'newyorker-light' ? 'double' : 'solid',
              }}
              className={`pb-4 mb-5 flex flex-wrap items-center justify-between gap-3 ${
                activePreset.id === 'newyorker-light' ? 'flex-col text-center' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                {previewSiteIcon ? (
                  <img
                    src={previewSiteIcon}
                    alt=""
                    className="w-6 h-6 rounded object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                <span
                  style={{ fontFamily: activePreset.fonts.display }}
                  className="text-lg sm:text-xl font-bold tracking-tight"
                >
                  {displaySiteTitle}
                </span>
              </div>
              <div
                style={{
                  color: activePreset.palette.textMuted,
                  fontFamily: activePreset.fonts.mono,
                }}
                className="text-[11px] flex items-center gap-4"
              >
                <span>Trang nhất</span>
                <span>Kho bài viết</span>
                <span>RSS</span>
              </div>
            </div>

            {livePreviewView === 'home' ? (
              <div className="space-y-5">
                <div
                  style={{ borderColor: activePreset.palette.border }}
                  className={`pb-4 border-b ${
                    activePreset.id === 'newyorker-light' ? 'text-center' : ''
                  }`}
                >
                  <div
                    style={{
                      color: activePreset.palette.link,
                      fontFamily: activePreset.fonts.mono,
                    }}
                    className="text-[11px] uppercase tracking-wider mb-1"
                  >
                    {displayAuthor} · Ấn phẩm cá nhân
                  </div>
                  <p
                    style={{ color: activePreset.palette.textSecondary }}
                    className="text-xs sm:text-sm max-w-2xl mx-auto"
                  >
                    {displayTagline}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  <div className="md:col-span-7 space-y-2">
                    <div
                      style={{
                        color: activePreset.palette.link,
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
                      style={{ color: activePreset.palette.textSecondary }}
                      className="text-xs sm:text-sm leading-relaxed"
                    >
                      {activeArt.sampleLead}
                    </p>
                    <div
                      style={{
                        color: activePreset.palette.textMuted,
                        fontFamily: activePreset.fonts.mono,
                      }}
                      className="text-[11px] pt-1"
                    >
                      Hôm nay · 4 phút đọc
                    </div>
                  </div>
                  <div
                    style={{ borderColor: activePreset.palette.border }}
                    className="md:col-span-5 aspect-[16/10] overflow-hidden rounded-lg border"
                  >
                    <img
                      src={activeArt.heroImage}
                      alt={activeArt.sampleHeadline}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto space-y-4">
                <div
                  style={{
                    color: activePreset.palette.link,
                    fontFamily: activePreset.fonts.mono,
                  }}
                  className="text-[11px] uppercase tracking-wider font-semibold"
                >
                  {activeArt.sampleKicker} · 4 phút đọc
                </div>
                <h3
                  style={{ fontFamily: activePreset.fonts.display }}
                  className="text-xl sm:text-2xl font-bold leading-tight"
                >
                  {activeArt.sampleHeadline}
                </h3>
                <div
                  style={{ color: activePreset.palette.textMuted }}
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
                  style={{ color: activePreset.palette.textSecondary }}
                  className="text-sm leading-relaxed"
                >
                  <span
                    style={{
                      fontFamily: activePreset.fonts.display,
                      color: activePreset.palette.textPrimary,
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
