import type {
  AstroTemplateId,
  BlogCollection,
  BlogConfig,
  BlogTheme,
  LiveChatConfig,
  ThemeMode,
} from '../types/blog';

export const DEFAULT_LIVE_CHAT_CONFIG: LiveChatConfig = {
  enabled: false,
  title: 'Trò chuyện với tác giả',
  welcomeText: 'Chọn kênh liên hệ trực tiếp bên dưới để nhắn tin nhanh.',
  channels: [
    { id: 'zalo', enabled: true, value: '', label: 'Zalo' },
    { id: 'messenger', enabled: true, value: '', label: 'Messenger' },
    { id: 'telegram', enabled: false, value: '', label: 'Telegram' },
    { id: 'whatsapp', enabled: false, value: '', label: 'WhatsApp' },
    { id: 'email', enabled: false, value: '', label: 'Email' },
    { id: 'tawkto', enabled: false, value: '', label: 'Tawk.to Widget' },
    { id: 'crisp', enabled: false, value: '', label: 'Crisp Chat' },
  ],
};

export interface EditorialThemePreset {
  id: AstroTemplateId;
  name: string;
  inspiration: string;
  toneLabel: 'Sáng' | 'Tối';
  layoutTag: string;
  description: string;
  isDark: boolean;
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  palette: BlogTheme['palette'];
}

export const EDITORIAL_THEME_ORDER: AstroTemplateId[] = [
  'newyorker-light',
  'nytimes-light',
  'bbc-dark',
  'obsidian-broadsheet',
  'espresso-salon',
];

export const EDITORIAL_THEMES: Record<AstroTemplateId, EditorialThemePreset> = {
  'newyorker-light': {
    id: 'newyorker-light',
    name: 'New Yorker Văn chương',
    inspiration: 'Cảm hứng The New Yorker',
    toneLabel: 'Sáng',
    layoutTag: 'Tạp chí tiểu luận',
    description:
      'Nền giấy ngà ấm, măng-sét kẻ chỉ đôi cổ điển và chữ Serif thanh lịch dành cho bài luận chuyên sâu.',
    isDark: false,
    fonts: {
      display: "'Playfair Display', 'Fraunces', Georgia, serif",
      body: "'Lora', Georgia, serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: {
      canvas: '#FAF7F2',
      surface: '#F2EDE4',
      surfaceElevated: '#FFFFFF',
      border: '#DDD5C7',
      textPrimary: '#141414',
      textSecondary: '#3A352E',
      textMuted: '#6E665A',
      accent: '#141414',
      accentText: '#FAF7F2',
      link: '#B91C1C',
    },
  },
  'nytimes-light': {
    id: 'nytimes-light',
    name: 'NYTimes Nhật báo',
    inspiration: 'Cảm hứng The New York Times',
    toneLabel: 'Sáng',
    layoutTag: 'Báo in đa cột',
    description:
      'Nền trắng tinh khôi, bài tiêu điểm lớn kết hợp cột tin nhanh sắc sảo với đường kẻ báo in 1px.',
    isDark: false,
    fonts: {
      display: "'Fraunces', 'Playfair Display', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: {
      canvas: '#FFFFFF',
      surface: '#F5F6F8',
      surfaceElevated: '#FFFFFF',
      border: '#D4D4D8',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      accent: '#0F172A',
      accentText: '#FFFFFF',
      link: '#1E3A8A',
    },
  },
  'bbc-dark': {
    id: 'bbc-dark',
    name: 'BBC Studio Tối',
    inspiration: 'Cảm hứng BBC News',
    toneLabel: 'Tối',
    layoutTag: 'Lưới tin hiện đại',
    description:
      'Than chì studio tương phản cao, điểm nhấn đỏ thẫm, lưới bài viết & ảnh bìa video sắc bén.',
    isDark: true,
    fonts: {
      display: "'Plus Jakarta Sans', system-ui, sans-serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: {
      canvas: '#121214',
      surface: '#1A1B1F',
      surfaceElevated: '#22242A',
      border: '#2E313A',
      textPrimary: '#F4F4F5',
      textSecondary: '#D4D4D8',
      textMuted: '#A1A1AA',
      accent: '#E11D48',
      accentText: '#FFFFFF',
      link: '#FB7185',
    },
  },
  'obsidian-broadsheet': {
    id: 'obsidian-broadsheet',
    name: 'Broadsheet Đêm',
    inspiration: 'Cảm hứng NYT Đêm',
    toneLabel: 'Tối',
    layoutTag: 'Nhật báo ban đêm',
    description:
      'Mực đêm xanh thẫm dịu mắt, tiêu đề Serif uy nghiêm kết hợp ánh xanh coban dễ đọc suốt nhiều giờ.',
    isDark: true,
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: {
      canvas: '#0B0D12',
      surface: '#131722',
      surfaceElevated: '#1A1F2E',
      border: '#273043',
      textPrimary: '#F3F4F6',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      accent: '#F3F4F6',
      accentText: '#0B0D12',
      link: '#60A5FA',
    },
  },
  'espresso-salon': {
    id: 'espresso-salon',
    name: 'Salon Suy tư',
    inspiration: 'Cảm hứng Thư phòng Đêm',
    toneLabel: 'Tối',
    layoutTag: 'Đọc sâu ấm áp',
    description:
      'Nền nâu espresso ấm áp với điểm nhấn vàng hổ phách và chữ Serif êm dịu cho những bài viết dài.',
    isDark: true,
    fonts: {
      display: "'Playfair Display', 'Fraunces', Georgia, serif",
      body: "'Lora', Georgia, serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: {
      canvas: '#161210',
      surface: '#201A17',
      surfaceElevated: '#29221E',
      border: '#3B312B',
      textPrimary: '#F5EFE6',
      textSecondary: '#D6CBC0',
      textMuted: '#A39589',
      accent: '#E5A93C',
      accentText: '#161210',
      link: '#FBBF24',
    },
  },
};

