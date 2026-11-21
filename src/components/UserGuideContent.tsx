import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Globe,
  KeyRound,
  LayoutTemplate,
  Rocket,
  ShieldCheck,
  Youtube,
} from 'lucide-react';
import type { BlogTheme } from '../types/blog';

export type GuideSectionId = 'all' | 'start' | 'github' | 'astro' | 'editor' | 'faq';

interface UserGuideContentProps {
  theme: BlogTheme;
  compact?: boolean;
  onJumpToTab?: (tab: 'blog' | 'editor' | 'github') => void;
}

const GUIDE_TABS: Array<{ id: GuideSectionId; label: string }> = [
  { id: 'all', label: 'Toàn bộ A–Z' },
  { id: 'start', label: '1. Bắt đầu' },
  { id: 'github', label: '2. Token & GitHub' },
  { id: 'astro', label: '3. Astro & Nhận dạng' },
  { id: 'editor', label: '4. Viết bài & YouTube' },
  { id: 'faq', label: 'Xử lý lỗi' },
];

export function UserGuideContent({
  theme,
  compact = false,
  onJumpToTab,
}: UserGuideContentProps) {
  const { palette, fonts } = theme;
  const [activeSection, setActiveSection] = useState<GuideSectionId>('all');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const showSection = (id: Exclude<GuideSectionId, 'all'>) =>
    activeSection === 'all' || activeSection === id;

  const faqs = [
    {
      q: 'Lỗi không đẩy được workflow Astro (.github/workflows/deploy-astro.yml)?',
      a: 'GitHub Personal Access Token của bạn chưa có quyền "workflow". Hãy tạo lại Token mới và tick đầy đủ cả 2 ô "repo" và "workflow", sau đó dán lại vào mục 1 ở tab GitHub & App.',
    },
    {
      q: 'Repo GitHub đã có code cũ nên GitHub Actions build bị lỗi?',
      a: 'Vào tab GitHub & App → Mục 4 ("Template Web Blog Astro 5 chuẩn tiếng Việt") → chọn mẫu bố cục → bấm "Triển khai Template Astro Việt" để xoá sạch tệp xung đột cũ và nạp mới hoàn chỉnh kèm nhận dạng web của bạn.',
    },
    {
      q: 'Dùng chung URL Đạo Ký với người khác có bị lộ bài nháp hay Token không?',
      a: 'Không. Đạo Ký chạy hoàn toàn phía trình duyệt (client-side) và phân tách toàn bộ cấu hình, bản nháp, lịch đăng bài và GitHub Token theo từng tài khoản Google UID riêng trên máy.',
    },
    {
      q: 'Lỗi "auth/unauthorized-domain" khi đăng nhập Google trên tên miền riêng?',
      a: 'Truy cập Firebase Console → Authentication → Settings → Authorized domains và thêm tên miền GitHub Pages (hoặc tên miền tuỳ chỉnh) của bạn vào danh sách cho phép.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Section filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {GUIDE_TABS.map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              style={{
                backgroundColor: active ? palette.accent : palette.canvas,
                color: active ? palette.accentText : palette.textSecondary,
                borderColor: active ? palette.accent : palette.border,
              }}
              className="px-3 min-h-[36px] text-xs font-semibold rounded-lg border cursor-pointer transition-colors whitespace-nowrap"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Section 1: Overview & Google Isolation */}
      {showSection('start') && (
        <section
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-xl border p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
              Bước 1: Đăng nhập Google &amp; Hiểu cách lưu trữ dữ liệu
            </h3>
          </div>
          <p style={{ color: palette.textSecondary }} className="text-xs sm:text-sm leading-relaxed">
            Đạo Ký đóng vai trò như một trình soạn thảo &amp; quản trị Blog tĩnh chạy trực tiếp trên trình duyệt của bạn — không lưu bài viết lên máy chủ trung gian.
          </p>
          <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-3'} gap-2.5 text-xs`}>
            <div
              style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
              className="p-3 rounded-lg border space-y-1"
            >
              <div className="font-semibold">1. Tài khoản Google</div>
              <p style={{ color: palette.textMuted }} className="leading-relaxed">
                Tách biệt hoàn toàn dữ liệu trên máy (bản nháp, nhận dạng web, Token GitHub) theo từng người dùng.
              </p>
            </div>
            <div
              style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
              className="p-3 rounded-lg border space-y-1"
            >
              <div className="font-semibold">2. Kho GitHub cá nhân</div>
              <p style={{ color: palette.textMuted }} className="leading-relaxed">
                Bài viết Markdown, ảnh tải lên và cấu hình trang web được commit trực tiếp vào repository của riêng bạn.
              </p>
            </div>
            <div
              style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
              className="p-3 rounded-lg border space-y-1"
            >
              <div className="font-semibold">3. GitHub Pages tự build</div>
              <p style={{ color: palette.textMuted }} className="leading-relaxed">
                Mỗi lần bấm đăng bài hoặc triển khai Astro Template, GitHub Actions tự build thành website tĩnh tốc độ cao.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section 2: GitHub PAT & Repo Setup */}
      {showSection('github') && (
        <section
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-xl border p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 shrink-0" style={{ color: palette.link }} />
              <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
                Bước 2: Kết nối GitHub Token &amp; Chọn Repository
              </h3>
            </div>
            {onJumpToTab && (
              <button
                type="button"
                onClick={() => onJumpToTab('github')}
                style={{ color: palette.link, borderColor: palette.border, backgroundColor: palette.canvas }}
                className="px-3 min-h-[32px] text-xs font-semibold rounded-lg border cursor-pointer"
              >
                Mở tab GitHub &amp; App
              </button>
            )}
          </div>

          <ol className="space-y-2.5 text-xs sm:text-sm" style={{ color: palette.textSecondary }}>
            <li className="flex items-start gap-2.5">
              <span
                style={{ backgroundColor: palette.accent, color: palette.accentText, fontFamily: fonts.mono }}
                className="w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
              >
                1
              </span>
              <span>
                Vào tab <strong>GitHub &amp; App</strong> → Mục <strong>1. Phiên Google cá nhân &amp; Kết nối GitHub</strong>, bấm liên kết{' '}
                <strong>Tạo Token (repo + workflow)</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span
                style={{ backgroundColor: palette.accent, color: palette.accentText, fontFamily: fonts.mono }}
                className="w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
              >
                2
              </span>
              <span>
                Trên GitHub, đảm bảo bạn đã tick cả 2 quyền{' '}
                <code style={{ fontFamily: fonts.mono }}>repo</code> và{' '}
                <code style={{ fontFamily: fonts.mono }}>workflow</code> rồi tạo Token, sau đó dán vào ô và bấm{' '}
                <strong>Lưu &amp; Kết nối</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span
                style={{ backgroundColor: palette.accent, color: palette.accentText, fontFamily: fonts.mono }}
                className="w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5"
              >
                3
              </span>
              <span>
                Chọn nhanh repository hiện có trong danh sách (ưu tiên{' '}
                <code style={{ fontFamily: fonts.mono }}>ten-tai-khoan.github.io</code>), hoặc dùng Mục{' '}
                <strong>2. Tạo Blog GitHub Pages mới trong 1 chạm</strong> nếu bạn chưa tạo repo.
              </span>
            </li>
          </ol>
        </section>
      )}

      {/* Section 3: Astro Templates & Site Identity */}
      {showSection('astro') && (
        <section
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-xl border p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <LayoutTemplate className="w-5 h-5 shrink-0" style={{ color: palette.link }} />
              <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
                Bước 3: Tuỳ chỉnh Nhận dạng Web &amp; Triển khai Astro 5 tiếng Việt
              </h3>
            </div>
            {onJumpToTab && (
              <button
                type="button"
                onClick={() => onJumpToTab('github')}
                style={{ color: palette.link, borderColor: palette.border, backgroundColor: palette.canvas }}
                className="px-3 min-h-[32px] text-xs font-semibold rounded-lg border cursor-pointer"
              >
                Cài đặt Nhận dạng
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs sm:text-sm" style={{ color: palette.textSecondary }}>
            <p className="leading-relaxed">
              Tại Mục <strong>4. Nhận dạng Web cá nhân, Header/Footer &amp; Xuất bản Web App GitHub Pages</strong>, bạn có thể tuỳ biến toàn bộ giao diện thương hiệu cá nhân:
            </p>
            <ul className="space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <Globe className="w-4 h-4 shrink-0 mt-0.5" style={{ color: palette.link }} />
                <span>
                  Đổi <strong>Biểu tượng Web (Favicon/App Icon)</strong> bằng ảnh tải từ máy, <strong>Tiêu đề Web</strong>, <strong>Tên Header</strong>, <strong>Mô tả SEO</strong>, <strong>Footer</strong> và liên kết điều hướng tuỳ chỉnh.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Rocket className="w-4 h-4 shrink-0 mt-0.5" style={{ color: palette.link }} />
                <span>
                  Chọn 1 trong 10 giao diện blog (<strong>5 mẫu cơ bản</strong> + <strong>5 mẫu nhiều trang</strong> gồm Monocle, Guardian Cổng tin, Kyoto Triển lãm, Economist Chuyên san, Nordic Atlas — có sẵn Chuyên mục, Chủ đề, Lưu trữ theo năm, Giới thiệu &amp; Liên hệ và đều hỗ trợ nút chuyển <strong>Sáng/Tối Mặt trời &amp; Mặt trăng</strong>), rồi bấm <strong>Triển khai Template Astro Blog</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>
                  Giao diện bài viết được tối giản tối đa (tích hợp lọc chuyên mục, 3 bài liên quan, Live Chat góc phải tuỳ chọn nền tảng Zalo/Messenger/Telegram/WhatsApp/Tawk.to/Crisp và giữ đầy đủ SEO ngầm <code style={{ fontFamily: fonts.mono }}>sitemap.xml</code>, <code style={{ fontFamily: fonts.mono }}>robots.txt</code>, <code style={{ fontFamily: fonts.mono }}>rss.xml</code>, JSON-LD).
                </span>
              </li>
            </ul>
          </div>
        </section>
      )}

      {/* Section 4: Markdown Editor, Images & YouTube Cover */}
      {showSection('editor') && (
        <section
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-xl border p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <FileEdit className="w-5 h-5 shrink-0" style={{ color: palette.link }} />
              <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
                Bước 4: Biên soạn bài viết, Lấy ảnh bìa YouTube &amp; Xuất bản
              </h3>
            </div>
            {onJumpToTab && (
              <button
                type="button"
                onClick={() => onJumpToTab('editor')}
                style={{ color: palette.link, borderColor: palette.border, backgroundColor: palette.canvas }}
                className="px-3 min-h-[32px] text-xs font-semibold rounded-lg border cursor-pointer"
              >
                Mở trình Biên soạn
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
            <div
              style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
              className="p-3.5 rounded-lg border space-y-1.5"
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                Ảnh bìa từ video YouTube hoặc từ máy
              </div>
              <p style={{ color: palette.textSecondary }}>
                Nhấn <strong>Tải ảnh từ máy</strong> để nén và đưa ảnh vào kho GitHub, hoặc bấm <strong>Lấy từ YouTube</strong> / dán thẳng link video YouTube vào ô ảnh bìa để tự lấy ảnh đại diện chất lượng cao.
              </p>
            </div>

            <div
              style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
              className="p-3.5 rounded-lg border space-y-1.5"
            >
              <div className="font-semibold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 shrink-0" style={{ color: palette.link }} />
                Tự lưu nháp, SEO Studio &amp; Chia sẻ Mạng xã hội API
              </div>
              <p style={{ color: palette.textSecondary }}>
                Khung <strong>Viết bài</strong> tách riêng và tự động lưu nháp mỗi 2,5 giây. Khi chuyển qua tab <strong>Tối ưu</strong> hoặc mở hộp thoại <strong>Đăng lên GitHub</strong>, bạn có thể kiểm tra điểm SEO và tự động chia sẻ qua API chính thống (Facebook Page, Threads, X, LinkedIn, Bluesky, Mastodon, Telegram, Discord).
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section 5: FAQ */}
      {showSection('faq') && (
        <section
          style={{
            borderColor: palette.border,
            backgroundColor: palette.surface,
          }}
          className="rounded-xl border p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <h3 style={{ fontFamily: fonts.display }} className="text-base font-bold">
              Giải đáp nhanh &amp; Xử lý sự cố thường gặp
            </h3>
          </div>

          <div className="space-y-2">
            {faqs.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={item.q}
                  style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
                  className="rounded-lg border overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 shrink-0" style={{ color: palette.textMuted }} />
                    ) : (
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: palette.textMuted }} />
                    )}
                  </button>
                  {isOpen && (
                    <div
                      style={{ color: palette.textSecondary, borderColor: palette.border }}
                      className="px-3.5 pb-3 pt-2 text-xs leading-relaxed border-t"
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
