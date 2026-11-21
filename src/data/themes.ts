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
  isMultiPage?: boolean;
  description: string;
  isDark: boolean;
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  palette: BlogTheme['palette'];
  palettes: {
    light: BlogTheme['palette'];
    dark: BlogTheme['palette'];
  };
}

export const EDITORIAL_THEME_ORDER: AstroTemplateId[] = [
  'newyorker-light',
  'nytimes-light',
  'bbc-dark',
  'obsidian-broadsheet',
  'espresso-salon',
  'monocle-magazine',
  'guardian-portal',
  'kyoto-folio',
  'economist-digest',
  'nordic-atlas',
];

const NEWYORKER_LIGHT_PALETTE: BlogTheme['palette'] = {
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
};

const NEWYORKER_DARK_PALETTE: BlogTheme['palette'] = {
  canvas: '#161411',
  surface: '#201D18',
  surfaceElevated: '#28241E',
  border: '#3A332A',
  textPrimary: '#F5EFE6',
  textSecondary: '#D8CFC2',
  textMuted: '#A19585',
  accent: '#FAF7F2',
  accentText: '#161411',
  link: '#F87171',
};

const NYTIMES_LIGHT_PALETTE: BlogTheme['palette'] = {
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
};

const NYTIMES_DARK_PALETTE: BlogTheme['palette'] = {
  canvas: '#0E1218',
  surface: '#161C26',
  surfaceElevated: '#1D2432',
  border: '#2C3548',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  accent: '#F8FAFC',
  accentText: '#0E1218',
  link: '#60A5FA',
};

const BBC_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#F6F7F9',
  surface: '#EBEDF2',
  surfaceElevated: '#FFFFFF',
  border: '#D4D7DF',
  textPrimary: '#111216',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  accent: '#E11D48',
  accentText: '#FFFFFF',
  link: '#BE123C',
};

const BBC_DARK_PALETTE: BlogTheme['palette'] = {
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
};

const OBSIDIAN_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#F3F6FB',
  surface: '#E6ECF5',
  surfaceElevated: '#FFFFFF',
  border: '#CBD5E1',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  accent: '#0F172A',
  accentText: '#FFFFFF',
  link: '#1D4ED8',
};

const OBSIDIAN_DARK_PALETTE: BlogTheme['palette'] = {
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
};

const ESPRESSO_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#FAF4EC',
  surface: '#F1E7DA',
  surfaceElevated: '#FFFFFF',
  border: '#DECDB9',
  textPrimary: '#261C15',
  textSecondary: '#4E3E31',
  textMuted: '#7D6A5A',
  accent: '#9A5B13',
  accentText: '#FFFFFF',
  link: '#B45309',
};

const ESPRESSO_DARK_PALETTE: BlogTheme['palette'] = {
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
};

const MONOCLE_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#F8F6F0',
  surface: '#EFECE3',
  surfaceElevated: '#FFFFFF',
  border: '#D7D0C3',
  textPrimary: '#1A1D1A',
  textSecondary: '#3D423D',
  textMuted: '#676E66',
  accent: '#14532D',
  accentText: '#F8F6F0',
  link: '#166534',
};

const MONOCLE_DARK_PALETTE: BlogTheme['palette'] = {
  canvas: '#111613',
  surface: '#19211C',
  surfaceElevated: '#212B25',
  border: '#2E3B33',
  textPrimary: '#F2F4F1',
  textSecondary: '#CED6CF',
  textMuted: '#92A096',
  accent: '#86EFAC',
  accentText: '#0F1A14',
  link: '#4ADE80',
};

const GUARDIAN_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#FFFFFF',
  surface: '#F3F5F8',
  surfaceElevated: '#FFFFFF',
  border: '#D5DCE6',
  textPrimary: '#121826',
  textSecondary: '#334155',
  textMuted: '#64748B',
  accent: '#0B2A5B',
  accentText: '#FFFFFF',
  link: '#B91C1C',
};

const GUARDIAN_DARK_PALETTE: BlogTheme['palette'] = {
  canvas: '#0B111E',
  surface: '#131C2E',
  surfaceElevated: '#1A253B',
  border: '#293754',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  accent: '#38BDF8',
  accentText: '#081221',
  link: '#F87171',
};