export function normalizeAstroTemplateId(
  raw?: string | null,
  fallbackMode: ThemeMode = 'light'
): AstroTemplateId {
  if (
    raw === 'newyorker-light' ||
    raw === 'nytimes-light' ||
    raw === 'bbc-dark' ||
    raw === 'obsidian-broadsheet' ||
    raw === 'espresso-salon'
  ) {
    return raw;
  }
  if (raw === 'minimal') return 'newyorker-light';
  if (raw === 'editorial') return 'nytimes-light';
  if (raw === 'visual-grid') return 'bbc-dark';
  return fallbackMode === 'dark' ? 'obsidian-broadsheet' : 'newyorker-light';
}

export function toBlogTheme(preset: EditorialThemePreset): BlogTheme {
  return {
    id: preset.isDark ? 'dark' : 'light',
    name: preset.name,
    isDark: preset.isDark,
    fonts: preset.fonts,
    palette: preset.palette,
  };
}

export const AM_DUONG_THEMES: Record<ThemeMode, BlogTheme> = {
  light: toBlogTheme(EDITORIAL_THEMES['newyorker-light']),
  dark: toBlogTheme(EDITORIAL_THEMES['obsidian-broadsheet']),
};

export function resolveBlogTheme(config: Partial<BlogConfig>, fallbackMode?: ThemeMode): BlogTheme {
  const mode: ThemeMode = config.themeMode || fallbackMode || 'light';
  const presetId = normalizeAstroTemplateId(config.astroTemplate, mode);
  const preset = EDITORIAL_THEMES[presetId];
  // If user toggled dark/light mode via Quick Toggle and it disagrees with the preset polarity,
  // honor the requested mode using the paired editorial theme.
  if (config.themeMode && preset.isDark !== (config.themeMode === 'dark')) {
    return AM_DUONG_THEMES[config.themeMode];
  }
  return toBlogTheme(preset);
}

export const DEFAULT_BLOG_CONFIG: BlogConfig = {
  siteTitle: 'Huyền Không Thư Quán',
  tagline:
    'Nhật ký nghiên cứu kỹ thuật, thiết kế hệ thống và những ghi chép tĩnh tại trên GitHub Pages.',
  siteIcon: './icon.svg',
  headerTitle: 'BlogVN',
  headerNavLinks: [],
  footerText: 'Xuất bản trực tiếp qua GitHub Pages & BlogVN.',
  footerLinks: [],
  authorName: 'Tác giả',
  authorBio:
    'Tác giả blog cá nhân chia sẻ ghi chép thực chiến, tiểu luận và góc nhìn dài hạn.',
  githubOwner: 'trungtin87',
  githubRepo: 'trungtin87.github.io',
  pagesUrl: 'https://trungtin87.github.io',
  themeMode: 'light',
  postsDirectory: '_posts',
  astroTemplate: 'newyorker-light',
  liveChat: DEFAULT_LIVE_CHAT_CONFIG,
};

export const COLLECTION_LABELS: Record<BlogCollection, { label: string; route: string }> = {
  bai_viet: { label: 'Bài viết', route: '/bai-viet' },
  du_an: { label: 'Dự án', route: '/du-an' },
  sach: { label: 'Sách', route: '/sach' },
  cua_hang: { label: 'Cửa hàng', route: '/cua-hang' },
};

export interface StarterTemplateItem {
  label: string;
  collection: BlogCollection;
  title: string;
  category: string;
  tags: string[];
  excerpt: string;
  markdownBody: string;
}