const KYOTO_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#FBF9F5',
  surface: '#F0ECE4',
  surfaceElevated: '#FFFFFF',
  border: '#DCD4C8',
  textPrimary: '#1C1917',
  textSecondary: '#44403C',
  textMuted: '#78716C',
  accent: '#9A3412',
  accentText: '#FBF9F5',
  link: '#9A3412',
};

const KYOTO_DARK_PALETTE: BlogTheme['palette'] = {
  canvas: '#161412',
  surface: '#211D1A',
  surfaceElevated: '#2A2521',
  border: '#3C352F',
  textPrimary: '#F5F2ED',
  textSecondary: '#D6D0C8',
  textMuted: '#A8A29E',
  accent: '#FDBA74',
  accentText: '#1C140F',
  link: '#FB923C',
};

const ECONOMIST_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#F7F8FA',
  surface: '#ECEEF3',
  surfaceElevated: '#FFFFFF',
  border: '#D1D5DB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  accent: '#B91C1C',
  accentText: '#FFFFFF',
  link: '#B91C1C',
};

const ECONOMIST_DARK_PALETTE: BlogTheme['palette'] = {
  canvas: '#101218',
  surface: '#181B24',
  surfaceElevated: '#202430',
  border: '#2E3445',
  textPrimary: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  accent: '#E11D48',
  accentText: '#FFFFFF',
  link: '#FB7185',
};

const NORDIC_LIGHT_PALETTE: BlogTheme['palette'] = {
  canvas: '#F2F6F7',
  surface: '#E4ECEE',
  surfaceElevated: '#FFFFFF',
  border: '#C6D4D8',
  textPrimary: '#0F1C21',
  textSecondary: '#2D4249',
  textMuted: '#5C737B',
  accent: '#0F766E',
  accentText: '#FFFFFF',
  link: '#0F766E',
};

const NORDIC_DARK_PALETTE: BlogTheme['palette'] = {
  canvas: '#0D1317',
  surface: '#141E24',
  surfaceElevated: '#1B2830',
  border: '#293B46',
  textPrimary: '#EDF2F4',
  textSecondary: '#C5D3D9',
  textMuted: '#889DA6',
  accent: '#2DD4BF',
  accentText: '#0A1416',
  link: '#2DD4BF',
};