export const STARTER_TEMPLATES: StarterTemplateItem[] = [
  {
    label: 'Tiểu luận chuyên sâu (Essay)',
    collection: 'bai_viet',
    title: 'Nghệ thuật giữ tâm trí tĩnh tại giữa dòng tin tức hối hả',
    category: 'Văn hoá & Đời sống',
    tags: ['tieu-luan', 'tu-duy', 'doc-cham'],
    excerpt:
      'Một bài luận về giá trị của việc viết chậm, đọc sâu và xây dựng không gian xuất bản cá nhân độc lập khỏi thuật toán.',
    markdownBody: `## Khi trang viết trở về đúng nhịp thở

Trong một thế giới nơi mọi dòng suy nghĩ đều bị nén thành vài giây lướt qua, việc dành thời gian viết một bài tiểu luận trọn vẹn trở thành một hành động phản tư hiếm hoi.

## Ba nguyên tắc của một blog bền vững

1. **Tập trung vào câu chữ**: Mạch văn mạch lạc quan trọng hơn mọi hiệu ứng trình bày rườm rà.
2. **Lưu trữ trọn đời bằng Markdown**: Toàn bộ bài viết nằm trong kho Git cá nhân, dễ đọc sau hàng chục năm.
3. **Tôn trọng mắt người đọc**: Độ rộng cột vừa phải, khoảng trắng thoáng đãng và tương phản dễ chịu.

> Sự rõ ràng trong tư duy luôn bắt đầu từ những công cụ không gây xao nhãng.`,
  },
  {
    label: 'Phân tích & Góc nhìn (Opinion)',
    collection: 'bai_viet',
    title: 'Vì sao các tờ báo lớn đang quay lại bố cục chữ truyền thống?',
    category: 'Góc nhìn',
    tags: ['bao-chi', 'thiet-ke', 'xu-huong'],
    excerpt:
      'Nhìn từ The New Yorker, BBC đến The New York Times: cấu trúc tiêu điểm rõ ràng và chữ Serif đang lên ngôi trở lại.',
    markdownBody: `## Sức mạnh của hệ thống phân cấp thị giác

Một trang báo hay blog chất lượng không cần hàng chục hộp tiện ích phụ. Điều người đọc cần là biết ngay đâu là bài tiêu điểm, đâu là tin nhanh và bài viết này mất bao nhiêu phút để đọc.

### Hai yếu tố tạo nên sự tin cậy

- **Măng-sét (Masthead) dứt khoát**: Đặt tên ấn phẩm và tác giả làm trung tâm trang.
- **Đường kẻ chỉ mảnh**: Phân tách rạch ròi từng khối nội dung mà không gây nặng nề cho mắt.`,
  },
  {
    label: 'Ghi chép kỹ thuật (Tech Journal)',
    collection: 'bai_viet',
    title: 'Kiến trúc Blog tĩnh siêu nhẹ với Astro 5 và GitHub Pages',
    category: 'Kỹ thuật',
    tags: ['astro', 'markdown', 'github-pages'],
    excerpt:
      'Hướng dẫn tổ chức thư mục bài viết Markdown, tối ưu thẻ OpenGraph, Schema JSON-LD và RSS hoàn toàn tự động.',
    markdownBody: `## Bối cảnh triển khai

Khi xây dựng một blog cá nhân bằng Astro 5, toàn bộ mã HTML được biên dịch sẵn thành tệp tĩnh. Điều này giúp tốc độ tải gần như tức thì và hoàn toàn miễn phí hosting trên GitHub Pages.

## Điểm mấu chốt khi tối ưu SEO

- Thẻ \`BlogPosting\` JSON-LD được nhúng tự động trong phần đầu trang bài viết.
- Ảnh bìa có thể tải trực tiếp hoặc trích xuất độ phân giải cao từ liên kết video YouTube.
- Sitemap XML và RSS Feed cập nhật theo từng lần commit mới.`,
  },
  {
    label: 'Điểm sách & Ghi chú đọc (Notes)',
    collection: 'bai_viet',
    title: 'Ghi chú đọc sách: Nghệ thuật viết mạch lạc',
    category: 'Đọc sách',
    tags: ['doc-sach', 'viet-lach', 'ghi-chu'],
    excerpt:
      'Tóm tắt những nguyên tắc kinh điển giúp câu văn sắc gọn, tự nhiên và truyền tải chính xác ý tưởng của người viết.',
    markdownBody: `## Những bài học đọng lại

Cuốn sách phân tích lý do vì sao văn phong trực diện, câu ngắn và ví dụ cụ thể luôn tạo sức thuyết phục cao hơn ngôn từ hoa mỹ.

## Checklist trước khi bấm xuất bản

- Cắt bỏ những tính từ thừa thãi ở đoạn mở đầu.
- Đảm bảo tiêu đề hứa hẹn đúng điều bài viết giải quyết.
- Kiểm tra lại ảnh bìa và mô tả ngắn hiển thị trên Google Search.`,
  },
];