export const EDITORIAL_THEMES: Record<AstroTemplateId, EditorialThemePreset> = {
  'newyorker-light': {
    id: 'newyorker-light',
    name: 'New Yorker Văn chương',
    inspiration: 'Cảm hứng The New Yorker',
    toneLabel: 'Sáng',
    layoutTag: 'Tạp chí tiểu luận',
    isMultiPage: false,
    description:
      'Nền giấy ngà ấm, măng-sét kẻ chỉ đôi cổ điển và chữ Serif thanh lịch dành cho bài luận chuyên sâu (hỗ trợ Sáng/Tối).',
    isDark: false,
    fonts: {
      display: "'Playfair Display', 'Fraunces', Georgia, serif",
      body: "'Lora', Georgia, serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: NEWYORKER_LIGHT_PALETTE,
    palettes: {
      light: NEWYORKER_LIGHT_PALETTE,
      dark: NEWYORKER_DARK_PALETTE,
    },
  },
  'nytimes-light': {
    id: 'nytimes-light',
    name: 'NYTimes Nhật báo',
    inspiration: 'Cảm hứng The New York Times',
    toneLabel: 'Sáng',
    layoutTag: 'Báo in đa cột',
    isMultiPage: false,
    description:
      'Bố cục báo in tiêu điểm kết hợp cột tin nhanh sắc sảo với đường kẻ 1px tinh tế (hỗ trợ Sáng/Tối).',
    isDark: false,
    fonts: {
      display: "'Fraunces', 'Playfair Display', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: NYTIMES_LIGHT_PALETTE,
    palettes: {
      light: NYTIMES_LIGHT_PALETTE,
      dark: NYTIMES_DARK_PALETTE,
    },
  },
  'bbc-dark': {
    id: 'bbc-dark',
    name: 'BBC Studio',
    inspiration: 'Cảm hứng BBC News',
    toneLabel: 'Tối',
    layoutTag: 'Lưới tin hiện đại',
    isMultiPage: false,
    description:
      'Phong cách phòng tin tương phản cao, điểm nhấn đỏ thẫm tôn vinh ảnh bìa & video (hỗ trợ Sáng/Tối).',
    isDark: true,
    fonts: {
      display: "'Plus Jakarta Sans', system-ui, sans-serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: BBC_DARK_PALETTE,
    palettes: {
      light: BBC_LIGHT_PALETTE,
      dark: BBC_DARK_PALETTE,
    },
  },
  'obsidian-broadsheet': {
    id: 'obsidian-broadsheet',
    name: 'Broadsheet Đêm',
    inspiration: 'Cảm hứng NYT Đêm',
    toneLabel: 'Tối',
    layoutTag: 'Nhật báo chuyên sâu',
    isMultiPage: false,
    description:
      'Tiêu đề Serif uy nghiêm kết hợp ánh xanh coban dễ đọc suốt nhiều giờ (hỗ trợ Sáng/Tối).',
    isDark: true,
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: OBSIDIAN_DARK_PALETTE,
    palettes: {
      light: OBSIDIAN_LIGHT_PALETTE,
      dark: OBSIDIAN_DARK_PALETTE,
    },
  },
  'espresso-salon': {
    id: 'espresso-salon',
    name: 'Salon Suy tư',
    inspiration: 'Cảm hứng Thư phòng',
    toneLabel: 'Tối',
    layoutTag: 'Đọc sâu ấm áp',
    isMultiPage: false,
    description:
      'Gam màu hổ phách & espresso ấm áp cùng chữ Serif êm dịu cho bài viết dài (hỗ trợ Sáng/Tối).',
    isDark: true,
    fonts: {
      display: "'Playfair Display', 'Fraunces', Georgia, serif",
      body: "'Lora', Georgia, serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: ESPRESSO_DARK_PALETTE,
    palettes: {
      light: ESPRESSO_LIGHT_PALETTE,
      dark: ESPRESSO_DARK_PALETTE,
    },
  },
  'monocle-magazine': {
    id: 'monocle-magazine',
    name: 'Monocle Đa trang',
    inspiration: 'Cảm hứng Tạp chí Monocle',
    toneLabel: 'Sáng',
    layoutTag: 'Nhiều trang · Tạp chí',
    isMultiPage: true,
    description:
      'Tạp chí nhiều trang với thanh điều hướng Chuyên mục, Lưu trữ, Giới thiệu, Liên hệ và phân khu chuyên đề rõ nét.',
    isDark: false,
    fonts: {
      display: "'Playfair Display', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: MONOCLE_LIGHT_PALETTE,
    palettes: {
      light: MONOCLE_LIGHT_PALETTE,
      dark: MONOCLE_DARK_PALETTE,
    },
  },
  'guardian-portal': {
    id: 'guardian-portal',
    name: 'Guardian Cổng tin',
    inspiration: 'Cảm hứng Tuần báo Đa chuyên trang',
    toneLabel: 'Sáng',
    layoutTag: 'Nhiều trang · Báo chí',
    isMultiPage: true,
    description:
      'Cổng tin nhiều trang chia khối chuyên mục độc lập, phân trang kho bài viết, danh bạ chủ đề và trang tác giả.',
    isDark: false,
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: GUARDIAN_LIGHT_PALETTE,
    palettes: {
      light: GUARDIAN_LIGHT_PALETTE,
      dark: GUARDIAN_DARK_PALETTE,
    },
  },
  'kyoto-folio': {
    id: 'kyoto-folio',
    name: 'Kyoto Triển lãm',
    inspiration: 'Cảm hứng Bảo tàng & Hồ sơ',
    toneLabel: 'Sáng',
    layoutTag: 'Nhiều trang · Lưu trữ',
    isMultiPage: true,
    description:
      'Giao diện hồ sơ triển lãm nhiều trang với chỉ mục đánh số, dòng thời gian lưu trữ theo năm và trang giới thiệu tinh tế.',
    isDark: false,
    fonts: {
      display: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
      body: "'Lora', Georgia, serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: KYOTO_LIGHT_PALETTE,
    palettes: {
      light: KYOTO_LIGHT_PALETTE,
      dark: KYOTO_DARK_PALETTE,
    },
  },
  'economist-digest': {
    id: 'economist-digest',
    name: 'Economist Chuyên san',
    inspiration: 'Cảm hứng Chuyên san Phân tích',
    toneLabel: 'Tối',
    layoutTag: 'Nhiều trang · Phân tích',
    isMultiPage: true,
    description:
      'Chuyên san tối màu nhiều trang kèm mục lục chuyên đề, phân trang kho dữ liệu bài viết và trang liên hệ biên tập.',
    isDark: true,
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: ECONOMIST_DARK_PALETTE,
    palettes: {
      light: ECONOMIST_LIGHT_PALETTE,
      dark: ECONOMIST_DARK_PALETTE,
    },
  },
  'nordic-atlas': {
    id: 'nordic-atlas',
    name: 'Nordic Atlas',
    inspiration: 'Cảm hứng Tạp chí Du ký Bắc Âu',
    toneLabel: 'Tối',
    layoutTag: 'Nhiều trang · Du ký',
    isMultiPage: true,
    description:
      'Tạp chí du ký & hồ sơ nhiều trang gam xanh băng dịu mắt, tách riêng trang Chuyên mục, Chủ đề, Lưu trữ và Tác giả.',
    isDark: true,
    fonts: {
      display: "'Plus Jakarta Sans', system-ui, sans-serif",
      body: "'Lora', Georgia, serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: NORDIC_DARK_PALETTE,
    palettes: {
      light: NORDIC_LIGHT_PALETTE,
      dark: NORDIC_DARK_PALETTE,
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
    raw === 'espresso-salon' ||
    raw === 'monocle-magazine' ||
    raw === 'guardian-portal' ||
    raw === 'kyoto-folio' ||
    raw === 'economist-digest' ||
    raw === 'nordic-atlas'
  ) {
    return raw;
  }
  if (raw === 'minimal') return 'newyorker-light';
  if (raw === 'editorial') return 'nytimes-light';
  if (raw === 'visual-grid') return 'bbc-dark';
  return fallbackMode === 'dark' ? 'obsidian-broadsheet' : 'newyorker-light';
}

export function toBlogTheme(preset: EditorialThemePreset, modeOverride?: ThemeMode): BlogTheme {
  const mode: ThemeMode = modeOverride || (preset.isDark ? 'dark' : 'light');
  const activePalette = preset.palettes[mode] || preset.palette;
  return {
    id: mode,
    name: preset.name,
    isDark: mode === 'dark',
    fonts: preset.fonts,
    palette: activePalette,
  };
}

export const AM_DUONG_THEMES: Record<ThemeMode, BlogTheme> = {
  light: toBlogTheme(EDITORIAL_THEMES['newyorker-light'], 'light'),
  dark: toBlogTheme(EDITORIAL_THEMES['newyorker-light'], 'dark'),
};

export function resolveBlogTheme(config: Partial<BlogConfig>, fallbackMode?: ThemeMode): BlogTheme {
  const requestedMode: ThemeMode | undefined = config.themeMode || fallbackMode;
  const presetId = normalizeAstroTemplateId(config.astroTemplate, requestedMode || 'light');
  const preset = EDITORIAL_THEMES[presetId];
  const effectiveMode: ThemeMode = requestedMode || (preset.isDark ? 'dark' : 'light');
  return toBlogTheme(preset, effectiveMode);
}

export const DEFAULT_BLOG_CONFIG: BlogConfig = {
  siteTitle: 'Đạo Ký',
  tagline:
    'Nhật ký nghiên cứu, tiểu luận và những ghi chép tĩnh tại xuất bản trên GitHub Pages.',
  siteIcon: './assets/aistudio/1794978557793_3b5d5cb0.png',
  headerTitle: 'Đạo Ký',
  headerNavLinks: [],
  footerText: 'Xuất bản trực tiếp qua GitHub Pages & Đạo Ký.',
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
