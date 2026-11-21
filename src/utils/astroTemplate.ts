import { dump as dumpYaml } from 'js-yaml';
import type { AstroTemplateId, BlogConfig, ThemeMode } from '../types/blog';

export interface AstroTemplatePresetMeta {
  id: AstroTemplateId;
  name: string;
  inspiration: string;
  toneLabel: 'Sáng' | 'Tối';
  badge: string;
  isDark: boolean;
  isMultiPage?: boolean;
  description: string;
}

export const ASTRO_TEMPLATE_PRESETS: AstroTemplatePresetMeta[] = [
  {
    id: 'newyorker-light',
    name: 'New Yorker Văn chương',
    inspiration: 'Cảm hứng The New Yorker',
    toneLabel: 'Sáng',
    badge: 'Sáng · Tiểu luận',
    isDark: false,
    isMultiPage: false,
    description:
      'Giấy ngà ấm (#FAF7F2), kẻ chỉ đôi thanh mảnh, tiêu đề Serif cổ điển (hỗ trợ Sáng/Tối).',
  },
  {
    id: 'nytimes-light',
    name: 'NYTimes Nhật báo',
    inspiration: 'Cảm hứng The New York Times',
    toneLabel: 'Sáng',
    badge: 'Sáng · Báo in',
    isDark: false,
    isMultiPage: false,
    description:
      'Nền trắng tinh khôi (#FFFFFF), bài tiêu điểm lớn cạnh cột tin nhanh, lưới nhật báo 1px (hỗ trợ Sáng/Tối).',
  },
  {
    id: 'bbc-dark',
    name: 'BBC Studio',
    inspiration: 'Cảm hứng BBC News',
    toneLabel: 'Tối',
    badge: 'Tối · Thời sự',
    isDark: true,
    isMultiPage: false,
    description:
      'Than chì studio (#121214), điểm nhấn đỏ thẫm, lưới đa bài viết hiện đại tôn vinh ảnh bìa (hỗ trợ Sáng/Tối).',
  },
  {
    id: 'obsidian-broadsheet',
    name: 'Broadsheet Đêm',
    inspiration: 'Cảm hứng NYT Đêm',
    toneLabel: 'Tối',
    badge: 'Tối · Nhật báo',
    isDark: true,
    isMultiPage: false,
    description:
      'Mực đêm xanh thẫm (#0B0D12), tiêu đề Serif uy nghiêm và ánh xanh coban dịu mắt (hỗ trợ Sáng/Tối).',
  },
  {
    id: 'espresso-salon',
    name: 'Salon Suy tư',
    inspiration: 'Cảm hứng Thư phòng Đêm',
    toneLabel: 'Tối',
    badge: 'Tối · Đọc sâu',
    isDark: true,
    isMultiPage: false,
    description:
      'Nền gỗ espresso ấm áp (#161210), điểm nhấn hổ phách dịu nhẹ cho bài viết dài (hỗ trợ Sáng/Tối).',
  },
  {
    id: 'monocle-magazine',
    name: 'Monocle Đa trang',
    inspiration: 'Cảm hứng Tạp chí Monocle',
    toneLabel: 'Sáng',
    badge: 'Nhiều trang · Tạp chí',
    isDark: false,
    isMultiPage: true,
    description:
      'Tạp chí nhiều trang gam kem xanh rừng (#F8F6F0), đầy đủ trang Chuyên mục, Chủ đề, Lưu trữ, Giới thiệu & Liên hệ.',
  },
  {
    id: 'guardian-portal',
    name: 'Guardian Cổng tin',
    inspiration: 'Cảm hứng Tuần báo Đa chuyên trang',
    toneLabel: 'Sáng',
    badge: 'Nhiều trang · Báo chí',
    isDark: false,
    isMultiPage: true,
    description:
      'Cổng tin nhiều trang xanh navy (#FFFFFF / #0B2A5B), phân chia khối chuyên mục độc lập và phân trang kho bài.',
  },
  {
    id: 'kyoto-folio',
    name: 'Kyoto Triển lãm',
    inspiration: 'Cảm hứng Bảo tàng & Hồ sơ',
    toneLabel: 'Sáng',
    badge: 'Nhiều trang · Lưu trữ',
    isDark: false,
    isMultiPage: true,
    description:
      'Hồ sơ triển lãm nhiều trang giấy washi (#FBF9F5) với mục lục đánh số, dòng thời gian lưu trữ và trang tác giả.',
  },
  {
    id: 'economist-digest',
    name: 'Economist Chuyên san',
    inspiration: 'Cảm hứng Chuyên san Phân tích',
    toneLabel: 'Tối',
    badge: 'Nhiều trang · Phân tích',
    isDark: true,
    isMultiPage: true,
    description:
      'Chuyên san phân tích tối màu (#101218), điểm nhấn đỏ thẫm cùng đầy đủ trang Chuyên mục, Chủ đề và Lưu trữ.',
  },
  {
    id: 'nordic-atlas',
    name: 'Nordic Atlas',
    inspiration: 'Cảm hứng Tạp chí Du ký Bắc Âu',
    toneLabel: 'Tối',
    badge: 'Nhiều trang · Du ký',
    isDark: true,
    isMultiPage: true,
    description:
      'Tạp chí du ký nhiều trang gam xanh băng đêm (#0D1317), phân tách rõ trang Chuyên mục, Chủ đề, Lưu trữ và Liên hệ.',
  },
];

export function isMultiPageTemplate(id?: string | null): boolean {
  return (
    id === 'monocle-magazine' ||
    id === 'guardian-portal' ||
    id === 'kyoto-folio' ||
    id === 'economist-digest' ||
    id === 'nordic-atlas'
  );
}

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

interface ThemeTokenPair {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  text2: string;
  muted: string;
  accent: string;
  accentText: string;
  link: string;
  fontDisplay: string;
  fontBody: string;
}

const TEMPLATE_DUAL_TOKENS: Record<
  AstroTemplateId,
  { light: ThemeTokenPair; dark: ThemeTokenPair }
> = {
  'newyorker-light': {
    light: {
      bg: '#FAF7F2',
      surface: '#F2EDE4',
      card: '#FFFFFF',
      border: '#DDD5C7',
      text: '#141414',
      text2: '#3A352E',
      muted: '#6E665A',
      accent: '#141414',
      accentText: '#FAF7F2',
      link: '#B91C1C',
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
    },
    dark: {
      bg: '#161411',
      surface: '#201D18',
      card: '#28241E',
      border: '#3A332A',
      text: '#F5EFE6',
      text2: '#D8CFC2',
      muted: '#A19585',
      accent: '#FAF7F2',
      accentText: '#161411',
      link: '#F87171',
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
    },
  },
  'nytimes-light': {
    light: {
      bg: '#FFFFFF',
      surface: '#F5F6F8',
      card: '#FFFFFF',
      border: '#D4D4D8',
      text: '#0F172A',
      text2: '#334155',
      muted: '#64748B',
      accent: '#0F172A',
      accentText: '#FFFFFF',
      link: '#1E3A8A',
      fontDisplay: "'Fraunces', 'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
    dark: {
      bg: '#0E1218',
      surface: '#161C26',
      card: '#1D2432',
      border: '#2C3548',
      text: '#F8FAFC',
      text2: '#CBD5E1',
      muted: '#94A3B8',
      accent: '#F8FAFC',
      accentText: '#0E1218',
      link: '#60A5FA',
      fontDisplay: "'Fraunces', 'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
  },
  'bbc-dark': {
    light: {
      bg: '#F6F7F9',
      surface: '#EBEDF2',
      card: '#FFFFFF',
      border: '#D4D7DF',
      text: '#111216',
      text2: '#374151',
      muted: '#6B7280',
      accent: '#E11D48',
      accentText: '#FFFFFF',
      link: '#BE123C',
      fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
    dark: {
      bg: '#121214',
      surface: '#1A1B1F',
      card: '#22242A',
      border: '#2E313A',
      text: '#F4F4F5',
      text2: '#D4D4D8',
      muted: '#A1A1AA',
      accent: '#E11D48',
      accentText: '#FFFFFF',
      link: '#FB7185',
      fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
  },
  'obsidian-broadsheet': {
    light: {
      bg: '#F3F6FB',
      surface: '#E6ECF5',
      card: '#FFFFFF',
      border: '#CBD5E1',
      text: '#0F172A',
      text2: '#334155',
      muted: '#64748B',
      accent: '#0F172A',
      accentText: '#FFFFFF',
      link: '#1D4ED8',
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
    dark: {
      bg: '#0B0D12',
      surface: '#131722',
      card: '#1A1F2E',
      border: '#273043',
      text: '#F3F4F6',
      text2: '#CBD5E1',
      muted: '#94A3B8',
      accent: '#F3F4F6',
      accentText: '#0B0D12',
      link: '#60A5FA',
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
  },
  'espresso-salon': {
    light: {
      bg: '#FAF4EC',
      surface: '#F1E7DA',
      card: '#FFFFFF',
      border: '#DECDB9',
      text: '#261C15',
      text2: '#4E3E31',
      muted: '#7D6A5A',
      accent: '#9A5B13',
      accentText: '#FFFFFF',
      link: '#B45309',
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
    },
    dark: {
      bg: '#161210',
      surface: '#201A17',
      card: '#29221E',
      border: '#3B312B',
      text: '#F5EFE6',
      text2: '#D6CBC0',
      muted: '#A39589',
      accent: '#E5A93C',
      accentText: '#161210',
      link: '#FBBF24',
      fontDisplay: "'Playfair Display', 'Fraunces', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
    },
  },
  'monocle-magazine': {
    light: {
      bg: '#F8F6F0',
      surface: '#EFECE3',
      card: '#FFFFFF',
      border: '#D7D0C3',
      text: '#1A1D1A',
      text2: '#3D423D',
      muted: '#676E66',
      accent: '#14532D',
      accentText: '#F8F6F0',
      link: '#166534',
      fontDisplay: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
    dark: {
      bg: '#111613',
      surface: '#19211C',
      card: '#212B25',
      border: '#2E3B33',
      text: '#F2F4F1',
      text2: '#CED6CF',
      muted: '#92A096',
      accent: '#86EFAC',
      accentText: '#0F1A14',
      link: '#4ADE80',
      fontDisplay: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
  },
  'guardian-portal': {
    light: {
      bg: '#FFFFFF',
      surface: '#F3F5F8',
      card: '#FFFFFF',
      border: '#D5DCE6',
      text: '#121826',
      text2: '#334155',
      muted: '#64748B',
      accent: '#0B2A5B',
      accentText: '#FFFFFF',
      link: '#B91C1C',
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
    dark: {
      bg: '#0B111E',
      surface: '#131C2E',
      card: '#1A253B',
      border: '#293754',
      text: '#F8FAFC',
      text2: '#CBD5E1',
      muted: '#94A3B8',
      accent: '#38BDF8',
      accentText: '#081221',
      link: '#F87171',
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
  },
  'kyoto-folio': {
    light: {
      bg: '#FBF9F5',
      surface: '#F0ECE4',
      card: '#FFFFFF',
      border: '#DCD4C8',
      text: '#1C1917',
      text2: '#44403C',
      muted: '#78716C',
      accent: '#9A3412',
      accentText: '#FBF9F5',
      link: '#9A3412',
      fontDisplay: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
    },
    dark: {
      bg: '#161412',
      surface: '#211D1A',
      card: '#2A2521',
      border: '#3C352F',
      text: '#F5F2ED',
      text2: '#D6D0C8',
      muted: '#A8A29E',
      accent: '#FDBA74',
      accentText: '#1C140F',
      link: '#FB923C',
      fontDisplay: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
      fontBody: "'Lora', Georgia, serif",
    },
  },
  'economist-digest': {
    light: {
      bg: '#F7F8FA',
      surface: '#ECEEF3',
      card: '#FFFFFF',
      border: '#D1D5DB',
      text: '#111827',
      text2: '#374151',
      muted: '#6B7280',
      accent: '#B91C1C',
      accentText: '#FFFFFF',
      link: '#B91C1C',
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
    dark: {
      bg: '#101218',
      surface: '#181B24',
      card: '#202430',
      border: '#2E3445',
      text: '#F3F4F6',
      text2: '#D1D5DB',
      muted: '#9CA3AF',
      accent: '#E11D48',
      accentText: '#FFFFFF',
      link: '#FB7185',
      fontDisplay: "'Fraunces', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    },
  },
  'nordic-atlas': {
    light: {
      bg: '#F2F6F7',
      surface: '#E4ECEE',
      card: '#FFFFFF',
      border: '#C6D4D8',
      text: '#0F1C21',
      text2: '#2D4249',
      muted: '#5C737B',
      accent: '#0F766E',
      accentText: '#FFFFFF',
      link: '#0F766E',
      fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      fontBody: "'Lora', Georgia, serif",
    },
    dark: {
      bg: '#0D1317',
      surface: '#141E24',
      card: '#1B2830',
      border: '#293B46',
      text: '#EDF2F4',
      text2: '#C5D3D9',
      muted: '#889DA6',
      accent: '#2DD4BF',
      accentText: '#0A1416',
      link: '#2DD4BF',
      fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      fontBody: "'Lora', Georgia, serif",
    },
  },
};

function escapeSingleQuote(val: string): string {
  return String(val || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isBundledDefaultIcon(rawIcon: string): boolean {
  const clean = rawIcon.trim();
  return (
    !clean ||
    clean === './icon.svg' ||
    clean === '/icon.svg' ||
    clean.includes('1794978557793_3b5d5cb0.png') ||
    clean === './pwa-192x192.png' ||
    clean === '/pwa-192x192.png'
  );
}

export function buildAstroSiteConfigModule(params: {
  owner: string;
  repo: string;
  config: Partial<BlogConfig>;
  templateId?: AstroTemplateId | string;
  hasBundledPngFavicon?: boolean;
}): string {
  const { owner, repo, config, hasBundledPngFavicon = false } = params;
  const requestedMode: ThemeMode | undefined =
    config.themeMode === 'dark' ? 'dark' : config.themeMode === 'light' ? 'light' : undefined;
  const templateStyle = normalizeAstroTemplateId(
    params.templateId || config.astroTemplate,
    requestedMode || 'light'
  );
  const presetMeta =
    ASTRO_TEMPLATE_PRESETS.find((p) => p.id === templateStyle) || ASTRO_TEMPLATE_PRESETS[0];
  const resolvedMode: ThemeMode = requestedMode || (presetMeta.isDark ? 'dark' : 'light');
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const cleanCustomDomain = (config.customDomain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
  const defaultPagesUrl = cleanCustomDomain
    ? `https://${cleanCustomDomain}`
    : isUserSite
    ? `https://${repo}`
    : `https://${owner}.github.io/${repo}`;

  const rawIcon = (config.siteIcon || '').trim();
  const usePngFavicon = rawIcon.startsWith('data:image/') || (hasBundledPngFavicon && isBundledDefaultIcon(rawIcon));
  const normalizedIcon = usePngFavicon
    ? '/favicon.png'
    : isBundledDefaultIcon(rawIcon)
    ? '/favicon.svg'
    : rawIcon;

  const siteCfg = {
    siteTitle: (config.siteTitle || repo || 'Đạo Ký').trim(),
    tagline: (
      config.tagline ||
      `Nhật ký chia sẻ góc nhìn, tiểu luận và ghi chép cá nhân của ${config.authorName || owner}.`
    ).trim(),
    siteIcon: normalizedIcon,
    headerTitle: (config.headerTitle || config.siteTitle || 'Đạo Ký').trim(),
    headerNavLinks: Array.isArray(config.headerNavLinks)
      ? config.headerNavLinks.filter((l) => l?.label?.trim() && l?.url?.trim())
      : [],
    footerText: (
      config.footerText ||
      `© ${new Date().getFullYear()} ${(config.siteTitle || repo || 'Đạo Ký').trim()} · Ấn phẩm blog cá nhân.`
    ).trim(),
    footerLinks: Array.isArray(config.footerLinks)
      ? config.footerLinks.filter((l) => l?.label?.trim() && l?.url?.trim())
      : [],
    authorName: (config.authorName || owner || 'Tác giả').trim(),
    authorBio: (
      config.authorBio ||
      'Tác giả blog cá nhân chia sẻ bài viết, quan điểm và ghi chép dài hạn.'
    ).trim(),
    themeMode: resolvedMode,
    templateStyle,
    isMultiPage: isMultiPageTemplate(templateStyle),
    pagesUrl: cleanCustomDomain
      ? `https://${cleanCustomDomain}`
      : (config.pagesUrl || defaultPagesUrl).trim().replace(/\/+$/, ''),
    customDomain: cleanCustomDomain,
    analyticsProvider: config.analyticsProvider || 'none',
    analyticsId: (config.analyticsId || '').trim(),
    giscus: config.giscus
      ? {
          enabled: Boolean(config.giscus.enabled),
          repo: (config.giscus.repo || '').trim(),
          repoId: (config.giscus.repoId || '').trim(),
          category: (config.giscus.category || 'Announcements').trim(),
          categoryId: (config.giscus.categoryId || '').trim(),
        }
      : { enabled: false, repo: '', repoId: '', category: 'Announcements', categoryId: '' },
    liveChat: config.liveChat
      ? {
          enabled: Boolean(config.liveChat.enabled),
          title: (config.liveChat.title || 'Trò chuyện với tác giả').trim(),
          welcomeText: (config.liveChat.welcomeText || 'Chọn kênh liên hệ trực tiếp bên dưới.').trim(),
          channels: Array.isArray(config.liveChat.channels)
            ? config.liveChat.channels
                .filter((ch) => ch && ch.id && typeof ch.value === 'string')
                .map((ch) => ({
                  id: ch.id,
                  enabled: Boolean(ch.enabled),
                  value: ch.value.trim(),
                  label: ch.label ? String(ch.label).trim() : undefined,
                }))
            : [],
        }
      : { enabled: false, title: 'Trò chuyện với tác giả', welcomeText: '', channels: [] },
  };

  return `export interface SiteLink {
  label: string;
  url: string;
}

export interface LiveChatChannel {
  id: 'messenger' | 'zalo' | 'telegram' | 'whatsapp' | 'tawkto' | 'crisp' | 'email';
  enabled: boolean;
  value: string;
  label?: string;
}

export interface LiveChatSettings {
  enabled: boolean;
  title?: string;
  welcomeText?: string;
  channels: LiveChatChannel[];
}

export interface GiscusSettings {
  enabled: boolean;
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

export type AstroTemplateStyle =
  | 'newyorker-light'
  | 'nytimes-light'
  | 'bbc-dark'
  | 'obsidian-broadsheet'
  | 'espresso-salon'
  | 'monocle-magazine'
  | 'guardian-portal'
  | 'kyoto-folio'
  | 'economist-digest'
  | 'nordic-atlas';

export interface SiteIdentityConfig {
  siteTitle: string;
  tagline: string;
  siteIcon: string;
  headerTitle: string;
  headerNavLinks: SiteLink[];
  footerText: string;
  footerLinks: SiteLink[];
  authorName: string;
  authorBio: string;
  themeMode: 'light' | 'dark';
  templateStyle: AstroTemplateStyle;
  isMultiPage: boolean;
  pagesUrl: string;
  customDomain?: string;
  analyticsProvider?: 'none' | 'ga4' | 'cloudflare' | 'plausible' | 'umami';
  analyticsId?: string;
  giscus?: GiscusSettings;
  liveChat?: LiveChatSettings;
}

export const SITE_CONFIG: SiteIdentityConfig = ${JSON.stringify(siteCfg, null, 2)};
`;
}

export function buildVietnameseAstroTemplateFiles(params: {
  owner: string;
  repo: string;
  config: Partial<BlogConfig>;
  templateId?: AstroTemplateId | string;
  includeStarterPosts?: boolean;
  defaultFaviconPngBase64?: string;
}): Array<{ path: string; content: string; isBase64?: boolean }> {
  const {
    owner,
    repo,
    config,
    includeStarterPosts = true,
    defaultFaviconPngBase64,
  } = params;
  const requestedMode: ThemeMode | undefined =
    config.themeMode === 'dark' ? 'dark' : config.themeMode === 'light' ? 'light' : undefined;
  const templateStyle = normalizeAstroTemplateId(
    params.templateId || config.astroTemplate,
    requestedMode || 'light'
  );
  const presetMeta =
    ASTRO_TEMPLATE_PRESETS.find((p) => p.id === templateStyle) || ASTRO_TEMPLATE_PRESETS[0];
  const resolvedMode: ThemeMode = requestedMode || (presetMeta.isDark ? 'dark' : 'light');
  const tokens = TEMPLATE_DUAL_TOKENS[templateStyle][resolvedMode];

  const siteTitle = (config.siteTitle || repo || 'Đạo Ký').trim();
  const tagline = (
    config.tagline ||
    'Ghi chép cá nhân, bài luận chuyên sâu và góc nhìn tĩnh tại.'
  ).trim();
  const headerBrand = (config.headerTitle || siteTitle).trim();
  const authorName = (config.authorName || owner || 'Tác giả').trim();
  const today = new Date().toISOString().slice(0, 10);
  const dayOffsetStr = (daysAgo: number) => {
    const d = new Date(Date.now() - daysAgo * 86400_000);
    return d.toISOString().slice(0, 10);
  };
  const rawIcon = (config.siteIcon || '').trim();
  const hasDataIcon = rawIcon.startsWith('data:image/');
  const hasBundledPngFavicon = Boolean(
    hasDataIcon || (defaultFaviconPngBase64 && isBundledDefaultIcon(rawIcon))
  );
  const faviconPngBase64 = hasDataIcon
    ? rawIcon.replace(/^data:[^;]+;base64,/, '')
    : defaultFaviconPngBase64 && isBundledDefaultIcon(rawIcon)
    ? defaultFaviconPngBase64.replace(/^data:[^;]+;base64,/, '')
    : undefined;
  const cleanCustomDomain = (config.customDomain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '');
  const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`;
  const defaultPagesUrl = cleanCustomDomain
    ? `https://${cleanCustomDomain}`
    : isUserSite
    ? `https://${repo}`
    : `https://${owner}.github.io/${repo}`;

  const persistedConfig: Partial<BlogConfig> = {
    ...config,
    siteTitle,
    tagline,
    headerTitle: headerBrand,
    authorName,
    githubOwner: owner,
    githubRepo: repo,
    customDomain: cleanCustomDomain || undefined,
    pagesUrl: cleanCustomDomain
      ? `https://${cleanCustomDomain}`
      : (config.pagesUrl || defaultPagesUrl).trim().replace(/\/+$/, ''),
    postsDirectory: 'src/content/bai_viet',
    themeMode: resolvedMode,
    astroTemplate: templateStyle,
  };

  const gitignore = `node_modules/
/dist/
/.astro/
.DS_Store
*.log
.env*
`;

  const packageJson = JSON.stringify(
    {
      name: `daoky-astro-${repo.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'site'}`,
      type: 'module',
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'astro dev',
        build: 'astro build',
        preview: 'astro preview',
      },
      dependencies: {
        astro: '^5.7.13',
      },
    },
    null,
    2
  ) + '\n';

  const tsconfigJson = JSON.stringify(
    {
      extends: 'astro/tsconfigs/strict',
      include: ['.astro/types.d.ts', '**/*'],
      exclude: ['dist'],
    },
    null,
    2
  ) + '\n';

  const astroConfigMjs = `import { defineConfig } from 'astro/config';

const repoOwner = process.env.GITHUB_REPOSITORY_OWNER || '${escapeSingleQuote(owner)}';
const repoFull = process.env.GITHUB_REPOSITORY || '${escapeSingleQuote(owner)}/${escapeSingleQuote(repo)}';
const repoName = repoFull.split('/')[1] || '${escapeSingleQuote(repo)}';
const customDomain = '${escapeSingleQuote(cleanCustomDomain)}';
const isUserSite =
  Boolean(customDomain) ||
  (Boolean(repoName && repoOwner) &&
    repoName.toLowerCase() === \`\${repoOwner.toLowerCase()}.github.io\`);

const site =
  process.env.SITE_URL ||
  (customDomain
    ? \`https://\${customDomain}\`
    : repoOwner
    ? \`https://\${repoOwner}.github.io\`
    : '${escapeSingleQuote(defaultPagesUrl)}');
const base =
  process.env.BASE_PATH ||
  (customDomain || isUserSite || !repoName ? '/' : \`/\${repoName}\`);

const CALLOUT_LABELS = {
  note: 'Ghi chú',
  tip: 'Mẹo hay',
  important: 'Quan trọng',
  warning: 'Cảnh báo',
  caution: 'Lưu ý',
  info: 'Thông tin',
};

function escapeHtmlBasic(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractVideoEmbed(rawUrl) {
  const str = String(rawUrl || '').trim();
  const ytMatch = str.match(
    /(?:youtube\\.com\\/(?:watch\\?v=|shorts\\/|embed\\/)|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return (
      '<div class="dk-video-embed"><iframe src="https://www.youtube.com/embed/' +
      ytMatch[1] +
      '" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
    );
  }
  const vmMatch = str.match(/vimeo\\.com\\/(?:video\\/)?(\\d{5,12})/i);
  if (vmMatch && vmMatch[1]) {
    return (
      '<div class="dk-video-embed"><iframe src="https://player.vimeo.com/video/' +
      vmMatch[1] +
      '" title="Vimeo video" loading="lazy" allowfullscreen></iframe></div>'
    );
  }
  return null;
}

function remarkDaoKyEnhancements() {
  const cleanBase = base === '/' ? '' : base.replace(/\\/+$/, '');
  const rewriteSrc = (val) => {
    if (typeof val !== 'string' || !cleanBase) return val;
    if (
      (val.startsWith('/tainguyen/') || val.startsWith('/images/')) &&
      !val.startsWith(cleanBase + '/')
    ) {
      return cleanBase + val;
    }
    return val;
  };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'image') {
      if (typeof node.url === 'string') {
        node.url = rewriteSrc(node.url);
      }
      node.data = node.data || {};
      node.data.hProperties = {
        ...(node.data.hProperties || {}),
        loading: 'lazy',
        decoding: 'async',
      };
    }
    if (node.type === 'code' && String(node.lang || '').toLowerCase() === 'mermaid') {
      node.type = 'html';
      node.value = '<div class="dk-mermaid-box"><pre class="mermaid">' + escapeHtmlBasic(node.value) + '</pre></div>';
      delete node.lang;
      return;
    }
    if (node.type === 'blockquote' && Array.isArray(node.children) && node.children.length > 0) {
      const firstPara = node.children[0];
      if (firstPara && firstPara.type === 'paragraph' && Array.isArray(firstPara.children) && firstPara.children.length > 0) {
        const firstText = firstPara.children[0];
        if (firstText && firstText.type === 'text' && typeof firstText.value === 'string') {
          const m = firstText.value.match(/^\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO)\\]([^\\n]*)(\\n[\\s\\S]*)?$/i);
          if (m) {
            const cType = m[1].toLowerCase();
            const customTitle = (m[2] || '').trim() || CALLOUT_LABELS[cType] || cType.toUpperCase();
            const rest = (m[3] || '').replace(/^\\n+/, '');
            node.data = node.data || {};
            node.data.hProperties = {
              ...(node.data.hProperties || {}),
              class: 'dk-callout dk-callout-' + cType,
              'data-callout': cType,
            };
            firstText.value = rest;
            firstPara.children.unshift({
              type: 'html',
              value: '<span class="dk-callout-title">' + escapeHtmlBasic(customTitle) + '</span>',
            });
          }
        }
      }
    }
    if (node.type === 'paragraph' && Array.isArray(node.children) && node.children.length === 1) {
      const only = node.children[0];
      let candidate = '';
      if (only.type === 'text' && typeof only.value === 'string') {
        const macro = only.value.trim().match(/^@\\[(youtube|vimeo)\\]\\(([^)]+)\\)$/i);
        if (macro) {
          const kind = macro[1].toLowerCase();
          const arg = macro[2].trim();
          candidate =
            kind === 'youtube' && !arg.includes('http')
              ? 'https://www.youtube.com/watch?v=' + arg
              : kind === 'vimeo' && !arg.includes('http')
              ? 'https://vimeo.com/' + arg
              : arg;
        } else if (/^https?:\\/\\/(?:www\\.)?(?:youtube\\.com|youtu\\.be|vimeo\\.com)\\/\\S+$/i.test(only.value.trim())) {
          candidate = only.value.trim();
        }
      } else if (only.type === 'link' && typeof only.url === 'string' && /^https?:\\/\\/(?:www\\.)?(?:youtube\\.com|youtu\\.be|vimeo\\.com)\\/\\S+$/i.test(only.url)) {
        candidate = only.url;
      }
      if (candidate) {
        const embedHtml = extractVideoEmbed(candidate);
        if (embedHtml) {
          node.type = 'html';
          node.value = embedHtml;
          delete node.children;
          return;
        }
      }
    }
    if (node.type === 'html' && typeof node.value === 'string' && cleanBase) {
      node.value = node.value.replace(
        /(src=["'])(\\/(?:tainguyen|images)\\/[^"']+)(["'])/gi,
        (_m, p, rel, s) => p + rewriteSrc(rel) + s
      );
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  };
  return (tree) => walk(tree);
}

export default defineConfig({
  site,
  base,
  output: 'static',
  markdown: {
    remarkPlugins: [remarkDaoKyEnhancements],
  },
});
`;

  const deployWorkflowYml = `name: Build & Deploy Astro Blog (Đạo Ký)

on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm install --no-audit --no-fund

      - name: Configure Pages
        id: pages
        continue-on-error: true
        uses: actions/configure-pages@v5

      - name: Build Astro static site
        env:
          SITE_URL: \${{ steps.pages.outputs.origin || format('https://{0}.github.io', github.repository_owner) }}
          BASE_PATH: \${{ steps.pages.outputs.base_path != '' && steps.pages.outputs.base_path || (github.event.repository.name == format('{0}.github.io', github.repository_owner) && '/' || format('/{0}', github.event.repository.name)) }}
        run: npx astro build

      - name: Ensure .nojekyll
        run: touch dist/.nojekyll

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="30" fill="#FAF7F2" stroke="#141414" stroke-width="4.5" stroke-dasharray="165 18" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="24" fill="none" stroke="#141414" stroke-width="1.2" opacity="0.35"/>
  <text x="32" y="38" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="22" fill="#141414">${(headerBrand[0] || 'Đ').toUpperCase()}</text>
</svg>
`;

  const escXml = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const wrapSvgTextLines = (raw: string, maxChars = 28, maxLines = 2): string[] => {
    const words = String(raw || '').trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = w;
        if (lines.length >= maxLines) break;
      }
    }
    if (current && lines.length < maxLines) {
      lines.push(current);
    }
    if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(4, maxChars - 1)) + '…';
    }
    return lines.length > 0 ? lines : ['Đạo Ký'];
  };

  const buildCoverSvg = (
    index: number,
    totalCovers: number,
    kicker: string,
    headline: string
  ): string => {
    const headlineLines = wrapSvgTextLines(headline, 26, 2);
    const safeKicker = escXml(kicker.toUpperCase());
    const safeBrand = escXml(siteTitle.slice(0, 32));
    const motifByTemplate: Record<AstroTemplateId, string> = {
      'newyorker-light': `
        <rect x="44" y="44" width="1112" height="542" fill="none" stroke="${tokens.border}" stroke-width="2"/>
        <rect x="54" y="54" width="1092" height="522" fill="none" stroke="${tokens.border}" stroke-width="1"/>
        <circle cx="960" cy="240" r="120" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <path d="M900 295 Q960 170 1020 295" fill="none" stroke="${tokens.link}" stroke-width="3"/>
        <circle cx="960" cy="215" r="24" fill="${tokens.accent}" opacity="0.88"/>`,
      'nytimes-light': `
        <line x1="72" y1="88" x2="1128" y2="88" stroke="${tokens.text}" stroke-width="3"/>
        <line x1="72" y1="96" x2="1128" y2="96" stroke="${tokens.border}" stroke-width="1"/>
        <rect x="760" y="136" width="368" height="320" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <line x1="790" y1="184" x2="1098" y2="184" stroke="${tokens.link}" stroke-width="4"/>
        <line x1="790" y1="224" x2="1060" y2="224" stroke="${tokens.border}" stroke-width="2"/>
        <line x1="790" y1="254" x2="1020" y2="254" stroke="${tokens.border}" stroke-width="2"/>
        <line x1="790" y1="284" x2="1080" y2="284" stroke="${tokens.border}" stroke-width="2"/>`,
      'bbc-dark': `
        <rect x="0" y="0" width="1200" height="10" fill="${tokens.accent}"/>
        <rect x="750" y="120" width="380" height="240" rx="14" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="2"/>
        <polygon points="920,205 920,275 980,240" fill="${tokens.accent}"/>
        <rect x="88" y="420" width="140" height="6" fill="${tokens.accent}"/>`,
      'obsidian-broadsheet': `
        <defs>
          <pattern id="grid-${index}" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${tokens.border}" stroke-width="0.8" opacity="0.45"/>
          </pattern>
        </defs>
        <rect x="64" y="64" width="1072" height="502" fill="url(#grid-${index})" stroke="${tokens.border}" stroke-width="1.5"/>
        <circle cx="960" cy="250" r="110" fill="none" stroke="${tokens.link}" stroke-width="2" opacity="0.65"/>
        <circle cx="960" cy="250" r="64" fill="none" stroke="${tokens.link}" stroke-width="1.5" stroke-dasharray="8 6"/>
        <circle cx="960" cy="250" r="12" fill="${tokens.link}"/>`,
      'espresso-salon': `
        <radialGradient id="lamp-${index}" cx="78%" cy="32%" r="48%">
          <stop offset="0%" stop-color="${tokens.link}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${tokens.bg}" stop-opacity="0"/>
        </radialGradient>
        <rect width="1200" height="630" fill="url(#lamp-${index})"/>
        <circle cx="940" cy="220" r="95" fill="none" stroke="${tokens.link}" stroke-width="1.5" opacity="0.5"/>
        <path d="M845 310 C890 250, 990 250, 1035 310" fill="none" stroke="${tokens.accent}" stroke-width="2.5"/>`,
      'monocle-magazine': `
        <rect x="0" y="0" width="1200" height="14" fill="${tokens.accent}"/>
        <rect x="56" y="64" width="1088" height="502" fill="none" stroke="${tokens.border}" stroke-width="1.5"/>
        <rect x="780" y="128" width="300" height="310" rx="8" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <circle cx="930" cy="240" r="68" fill="none" stroke="${tokens.accent}" stroke-width="2.5"/>
        <circle cx="930" cy="240" r="18" fill="${tokens.accent}"/>
        <line x1="820" y1="365" x2="1040" y2="365" stroke="${tokens.border}" stroke-width="2"/>`,
      'guardian-portal': `
        <rect x="0" y="0" width="1200" height="12" fill="${tokens.accent}"/>
        <rect x="760" y="100" width="368" height="150" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <rect x="760" y="276" width="174" height="164" fill="${tokens.accent}" opacity="0.14" stroke="${tokens.border}" stroke-width="1.5"/>
        <rect x="954" y="276" width="174" height="164" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <line x1="90" y1="108" x2="260" y2="108" stroke="${tokens.link}" stroke-width="5"/>`,
      'kyoto-folio': `
        <rect x="44" y="44" width="1112" height="542" fill="none" stroke="${tokens.border}" stroke-width="1.5"/>
        <circle cx="945" cy="250" r="118" fill="${tokens.surface}" stroke="${tokens.accent}" stroke-width="1.8" opacity="0.9"/>
        <circle cx="945" cy="250" r="78" fill="none" stroke="${tokens.border}" stroke-width="1.2"/>
        <rect x="915" y="220" width="60" height="60" rx="4" fill="none" stroke="${tokens.accent}" stroke-width="2"/>`,
      'economist-digest': `
        <rect x="0" y="0" width="1200" height="12" fill="${tokens.accent}"/>
        <rect x="760" y="120" width="356" height="320" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="1.5"/>
        <rect x="804" y="310" width="44" height="90" fill="${tokens.border}"/>
        <rect x="868" y="255" width="44" height="145" fill="${tokens.link}" opacity="0.8"/>
        <rect x="932" y="200" width="44" height="200" fill="${tokens.accent}"/>
        <rect x="996" y="160" width="44" height="240" fill="${tokens.text}" opacity="0.85"/>`,
      'nordic-atlas': `
        <defs>
          <pattern id="atlas-${index}" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="24" cy="24" r="1.2" fill="${tokens.border}"/>
          </pattern>
        </defs>
        <rect x="56" y="56" width="1088" height="518" fill="url(#atlas-${index})" stroke="${tokens.border}" stroke-width="1.2"/>
        <path d="M770 370 L890 190 L965 290 L1020 225 L1100 370 Z" fill="${tokens.surface}" stroke="${tokens.accent}" stroke-width="2"/>
        <circle cx="1015" cy="145" r="24" fill="none" stroke="${tokens.link}" stroke-width="2"/>`,
    };
    const tspanMarkup = headlineLines
      .map(
        (line, i) =>
          `<tspan x="90" dy="${i === 0 ? 0 : 48}">${escXml(line)}</tspan>`
      )
      .join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="${tokens.bg}"/>
  ${motifByTemplate[templateStyle]}
  <text x="90" y="155" font-family="monospace" font-size="20" font-weight="700" letter-spacing="2" fill="${tokens.link}">${safeKicker}</text>
  <text x="90" y="232" font-family="Georgia, serif" font-weight="700" font-size="38" fill="${tokens.text}">${tspanMarkup}</text>
  <text x="90" y="346" font-family="sans-serif" font-size="22" fill="${tokens.text2}">${safeBrand} · ${escXml(presetMeta.name)}</text>
  <line x1="90" y1="470" x2="1110" y2="470" stroke="${tokens.border}" stroke-width="1.5"/>
  <text x="90" y="520" font-family="monospace" font-size="20" fill="${tokens.muted}">${escXml(authorName)} · Số 0${index}/0${totalCovers}</text>
</svg>
`;
  };

  const ogDefaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" fill="${tokens.bg}"/>
  <rect x="48" y="48" width="1104" height="534" rx="16" fill="${tokens.surface}" stroke="${tokens.border}" stroke-width="2"/>
  <text x="96" y="190" font-family="monospace" font-size="20" fill="${tokens.link}">${escXml(presetMeta.name.toUpperCase())}</text>
  <text x="96" y="280" font-family="Georgia, serif" font-weight="700" font-size="58" fill="${tokens.text}">${escXml(siteTitle)}</text>
  <text x="96" y="355" font-family="sans-serif" font-size="26" fill="${tokens.text2}">${escXml(tagline.slice(0, 78))}</text>
  <line x1="96" y1="450" x2="1104" y2="450" stroke="${tokens.border}" stroke-width="1"/>
  <text x="96" y="510" font-family="monospace" font-size="22" fill="${tokens.muted}">${escXml(authorName)} · Ấn phẩm Blog</text>
</svg>
`;

  const manifestJson = JSON.stringify(
    {
      name: siteTitle,
      short_name: headerBrand.slice(0, 24),
      description: tagline,
      start_url: './',
      display: 'standalone',
      background_color: tokens.bg,
      theme_color: tokens.accent,
      icons: [
        {
          src: hasBundledPngFavicon ? './favicon.png' : './favicon.svg',
          sizes: hasBundledPngFavicon ? '192x192' : 'any',
          type: hasBundledPngFavicon ? 'image/png' : 'image/svg+xml',
        },
      ],
    },
    null,
    2
  ) + '\n';

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${persistedConfig.pagesUrl || defaultPagesUrl}/sitemap.xml
`;

  const urlUtilsTs = `export function withBase(path = '/'): string {
  if (!path) return import.meta.env.BASE_URL || '/';
  if (/^(https?:|mailto:|tel:|data:|#)/i.test(path)) return path;
  const rawBase = import.meta.env.BASE_URL || '/';
  const cleanBase = rawBase === '/' ? '' : rawBase.replace(/\\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : \`/\${path}\`;
  return \`\${cleanBase}\${cleanPath}\` || '/';
}

export function slugifyVi(raw = ''): string {
  const s = String(raw || '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'muc';
}

export function getPostSlug(entry: { id: string; data?: Record<string, any> }): string {
  const raw = entry.data?.slug || entry.id || 'bai-viet';
  return String(raw).replace(/\\.mdx?$/i, '').split('/').pop() || 'bai-viet';
}

export function getPostTitle(entry: { id: string; data?: Record<string, any> }): string {
  return String(
    entry.data?.tieu_de ||
      entry.data?.title ||
      entry.id ||
      'Chưa đặt tiêu đề'
  );
}

export function getPostCategory(entry: { data?: Record<string, any> }): string {
  const raw = entry.data?.danh_muc;
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0]).trim() || 'Bài viết';
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  const cat = entry.data?.category;
  if (typeof cat === 'string' && cat.trim()) return cat.trim();
  return 'Bài viết';
}

export function getPostCategorySlug(entry: { data?: Record<string, any> }): string {
  const explicit = typeof entry.data?.chuyen_muc === 'string' ? entry.data.chuyen_muc.trim() : '';
  return slugifyVi(explicit || getPostCategory(entry));
}

export function getPostTags(entry: { data?: Record<string, any> }): string[] {
  const raw = entry.data?.tags;
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => String(t).trim()).filter(Boolean);
}

export function getPostDate(entry: { data?: Record<string, any> }): string {
  const raw = entry.data?.ngay || entry.data?.date || entry.data?.pubDate || '';
  const match = String(raw).match(/^(\\d{4}-\\d{2}-\\d{2})/);
  return match ? match[1] : new Date().toISOString().slice(0, 10);
}

export function getPostExcerpt(entry: { body?: string; data?: Record<string, any> }): string {
  const raw =
    entry.data?.mo_ta ||
    entry.data?.excerpt ||
    entry.data?.description ||
    '';
  if (raw) return String(raw);
  const plain = String(entry.body || '')
    .replace(/\`\`\`[\\s\\S]*?\`\`\`/g, '')
    .replace(/[#>*\`!\\[\\]\\(\\)]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
  return plain.slice(0, 160) + (plain.length > 160 ? '...' : '');
}

export function getPostCover(entry: { data?: Record<string, any> }): string | undefined {
  const raw =
    entry.data?.anh_bia ||
    entry.data?.cover ||
    entry.data?.heroImage ||
    entry.data?.image;
  if (!raw) return undefined;
  return withBase(String(raw).trim());
}

export function formatVietnameseDate(dateStr?: string): string {
  if (!dateStr) return '';
  const m = String(dateStr).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (!m) return String(dateStr);
  return \`\${m[3]}/\${m[2]}/\${m[1]}\`;
}

export function estimateReadingTime(body = ''): number {
  const words = String(body).trim().split(/\\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
`;

  const contentConfigTs = `import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z
  .object({
    tieu_de: z.string().optional(),
    ten_san_pham: z.string().optional(),
    title: z.string().optional(),
    danh_muc: z.union([z.string(), z.array(z.string())]).optional(),
    category: z.string().optional(),
    chuyen_muc: z.string().optional(),
    slug: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    cong_nghe: z.union([z.string(), z.array(z.string())]).optional(),
    the_loai: z.union([z.string(), z.array(z.string())]).optional(),
    mo_ta: z.string().optional(),
    mo_ta_ngan: z.string().optional(),
    excerpt: z.string().optional(),
    description: z.string().optional(),
    ngay: z.coerce.string().optional(),
    date: z.coerce.string().optional(),
    pubDate: z.coerce.string().optional(),
    anh_bia: z.string().optional(),
    anh_dai_dien: z.string().optional(),
    anh_san_pham: z.string().optional(),
    cover: z.string().optional(),
    heroImage: z.string().optional(),
    image: z.string().optional(),
    nhap: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
    tac_gia: z.string().optional(),
    author: z.string().optional(),
    noi_bat: z.boolean().optional(),
    gia: z.coerce.string().optional(),
    gia_goc: z.coerce.string().optional(),
    con_hang: z.boolean().optional(),
    link_demo: z.string().optional(),
    link_github: z.string().optional(),
    link_mua: z.string().optional(),
    dinh_dang: z.union([z.string(), z.array(z.string())]).optional(),
    nam_xuat_ban: z.coerce.number().optional(),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    canonical_url: z.string().optional(),
    noindex: z.boolean().optional(),
  })
  .passthrough();

export const collections = {
  bai_viet: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/bai_viet' }),
    schema: postSchema,
  }),
  du_an: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/du_an' }),
    schema: postSchema,
  }),
  sach: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/sach' }),
    schema: postSchema,
  }),
  cua_hang: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/cua_hang' }),
    schema: postSchema,
  }),
};
`;

  const baseLayoutAstro = `---
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import { withBase } from '../utils/url';

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
  canonical?: string;
  jsonLd?: Record<string, any>;
}

const {
  title = SITE_CONFIG.siteTitle,
  description = SITE_CONFIG.tagline,
  ogImage = '/tainguyen/hinhanh/og-default.svg',
  noindex = false,
  canonical,
  jsonLd,
} = Astro.props;

const fullTitle =
  title === SITE_CONFIG.siteTitle ? title : \`\${title} | \${SITE_CONFIG.siteTitle}\`;
const iconHref = withBase(SITE_CONFIG.siteIcon || '/favicon.svg');
const ogImgHref = withBase(ogImage);
const initialMode = SITE_CONFIG.themeMode === 'dark' ? 'dark' : 'light';
const initialDark = initialMode === 'dark';
const currentPath = Astro.url.pathname;
const analyticsProvider = SITE_CONFIG.analyticsProvider || 'none';
const analyticsId = (SITE_CONFIG.analyticsId || '').trim();
const liveChat = SITE_CONFIG.liveChat;
const activeChatChannels = (liveChat?.channels || []).filter(
  (ch) => ch.enabled && ch.value && ch.value.trim().length > 0
);
const directChatChannels = activeChatChannels.filter(
  (ch) => ch.id !== 'tawkto' && ch.id !== 'crisp'
);
const tawkChannel = activeChatChannels.find((ch) => ch.id === 'tawkto');
const crispChannel = activeChatChannels.find((ch) => ch.id === 'crisp');
const tawkWidgetId = tawkChannel?.value
  ? tawkChannel.value
      .trim()
      .replace(/^https?:\\/\\/embed\\.tawk\\.to\\//i, '')
      .replace(/^\\/+/, '')
  : '';

function resolveChatHref(id: string, rawValue: string): string {
  const val = rawValue.trim();
  if (/^(https?:|mailto:|tel:)/i.test(val)) return val;
  if (id === 'zalo') return \`https://zalo.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'messenger') return \`https://m.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'telegram') return \`https://t.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'whatsapp') {
    const digits = val.replace(/[^0-9]/g, '');
    const normalized = /^0\\d{8,10}$/.test(digits) ? \`84\${digits.slice(1)}\` : digits;
    return \`https://wa.me/\${normalized}\`;
  }
  if (id === 'email') return \`mailto:\${val}\`;
  return val;
}

const cleanCurrent = currentPath.replace(/\\/+$/, '') || '/';
const homeClean = withBase('/').replace(/\\/+$/, '') || '/';

function isNavActive(targetHref: string): boolean {
  const cleanTarget = targetHref.replace(/\\/+$/, '') || '/';
  if (cleanTarget === homeClean) return cleanCurrent === homeClean;
  return cleanCurrent === cleanTarget || cleanCurrent.startsWith(\`\${cleanTarget}/\`);
}

let hasProjects = false;
let hasBooks = false;
let hasShop = false;
try {
  hasProjects = (await getCollection('du_an')).some((e) => !e.data.nhap && !e.data.draft);
} catch {}
try {
  hasBooks = (await getCollection('sach')).some((e) => !e.data.nhap && !e.data.draft);
} catch {}
try {
  hasShop = (await getCollection('cua_hang')).some((e) => !e.data.nhap && !e.data.draft);
} catch {}

const extraCollectionNav = [
  ...(hasProjects ? [{ label: 'Dự án', href: withBase('/du-an/') }] : []),
  ...(hasBooks ? [{ label: 'Sách', href: withBase('/sach/') }] : []),
  ...(hasShop ? [{ label: 'Cửa hàng', href: withBase('/cua-hang/') }] : []),
];

const mainNav = SITE_CONFIG.isMultiPage
  ? [
      { label: 'Trang nhất', href: withBase('/') },
      { label: 'Chuyên mục', href: withBase('/chuyen-muc/') },
      { label: 'Kho bài', href: withBase('/bai-viet/') },
      ...extraCollectionNav,
      { label: 'Lưu trữ', href: withBase('/luu-tru/') },
      { label: 'Giới thiệu', href: withBase('/gioi-thieu/') },
    ]
  : [
      { label: 'Trang nhất', href: withBase('/') },
      { label: 'Kho bài viết', href: withBase('/bai-viet/') },
      ...extraCollectionNav,
    ];

const drawerExtraNav = SITE_CONFIG.isMultiPage
  ? [
      { label: 'Chủ đề (#Tags)', href: withBase('/chu-de/') },
      { label: 'Liên hệ & Chat', href: withBase('/lien-he/') },
    ]
  : [];
---

<!doctype html>
<html lang="vi" data-mode={initialMode} class={initialDark ? 'dark' : ''}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    {noindex && <meta name="robots" content="noindex" />}
    {canonical && <link rel="canonical" href={canonical} />}

    <script is:inline define:vars={{ defaultMode: initialMode }}>
      (function () {
        try {
          var saved = localStorage.getItem('daoky_theme_mode');
          var mode = saved === 'dark' || saved === 'light' ? saved : defaultMode;
          document.documentElement.setAttribute('data-mode', mode);
          document.documentElement.classList.toggle('dark', mode === 'dark');
        } catch (e) {}
      })();
    </script>

    {analyticsProvider === 'ga4' && analyticsId && (
      <>
        <script async src={\`https://www.googletagmanager.com/gtag/js?id=\${encodeURIComponent(analyticsId)}\`}></script>
        <script is:inline define:vars={{ gaId: analyticsId }}>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', gaId);
        </script>
      </>
    )}
    {analyticsProvider === 'cloudflare' && analyticsId && (
      <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: analyticsId })}></script>
    )}
    {analyticsProvider === 'plausible' && analyticsId && (
      <script defer data-domain={analyticsId} src="https://plausible.io/js/script.js"></script>
    )}
    {analyticsProvider === 'umami' && analyticsId && (
      <script defer src="https://cloud.umami.is/script.js" data-website-id={analyticsId}></script>
    )}

    <meta property="og:type" content="website" />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImgHref} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={fullTitle} />
    <meta name="twitter:description" content={description} />

    <link rel="icon" href={iconHref} />
    <link rel="apple-touch-icon" href={iconHref} />
    <link rel="manifest" href={withBase('/manifest.webmanifest')} />
    <link rel="sitemap" type="application/xml" title="Sitemap" href={withBase('/sitemap.xml')} />
    <link rel="alternate" type="application/rss+xml" title={\`\${SITE_CONFIG.siteTitle} RSS\`} href={withBase('/rss.xml')} />
    {jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,400&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,400&family=JetBrains+Mono:wght@400;500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body data-template={SITE_CONFIG.templateStyle}>
    <header class="site-header">
      <div class="wrap nav-inner">
        <a class="brand" href={withBase('/')}>
          <img src={iconHref} alt={SITE_CONFIG.headerTitle} width="30" height="30" />
          <span>{SITE_CONFIG.headerTitle}</span>
        </a>

        <nav class="nav-links" aria-label="Điều hướng chính">
          {mainNav.map((item) => (
            <a
              href={item.href}
              class={isNavActive(item.href) ? 'active' : ''}
            >
              {item.label}
            </a>
          ))}
          {SITE_CONFIG.headerNavLinks.map((link) => (
            <a
              href={withBase(link.url)}
              target={link.url.startsWith('http') ? '_blank' : undefined}
              rel={link.url.startsWith('http') ? 'noreferrer' : undefined}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div class="nav-actions">
          <button
            id="themeToggleBtn"
            class="icon-btn theme-toggle-btn"
            type="button"
            aria-label="Chuyển chế độ Sáng / Tối"
            title="Chuyển chế độ Sáng / Tối"
          >
            <svg class="sun-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <svg class="moon-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </button>
          <a class="icon-btn" href={withBase('/rss.xml')} title="RSS Feed" aria-label="RSS Feed">
            RSS
          </a>
          <button id="mobileMenuBtn" class="mobile-menu-btn" type="button" aria-label="Mở menu">
            ☰
          </button>
        </div>
      </div>

      <div id="mobileDrawer" class="mobile-drawer hidden">
        <div class="wrap mobile-drawer-links">
          {mainNav.map((item) => (
            <a href={item.href}>{item.label}</a>
          ))}
          {drawerExtraNav.map((item) => (
            <a href={item.href}>{item.label}</a>
          ))}
          {SITE_CONFIG.headerNavLinks.map((link) => (
            <a href={withBase(link.url)}>{link.label}</a>
          ))}
        </div>
      </div>
    </header>

    <main class="wrap main-content">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="wrap footer-inner">
        <div>
          <p class="footer-copy">{SITE_CONFIG.footerText}</p>
          <p class="footer-sub">Tác giả: {SITE_CONFIG.authorName}</p>
        </div>
        <div class="footer-links">
          {SITE_CONFIG.isMultiPage ? (
            <>
              <a href={withBase('/chuyen-muc/')}>Chuyên mục</a>
              <a href={withBase('/chu-de/')}>Chủ đề</a>
              <a href={withBase('/luu-tru/')}>Lưu trữ</a>
              <a href={withBase('/gioi-thieu/')}>Giới thiệu</a>
              <a href={withBase('/lien-he/')}>Liên hệ</a>
            </>
          ) : (
            <a href={withBase('/bai-viet/')}>Kho bài viết</a>
          )}
          <a href={withBase('/rss.xml')}>RSS</a>
          {SITE_CONFIG.footerLinks.map((link) => (
            <a
              href={withBase(link.url)}
              target={link.url.startsWith('http') ? '_blank' : undefined}
              rel={link.url.startsWith('http') ? 'noreferrer' : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>

    {liveChat?.enabled && directChatChannels.length > 0 && (
      <div id="daokyLiveChat" class="livechat-dock">
        <div id="livechatPanel" class="livechat-panel hidden" role="dialog" aria-label={liveChat.title || 'Live Chat'}>
          <div class="livechat-head">
            <div>
              <strong>{liveChat.title || 'Trò chuyện với tác giả'}</strong>
              {liveChat.welcomeText && <p>{liveChat.welcomeText}</p>}
            </div>
            <button id="livechatCloseBtn" type="button" aria-label="Đóng hộp chat">✕</button>
          </div>
          <div class="livechat-list">
            {directChatChannels.map((ch) => (
              <a
                class="livechat-item"
                href={resolveChatHref(ch.id, ch.value)}
                target={ch.id === 'email' ? undefined : '_blank'}
                rel={ch.id === 'email' ? undefined : 'noreferrer'}
              >
                <span class="livechat-ch-name">{ch.label || ch.id.toUpperCase()}</span>
                <span class="livechat-ch-arrow">Nhắn ngay →</span>
              </a>
            ))}
          </div>
        </div>
        <button id="livechatToggleBtn" class="livechat-fab" type="button" aria-expanded="false">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
        </button>
      </div>
    )}

    {liveChat?.enabled && tawkWidgetId && (
      <script is:inline define:vars={{ tawkId: tawkWidgetId }}>
        var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
        (function () {
          var s1 = document.createElement('script'),
            s0 = document.getElementsByTagName('script')[0];
          s1.async = true;
          s1.src = 'https://embed.tawk.to/' + tawkId;
          s1.charset = 'UTF-8';
          s1.setAttribute('crossorigin', '*');
          s0.parentNode.insertBefore(s1, s0);
        })();
      </script>
    )}

    {liveChat?.enabled && crispChannel?.value && (
      <script is:inline define:vars={{ crispId: crispChannel.value }}>
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = crispId;
        (function () {
          var d = document;
          var s = d.createElement('script');
          s.src = 'https://client.crisp.chat/l.js';
          s.async = true;
          d.getElementsByTagName('head')[0].appendChild(s);
        })();
      </script>
    )}

    <script is:inline>
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const cur = document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
          const next = cur === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-mode', next);
          document.documentElement.classList.toggle('dark', next === 'dark');
          try {
            localStorage.setItem('daoky_theme_mode', next);
          } catch (e) {}
          const giscusFrame = document.querySelector('iframe.giscus-frame');
          if (giscusFrame && giscusFrame.contentWindow) {
            giscusFrame.contentWindow.postMessage(
              { giscus: { setConfig: { theme: next } } },
              'https://giscus.app'
            );
          }
        });
      }
      const mBtn = document.getElementById('mobileMenuBtn');
      const mDrawer = document.getElementById('mobileDrawer');
      if (mBtn && mDrawer) {
        mBtn.addEventListener('click', () => {
          mDrawer.classList.toggle('hidden');
        });
      }
      const chatToggle = document.getElementById('livechatToggleBtn');
      const chatPanel = document.getElementById('livechatPanel');
      const chatClose = document.getElementById('livechatCloseBtn');
      if (chatToggle && chatPanel) {
        chatToggle.addEventListener('click', () => {
          const isHidden = chatPanel.classList.toggle('hidden');
          chatToggle.setAttribute('aria-expanded', String(!isHidden));
        });
        if (chatClose) {
          chatClose.addEventListener('click', () => {
            chatPanel.classList.add('hidden');
            chatToggle.setAttribute('aria-expanded', 'false');
          });
        }
      }

      document.querySelectorAll('.prose pre').forEach((preEl) => {
        if (preEl.classList.contains('mermaid')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dk-copy-btn';
        btn.textContent = 'Sao chép';
        btn.addEventListener('click', () => {
          const codeEl = preEl.querySelector('code');
          const txt = codeEl ? codeEl.textContent || '' : preEl.textContent || '';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(() => {
              btn.textContent = 'Đã chép';
              window.setTimeout(() => {
                btn.textContent = 'Sao chép';
              }, 1600);
            }).catch(() => {});
          }
        });
        preEl.appendChild(btn);
      });

      const proseBlocks = document.querySelectorAll('.prose');
      let needsKatex = false;
      proseBlocks.forEach((el) => {
        if (el.textContent && el.textContent.includes('$')) {
          needsKatex = true;
        }
      });
      if (needsKatex) {
        const kCss = document.createElement('link');
        kCss.rel = 'stylesheet';
        kCss.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
        document.head.appendChild(kCss);
        const kJs = document.createElement('script');
        kJs.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
        kJs.onload = () => {
          const kAuto = document.createElement('script');
          kAuto.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
          kAuto.onload = () => {
            if (typeof window.renderMathInElement === 'function') {
              proseBlocks.forEach((el) => {
                window.renderMathInElement(el, {
                  delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                  ],
                  throwOnError: false,
                });
              });
            }
          };
          document.head.appendChild(kAuto);
        };
        document.head.appendChild(kJs);
      }

      if (document.querySelectorAll('.mermaid').length > 0) {
        const mScript = document.createElement('script');
        mScript.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
        mScript.onload = () => {
          if (window.mermaid) {
            const isDarkMode = document.documentElement.getAttribute('data-mode') === 'dark';
            window.mermaid.initialize({
              startOnLoad: false,
              theme: isDarkMode ? 'dark' : 'default',
            });
            window.mermaid.run();
          }
        };
        document.head.appendChild(mScript);
      }
    </script>
  </body>
</html>

<style is:global>
  :root {
    --bg: ${tokens.bg};
    --surface: ${tokens.surface};
    --card: ${tokens.card};
    --border: ${tokens.border};
    --text: ${tokens.text};
    --text-2: ${tokens.text2};
    --muted: ${tokens.muted};
    --accent: ${tokens.accent};
    --accent-text: ${tokens.accentText};
    --link: ${tokens.link};
    --font-display: ${tokens.fontDisplay};
    --font-body: ${tokens.fontBody};
    --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  }

  ${(Object.keys(TEMPLATE_DUAL_TOKENS) as AstroTemplateId[])
    .flatMap((tplId) =>
      (['light', 'dark'] as const).map((mode) => {
        const t = TEMPLATE_DUAL_TOKENS[tplId][mode];
        return `html[data-mode='${mode}'] body[data-template='${tplId}'] {
    --bg: ${t.bg};
    --surface: ${t.surface};
    --card: ${t.card};
    --border: ${t.border};
    --text: ${t.text};
    --text-2: ${t.text2};
    --muted: ${t.muted};
    --accent: ${t.accent};
    --accent-text: ${t.accentText};
    --link: ${t.link};
    --font-display: ${t.fontDisplay};
    --font-body: ${t.fontBody};
  }`;
      })
    )
    .join('\n\n  ')}

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    overflow-x: hidden;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    line-height: 1.72;
    -webkit-font-smoothing: antialiased;
  }

  a {
    color: var(--link);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .wrap {
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 20px;
  }

  @media (max-width: 639px) {
    .wrap {
      padding: 0 16px;
    }
  }

  .site-header {
    position: sticky;
    top: 0;
    z-index: 40;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
  }

  body[data-template='newyorker-light'] .site-header {
    border-bottom: 3px double var(--border);
  }

  body[data-template='monocle-magazine'] .site-header,
  body[data-template='guardian-portal'] .site-header,
  body[data-template='economist-digest'] .site-header {
    border-top: 3px solid var(--accent);
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 60px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--text);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
    text-decoration: none !important;
  }

  .brand img {
    border-radius: 9999px;
    border: 1px solid var(--border);
    object-fit: cover;
    flex-shrink: 0;
  }

  .brand span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-links {
    display: none;
    align-items: center;
    gap: 18px;
    font-size: 0.88rem;
    font-weight: 500;
  }

  .nav-links a {
    color: var(--text-2);
    text-decoration: none;
    white-space: nowrap;
    padding: 4px 0;
    border-bottom: 2px solid transparent;
  }

  .nav-links a:hover,
  .nav-links a.active {
    color: var(--text);
    font-weight: 600;
  }

  .nav-links a.active {
    border-bottom-color: var(--accent);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .icon-btn,
  .mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none !important;
  }

  .theme-toggle-btn {
    min-width: 38px;
    padding: 0;
  }

  .theme-toggle-btn .sun-icon {
    display: none;
    color: #f59e0b;
  }

  .theme-toggle-btn .moon-icon {
    display: block;
    color: var(--link);
  }

  html[data-mode='dark'] .theme-toggle-btn .sun-icon {
    display: block;
  }

  html[data-mode='dark'] .theme-toggle-btn .moon-icon {
    display: none;
  }

  .mobile-menu-btn {
    min-width: 38px;
    padding: 0 10px;
    font-size: 1rem;
  }

  .mobile-drawer {
    border-top: 1px solid var(--border);
    background: var(--bg);
    padding: 12px 0 16px;
  }

  .mobile-drawer.hidden {
    display: none;
  }

  .mobile-drawer-links {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .mobile-drawer-links a {
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 500;
    padding: 6px 0;
  }

  @media (min-width: 880px) {
    .nav-links {
      display: flex;
    }
    .mobile-menu-btn,
    .mobile-drawer {
      display: none !important;
    }
  }

  .main-content {
    min-height: calc(100vh - 200px);
    padding-top: 28px;
    padding-bottom: 64px;
  }

  .site-footer {
    border-top: 1px solid var(--border);
    background: var(--surface);
    padding: 28px 0;
  }

  body[data-template='newyorker-light'] .site-footer {
    border-top: 3px double var(--border);
  }

  .footer-inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .footer-copy {
    margin: 0;
    font-size: 0.88rem;
    color: var(--text-2);
  }

  .footer-sub {
    margin: 4px 0 0;
    font-size: 0.78rem;
    color: var(--muted);
    font-family: var(--font-mono);
  }

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    font-size: 0.84rem;
  }

  .prose {
    font-size: 1.08rem;
    line-height: 1.82;
    color: var(--text-2);
    max-width: 68ch;
  }

  body[data-template='newyorker-light'] .prose > p:first-of-type::first-letter,
  body[data-template='espresso-salon'] .prose > p:first-of-type::first-letter,
  body[data-template='kyoto-folio'] .prose > p:first-of-type::first-letter {
    float: left;
    font-family: var(--font-display);
    font-size: 3.4rem;
    line-height: 0.85;
    font-weight: 700;
    color: var(--text);
    padding-right: 10px;
    padding-top: 4px;
  }

  .prose h2,
  .prose h3 {
    font-family: var(--font-display);
    color: var(--text);
    margin-top: 2.1rem;
    margin-bottom: 0.75rem;
    line-height: 1.25;
  }

  .prose p {
    margin: 1.15rem 0;
  }

  .prose img {
    max-width: 100%;
    height: auto;
    border-radius: 10px;
    margin: 1.6rem 0;
    border: 1px solid var(--border);
  }

  .prose blockquote {
    margin: 1.8rem 0;
    padding: 1.1rem 1.25rem;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    font-family: var(--font-display);
    font-style: italic;
    font-size: 1.15rem;
    color: var(--text);
  }

  .prose pre {
    position: relative;
    padding: 1.1rem;
    border-radius: 10px;
    overflow-x: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.88rem;
  }

  .prose code {
    font-family: var(--font-mono);
    font-size: 0.88em;
    background: var(--surface);
    padding: 0.15em 0.4em;
    border-radius: 5px;
  }

  .prose pre code {
    background: transparent;
    padding: 0;
  }

  .dk-copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 10px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text-2);
    cursor: pointer;
    opacity: 0.85;
  }

  .dk-copy-btn:hover {
    opacity: 1;
    border-color: var(--link);
    color: var(--text);
  }

  .prose blockquote.dk-callout {
    font-family: var(--font-body);
    font-style: normal;
    font-size: 1rem;
    border: 1px solid var(--border);
    border-left: 4px solid var(--link);
    background: var(--surface);
    border-radius: 10px;
    padding: 0.95rem 1.15rem;
  }

  .prose blockquote.dk-callout-tip {
    border-left-color: #10b981;
  }

  .prose blockquote.dk-callout-important {
    border-left-color: #8b5cf6;
  }

  .prose blockquote.dk-callout-warning {
    border-left-color: #f59e0b;
  }

  .prose blockquote.dk-callout-caution {
    border-left-color: #ef4444;
  }

  .dk-callout-title {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text);
    margin-bottom: 6px;
  }

  .dk-video-embed {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    margin: 1.5rem 0;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: #000;
  }

  .dk-video-embed iframe {
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  .dk-mermaid-box {
    margin: 1.5rem 0;
    padding: 1rem;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
    overflow-x: auto;
  }

  .dk-mermaid-box pre.mermaid {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    text-align: center;
  }

  .livechat-dock {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 60;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }

  .livechat-fab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--accent);
    color: var(--accent-text);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  }

  .livechat-panel {
    width: min(320px, calc(100vw - 36px));
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .livechat-panel.hidden {
    display: none;
  }

  .livechat-head {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .livechat-head strong {
    display: block;
    font-size: 0.92rem;
    font-family: var(--font-display);
  }

  .livechat-head p {
    margin: 4px 0 0;
    font-size: 0.78rem;
    color: var(--text-2);
    line-height: 1.45;
  }

  .livechat-head button {
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: 0.95rem;
    padding: 2px 6px;
  }

  .livechat-list {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .livechat-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
    font-size: 0.84rem;
    font-weight: 600;
    text-decoration: none !important;
  }

  .livechat-item:hover {
    border-color: var(--link);
  }

  .livechat-ch-arrow {
    font-size: 0.76rem;
    color: var(--link);
    font-family: var(--font-mono);
  }
</style>
`;

  const postCardAstro = `---
import {
  estimateReadingTime,
  formatVietnameseDate,
  getPostCategory,
  getPostCover,
  getPostDate,
  getPostExcerpt,
  getPostSlug,
  getPostTitle,
  withBase,
} from '../utils/url';

interface Props {
  entry: any;
  featured?: boolean;
}

const { entry, featured = false } = Astro.props;
const slug = getPostSlug(entry);
const href = withBase(\`/bai-viet/\${slug}/\`);
const title = getPostTitle(entry);
const date = getPostDate(entry);
const excerpt = getPostExcerpt(entry);
const cover = getPostCover(entry);
const category = getPostCategory(entry);
const minutes = estimateReadingTime(entry.body || '');
---

<article
  class={\`post-card \${featured ? 'is-featured' : ''}\`}
  data-search={\`\${title} \${excerpt} \${category}\`.toLowerCase()}
>
  <a class="post-card-link" href={href}>
    {cover && (
      <div class="post-cover-wrap">
        <img src={cover} alt={title} loading="lazy" />
      </div>
    )}
    <div class="post-body">
      <div class="post-meta">
        <span class="post-cat">{category}</span>
        <span>·</span>
        <span>{formatVietnameseDate(date)}</span>
        <span>·</span>
        <span>{minutes} phút đọc</span>
      </div>
      <h3 class="post-title">{title}</h3>
      <p class="post-excerpt">{excerpt}</p>
    </div>
  </a>
</article>

<style>
  .post-card {
    height: 100%;
    border: 1px solid var(--border);
    background: var(--card);
    border-radius: 12px;
    overflow: hidden;
    transition: border-color 0.18s ease, transform 0.18s ease;
  }

  :global(body[data-template='nytimes-light']) .post-card,
  :global(body[data-template='obsidian-broadsheet']) .post-card,
  :global(body[data-template='newyorker-light']) .post-card,
  :global(body[data-template='guardian-portal']) .post-card,
  :global(body[data-template='economist-digest']) .post-card {
    border-radius: 6px;
  }

  .post-card:hover {
    border-color: var(--link);
    transform: translateY(-1px);
  }

  .post-card-link {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: inherit;
    text-decoration: none !important;
  }

  .post-cover-wrap {
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .post-cover-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .post-body {
    flex: 1;
    padding: 18px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .post-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    color: var(--muted);
  }

  .post-cat {
    color: var(--link);
    font-weight: 600;
    text-transform: uppercase;
  }

  .post-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.24rem;
    line-height: 1.3;
    color: var(--text);
  }

  .post-card.is-featured .post-title {
    font-size: 1.65rem;
    line-height: 1.2;
  }

  .post-excerpt {
    margin: 0;
    font-size: 0.92rem;
    color: var(--text-2);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
`;

  const indexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import {
  estimateReadingTime,
  formatVietnameseDate,
  getPostCategory,
  getPostCategorySlug,
  getPostCover,
  getPostDate,
  getPostExcerpt,
  getPostSlug,
  getPostTags,
  getPostTitle,
  withBase,
} from '../utils/url';

const posts = (await getCollection('bai_viet'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

const leadPost = posts[0] || null;
const secondaryPosts = SITE_CONFIG.isMultiPage ? posts.slice(1, 7) : posts.slice(1);
const leadCover = leadPost ? getPostCover(leadPost) : undefined;
const leadSlug = leadPost ? getPostSlug(leadPost) : '';
const leadHref = leadPost ? withBase(\`/bai-viet/\${leadSlug}/\`) : '#';

const categoryMap = new Map<string, { name: string; slug: string; count: number; latestTitle: string }>();
const tagSet = new Set<string>();
for (const entry of posts) {
  const catName = getPostCategory(entry);
  const catSlug = getPostCategorySlug(entry);
  const existing = categoryMap.get(catSlug);
  if (existing) {
    existing.count += 1;
  } else {
    categoryMap.set(catSlug, {
      name: catName,
      slug: catSlug,
      count: 1,
      latestTitle: getPostTitle(entry),
    });
  }
  for (const tag of getPostTags(entry)) {
    tagSet.add(tag);
  }
}
const categories = Array.from(categoryMap.values());

const homeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: SITE_CONFIG.siteTitle,
  description: SITE_CONFIG.tagline,
  url: SITE_CONFIG.pagesUrl,
  author: {
    '@type': 'Person',
    name: SITE_CONFIG.authorName,
  },
};
---

<BaseLayout jsonLd={homeJsonLd}>
  <section class="masthead">
    <div class="masthead-kicker">{SITE_CONFIG.authorName} · Ấn phẩm Blog cá nhân</div>
    <h1>{SITE_CONFIG.siteTitle}</h1>
    <p class="masthead-desc">{SITE_CONFIG.tagline}</p>

    <div class="masthead-tools">
      <input
        id="homeSearchInput"
        type="search"
        placeholder="Tìm bài viết theo tiêu đề, chủ đề..."
        class="search-input"
      />
      <a class="masthead-cta" href={withBase('/bai-viet/')}>Kho bài viết ({posts.length})</a>
    </div>

    {SITE_CONFIG.isMultiPage && (
      <nav class="hub-strip" aria-label="Điều hướng đa trang">
        <a href={withBase('/chuyen-muc/')}>Chuyên mục ({categories.length})</a>
        <span>·</span>
        <a href={withBase('/chu-de/')}>Chủ đề ({tagSet.size})</a>
        <span>·</span>
        <a href={withBase('/luu-tru/')}>Lưu trữ theo năm</a>
        <span>·</span>
        <a href={withBase('/gioi-thieu/')}>Giới thiệu</a>
        <span>·</span>
        <a href={withBase('/lien-he/')}>Liên hệ</a>
      </nav>
    )}
  </section>

  {leadPost && (
    <section class="lead-section" data-search={\`\${getPostTitle(leadPost)} \${getPostExcerpt(leadPost)} \${getPostCategory(leadPost)}\`.toLowerCase()}>
      <a class="lead-card" href={leadHref}>
        <div class="lead-text">
          <div class="lead-meta">
            <span class="lead-rubric">{getPostCategory(leadPost)}</span>
            <span>·</span>
            <span>{formatVietnameseDate(getPostDate(leadPost))}</span>
            <span>·</span>
            <span>{estimateReadingTime(leadPost.body || '')} phút đọc</span>
          </div>
          <h2>{getPostTitle(leadPost)}</h2>
          <p>{getPostExcerpt(leadPost)}</p>
          <span class="read-more">Đọc trọn bài viết →</span>
        </div>
        {leadCover && (
          <div class="lead-media">
            <img src={leadCover} alt={getPostTitle(leadPost)} />
          </div>
        )}
      </a>
    </section>
  )}

  {SITE_CONFIG.isMultiPage && categories.length > 0 && (
    <section id="categoryHubSection" class="hub-section">
      <div class="section-head section-head-row">
        <h2>Khám phá theo chuyên mục</h2>
        <a class="section-more" href={withBase('/chuyen-muc/')}>Tất cả chuyên mục →</a>
      </div>
      <div class="hub-grid">
        {categories.slice(0, 4).map((cat) => (
          <a class="hub-card" href={withBase(\`/chuyen-muc/\${cat.slug}/\`)}>
            <div class="hub-card-top">
              <span class="hub-card-name">{cat.name}</span>
              <span class="hub-card-count">{cat.count} bài</span>
            </div>
            <p class="hub-card-latest">{cat.latestTitle}</p>
          </a>
        ))}
      </div>
    </section>
  )}

  <section class="posts-section">
    <div class="section-head section-head-row">
      <h2>Bài viết gần đây</h2>
      {SITE_CONFIG.isMultiPage && posts.length > 1 && (
        <a class="section-more" href={withBase('/bai-viet/')}>Xem tất cả ({posts.length}) →</a>
      )}
    </div>

    {posts.length === 0 ? (
      <p class="empty-note">Chưa có bài viết nào được xuất bản.</p>
    ) : (
      <div id="postsGrid" class={\`posts-grid template-\${SITE_CONFIG.templateStyle}\`}>
        {secondaryPosts.map((entry) => (
          <PostCard entry={entry} />
        ))}
      </div>
    )}
    <p id="searchEmptyMsg" class="empty-note hidden">Không tìm thấy bài viết phù hợp với từ khóa của bạn.</p>
  </section>

  <script is:inline>
    const input = document.getElementById('homeSearchInput');
    const grid = document.getElementById('postsGrid');
    const leadSection = document.querySelector('.lead-section');
    const hubSection = document.getElementById('categoryHubSection');
    const emptyMsg = document.getElementById('searchEmptyMsg');
    if (input && grid) {
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        const cards = grid.querySelectorAll('.post-card');
        let visible = 0;
        if (hubSection) {
          hubSection.style.display = q ? 'none' : '';
        }
        if (leadSection) {
          const leadText = leadSection.getAttribute('data-search') || '';
          const matchLead = !q || leadText.includes(q);
          leadSection.style.display = matchLead ? '' : 'none';
          if (matchLead) visible++;
        }
        cards.forEach((card) => {
          const text = card.getAttribute('data-search') || '';
          const match = !q || text.includes(q);
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        if (emptyMsg) {
          emptyMsg.classList.toggle('hidden', visible > 0);
        }
      });
    }
  </script>
</BaseLayout>

<style>
  .masthead {
    padding: 18px 0 28px;
    border-bottom: 1px solid var(--border);
  }

  :global(body[data-template='newyorker-light']) .masthead {
    text-align: center;
    border-bottom: 3px double var(--border);
    padding: 26px 0 32px;
  }

  :global(body[data-template='newyorker-light']) .masthead-desc {
    margin-left: auto;
    margin-right: auto;
  }

  :global(body[data-template='newyorker-light']) .masthead-tools {
    margin-left: auto;
    margin-right: auto;
    max-width: 780px;
  }

  .masthead-kicker {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--link);
    margin-bottom: 10px;
  }

  .masthead h1 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(2.1rem, 4.8vw, 3.25rem);
    line-height: 1.12;
    letter-spacing: -0.025em;
  }

  .masthead-desc {
    margin: 0;
    max-width: 62ch;
    color: var(--text-2);
    font-size: 1.02rem;
  }

  .masthead-tools {
    margin-top: 22px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    width: 100%;
  }

  .hub-strip {
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--muted);
  }

  .hub-strip a {
    color: var(--text-2);
    font-weight: 500;
    white-space: nowrap;
  }

  .hub-strip a:hover {
    color: var(--link);
  }

  .search-input {
    display: block;
    width: 100%;
    min-width: 0;
    height: 44px;
    min-height: 44px;
    max-height: 44px;
    line-height: normal;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.92rem;
    font-family: inherit;
    box-sizing: border-box;
    -webkit-appearance: none;
    appearance: none;
  }

  .masthead-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 44px;
    min-height: 44px;
    padding: 0 20px;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none !important;
    white-space: nowrap;
  }

  @media (max-width: 639px) {
    .masthead-tools {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
      max-width: none;
    }
    .search-input {
      width: 100%;
      height: 44px;
    }
    .masthead-cta {
      width: 100%;
      height: 44px;
    }
  }

  .lead-section {
    padding: 28px 0;
    border-bottom: 1px solid var(--border);
  }

  .lead-card {
    display: grid;
    grid-template-columns: 1fr;
    gap: 22px;
    align-items: center;
    color: inherit;
    text-decoration: none !important;
  }

  @media (min-width: 800px) {
    .lead-card {
      grid-template-columns: 1.15fr 1fr;
      gap: 32px;
    }
  }

  .lead-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .lead-rubric {
    color: var(--link);
    font-weight: 600;
    text-transform: uppercase;
  }

  .lead-text h2 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(1.6rem, 3vw, 2.25rem);
    line-height: 1.18;
    color: var(--text);
  }

  .lead-card:hover .lead-text h2 {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .lead-text p {
    margin: 0 0 14px;
    color: var(--text-2);
    font-size: 1rem;
    line-height: 1.65;
  }

  .read-more {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--link);
  }

  .lead-media {
    aspect-ratio: 16 / 10;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .lead-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .hub-section {
    padding: 26px 0;
    border-bottom: 1px solid var(--border);
  }

  .hub-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  @media (min-width: 640px) {
    .hub-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 960px) {
    .hub-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  .hub-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: inherit;
    text-decoration: none !important;
    transition: border-color 0.16s ease, transform 0.16s ease;
  }

  .hub-card:hover {
    border-color: var(--link);
    transform: translateY(-1px);
  }

  .hub-card-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .hub-card-name {
    font-family: var(--font-display);
    font-size: 1.02rem;
    font-weight: 700;
    color: var(--text);
  }

  .hub-card-count {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--link);
    white-space: nowrap;
  }

  .hub-card-latest {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.45;
    color: var(--text-2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .posts-section {
    padding-top: 28px;
  }

  .section-head-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  .section-head h2 {
    font-family: var(--font-display);
    font-size: 1.4rem;
    margin: 0;
  }

  .section-more {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  @media (min-width: 720px) {
    .posts-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .posts-grid.template-nytimes-light,
    .posts-grid.template-obsidian-broadsheet,
    .posts-grid.template-bbc-dark,
    .posts-grid.template-monocle-magazine,
    .posts-grid.template-guardian-portal,
    .posts-grid.template-economist-digest,
    .posts-grid.template-nordic-atlas {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .empty-note {
    color: var(--muted);
    padding: 24px 0;
  }

  .hidden {
    display: none;
  }
</style>
`;

  const archiveIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import { getPostCategory, getPostDate } from '../../utils/url';

const entries = (await getCollection('bai_viet'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

const categories = Array.from(
  new Set(entries.map((e) => getPostCategory(e)).filter(Boolean))
);
const pageSize = SITE_CONFIG.isMultiPage ? 4 : 24;
---

<BaseLayout title="Kho bài viết" description="Toàn bộ bài viết, tiểu luận và ghi chép trên blog.">
  <div class="col-header">
    <h1>Kho bài viết</h1>
    <p>Tất cả {entries.length} bài viết đã xuất bản.</p>

    <div class="archive-tools">
      <input
        id="archiveSearchInput"
        type="search"
        placeholder="Tìm trong kho bài viết..."
        class="archive-search"
      />
      {categories.length > 1 && (
        <div id="archiveCatBar" class="cat-bar" role="tablist" aria-label="Lọc theo chuyên mục">
          <button type="button" class="cat-btn active" data-cat="all">
            Tất cả ({entries.length})
          </button>
          {categories.map((cat) => (
            <button type="button" class="cat-btn" data-cat={cat.toLowerCase()}>
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>

  {entries.length === 0 ? (
    <p style="color: var(--muted);">Chưa có bài viết nào được xuất bản.</p>
  ) : (
    <div id="archiveGrid" class={\`col-grid template-\${SITE_CONFIG.templateStyle}\`}>
      {entries.map((entry) => (
        <div
          class="archive-item"
          data-cat={getPostCategory(entry).toLowerCase()}
        >
          <PostCard entry={entry} />
        </div>
      ))}
    </div>
  )}
  <p id="archiveEmptyMsg" class="empty-archive hidden">Không có bài viết nào khớp bộ lọc hiện tại.</p>
  <nav id="archivePagination" class="pagination-bar hidden" aria-label="Phân trang kho bài viết"></nav>

  <script is:inline define:vars={{ pageSize }}>
    const archiveInput = document.getElementById('archiveSearchInput');
    const archiveCatBar = document.getElementById('archiveCatBar');
    const archiveGrid = document.getElementById('archiveGrid');
    const archiveEmpty = document.getElementById('archiveEmptyMsg');
    const paginationBar = document.getElementById('archivePagination');
    let currentCat = 'all';
    let currentPage = 1;

    function renderArchive() {
      if (!archiveGrid) return;
      const q = (archiveInput ? archiveInput.value : '').trim().toLowerCase();
      const items = Array.from(archiveGrid.querySelectorAll('.archive-item'));
      const matched = [];

      items.forEach((item) => {
        const cat = item.getAttribute('data-cat') || '';
        const card = item.querySelector('.post-card');
        const txt = card ? (card.getAttribute('data-search') || '') : '';
        const okCat = currentCat === 'all' || cat === currentCat;
        const okSearch = !q || txt.includes(q);
        if (okCat && okSearch) {
          matched.push(item);
        } else {
          item.style.display = 'none';
        }
      });

      const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
      if (currentPage > totalPages) currentPage = totalPages;
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;

      matched.forEach((item, idx) => {
        item.style.display = idx >= start && idx < end ? '' : 'none';
      });

      if (archiveEmpty) {
        archiveEmpty.classList.toggle('hidden', matched.length > 0);
      }

      if (paginationBar) {
        if (totalPages <= 1) {
          paginationBar.classList.add('hidden');
          paginationBar.innerHTML = '';
        } else {
          paginationBar.classList.remove('hidden');
          let html = '';
          html += '<button type="button" class="page-btn" data-page="' + (currentPage - 1) + '"' + (currentPage <= 1 ? ' disabled' : '') + '>← Trước</button>';
          for (let p = 1; p <= totalPages; p++) {
            html += '<button type="button" class="page-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
          }
          html += '<button type="button" class="page-btn" data-page="' + (currentPage + 1) + '"' + (currentPage >= totalPages ? ' disabled' : '') + '>Sau →</button>';
          paginationBar.innerHTML = html;
          paginationBar.querySelectorAll('.page-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
              const next = Number(btn.getAttribute('data-page') || '1');
              if (!Number.isNaN(next) && next >= 1 && next <= totalPages) {
                currentPage = next;
                renderArchive();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            });
          });
        }
      }
    }

    if (archiveInput) {
      archiveInput.addEventListener('input', () => {
        currentPage = 1;
        renderArchive();
      });
    }
    if (archiveCatBar) {
      archiveCatBar.querySelectorAll('.cat-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          currentCat = btn.getAttribute('data-cat') || 'all';
          currentPage = 1;
          archiveCatBar.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          renderArchive();
        });
      });
    }
    renderArchive();
  </script>
</BaseLayout>

<style>
  .col-header {
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .col-header h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2rem;
  }
  .col-header p {
    margin: 0;
    color: var(--text-2);
  }
  .archive-tools {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .archive-search {
    display: block;
    flex: 0 0 auto;
    width: 100%;
    max-width: 720px;
    min-width: 0;
    height: 44px;
    min-height: 44px;
    max-height: 44px;
    line-height: normal;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 0.92rem;
    font-family: inherit;
    box-sizing: border-box;
    -webkit-appearance: none;
    appearance: none;
  }
  .cat-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cat-btn {
    min-height: 36px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
    font-size: 0.82rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
  }
  .cat-btn.active {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }
  .col-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 720px) {
    .col-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .col-grid.template-nytimes-light,
    .col-grid.template-obsidian-broadsheet,
    .col-grid.template-bbc-dark,
    .col-grid.template-monocle-magazine,
    .col-grid.template-guardian-portal,
    .col-grid.template-economist-digest,
    .col-grid.template-nordic-atlas {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  .pagination-bar {
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .pagination-bar :global(.page-btn) {
    min-width: 38px;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
  }
  .pagination-bar :global(.page-btn.active) {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }
  .pagination-bar :global(.page-btn:disabled) {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .empty-archive {
    color: var(--muted);
    padding: 20px 0;
  }
  .hidden {
    display: none;
  }
</style>
`;

  const articleDetailAstro = `---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import {
  estimateReadingTime,
  formatVietnameseDate,
  getPostCategory,
  getPostCategorySlug,
  getPostCover,
  getPostDate,
  getPostExcerpt,
  getPostSlug,
  getPostTags,
  getPostTitle,
  slugifyVi,
  withBase,
} from '../../utils/url';

export async function getStaticPaths() {
  const entries = (await getCollection('bai_viet'))
    .filter((e) => !e.data.nhap && !e.data.draft)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));
  return entries.map((entry) => ({
    params: { slug: getPostSlug(entry) },
    props: { entry, allEntries: entries },
  }));
}

const { entry, allEntries = [] } = Astro.props;
const { Content } = await render(entry);
const title = getPostTitle(entry);
const date = getPostDate(entry);
const excerpt = getPostExcerpt(entry);
const cover = getPostCover(entry);
const category = getPostCategory(entry);
const categorySlug = getPostCategorySlug(entry);
const tags = getPostTags(entry);
const minutes = estimateReadingTime(entry.body || '');
const resolvedAuthor = String(entry.data?.tac_gia || entry.data?.author || SITE_CONFIG.authorName);
const pageSlug = getPostSlug(entry);
const canonicalTarget =
  entry.data?.canonical_url ||
  \`\${SITE_CONFIG.pagesUrl.replace(/\\/+$/, '')}\${withBase(\`/bai-viet/\${pageSlug}/\`)}\`;

const currentIdx = allEntries.findIndex((p) => getPostSlug(p) === pageSlug);
const prevPost = currentIdx >= 0 && currentIdx + 1 < allEntries.length ? allEntries[currentIdx + 1] : null;
const nextPost = currentIdx > 0 ? allEntries[currentIdx - 1] : null;

const relatedPosts = allEntries
  .filter((other) => getPostSlug(other) !== pageSlug)
  .sort((a, b) => {
    const catA = getPostCategory(a) === category ? 2 : 0;
    const catB = getPostCategory(b) === category ? 2 : 0;
    const tagsA = getPostTags(a);
    const tagsB = getPostTags(b);
    const overlapA = tagsA.filter((t) => tags.includes(t)).length;
    const overlapB = tagsB.filter((t) => tags.includes(t)).length;
    return catB + overlapB - (catA + overlapA) || getPostDate(b).localeCompare(getPostDate(a));
  })
  .slice(0, 3);

const blogPostingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: entry.data?.seo_title || title,
  description: entry.data?.seo_description || excerpt,
  datePublished: date,
  mainEntityOfPage: canonicalTarget,
  ...(cover ? { image: cover } : {}),
  author: {
    '@type': 'Person',
    name: resolvedAuthor,
  },
  publisher: {
    '@type': 'Person',
    name: SITE_CONFIG.authorName,
  },
};
---

<BaseLayout
  title={entry.data?.seo_title || title}
  description={entry.data?.seo_description || excerpt}
  ogImage={cover}
  noindex={Boolean(entry.data?.noindex)}
  canonical={entry.data?.canonical_url}
  jsonLd={blogPostingJsonLd}
>
  <article class="article-wrap">
    <nav class="breadcrumb" aria-label="Điều hướng bài viết">
      <a href={withBase('/')}>Trang nhất</a>
      <span>/</span>
      <a href={withBase(\`/chuyen-muc/\${categorySlug}/\`)}>{category}</a>
      <span>/</span>
      <span class="crumb-cur">{title}</span>
    </nav>

    <header class="article-header">
      <div class="article-meta">
        <a class="meta-cat" href={withBase(\`/chuyen-muc/\${categorySlug}/\`)}>{category}</a>
        <span>·</span>
        <span>{formatVietnameseDate(date)}</span>
        <span>·</span>
        <span>{minutes} phút đọc</span>
      </div>
      <h1>{title}</h1>
      {excerpt && <p class="article-lead">{excerpt}</p>}
      <div class="article-byline">Bởi <strong>{resolvedAuthor}</strong></div>
    </header>

    {cover && (
      <figure class="article-cover">
        <img src={cover} alt={title} />
      </figure>
    )}

    <div class="prose">
      <Content />
    </div>

    {tags.length > 0 && (
      <div class="tag-row">
        <span class="tag-label">Chủ đề:</span>
        {tags.map((t, idx) => (
          <>
            {idx > 0 && <span> · </span>}
            <a href={withBase(\`/chu-de/\${slugifyVi(t)}/\`)}>#{t}</a>
          </>
        ))}
      </div>
    )}

    {(prevPost || nextPost) && (
      <nav class="prev-next-nav" aria-label="Bài viết trước và kế tiếp">
        {prevPost ? (
          <a class="pn-link pn-prev" href={withBase(\`/bai-viet/\${getPostSlug(prevPost)}/\`)}>
            <span class="pn-kicker">← Bài cũ hơn</span>
            <strong class="pn-title">{getPostTitle(prevPost)}</strong>
          </a>
        ) : (
          <span />
        )}
        {nextPost ? (
          <a class="pn-link pn-next" href={withBase(\`/bai-viet/\${getPostSlug(nextPost)}/\`)}>
            <span class="pn-kicker">Bài mới hơn →</span>
            <strong class="pn-title">{getPostTitle(nextPost)}</strong>
          </a>
        ) : (
          <span />
        )}
      </nav>
    )}

    <aside class="author-box">
      <div class="author-name">{resolvedAuthor}</div>
      <p class="author-bio">{SITE_CONFIG.authorBio}</p>
    </aside>

    {SITE_CONFIG.giscus?.enabled &&
      SITE_CONFIG.giscus.repo &&
      SITE_CONFIG.giscus.repoId &&
      SITE_CONFIG.giscus.categoryId && (
        <section class="comments-box" aria-label="Bình luận độc giả">
          <h2 class="comments-heading">Thảo luận &amp; Bình luận</h2>
          <script
            is:inline
            src="https://giscus.app/client.js"
            data-repo={SITE_CONFIG.giscus.repo}
            data-repo-id={SITE_CONFIG.giscus.repoId}
            data-category={SITE_CONFIG.giscus.category || 'Announcements'}
            data-category-id={SITE_CONFIG.giscus.categoryId}
            data-mapping="pathname"
            data-strict="0"
            data-reactions-enabled="1"
            data-emit-metadata="0"
            data-input-position="bottom"
            data-theme={SITE_CONFIG.themeMode === 'dark' ? 'dark' : 'light'}
            data-lang="vi"
            crossorigin="anonymous"
            async
          />
        </section>
      )}
  </article>

  {relatedPosts.length > 0 && (
    <section class="related-section">
      <h2 class="related-title">Bài viết liên quan</h2>
      <div class="related-grid">
        {relatedPosts.map((rel) => (
          <PostCard entry={rel} />
        ))}
      </div>
    </section>
  )}
</BaseLayout>

<style>
  .article-wrap {
    max-width: 720px;
    margin: 0 auto;
  }

  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--muted);
    margin-bottom: 20px;
  }

  .breadcrumb a {
    color: var(--text-2);
    white-space: nowrap;
  }

  .crumb-cur {
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 280px;
  }

  .article-header {
    padding-bottom: 22px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 26px;
  }

  .article-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--muted);
    margin-bottom: 12px;
  }

  .meta-cat {
    color: var(--link);
    font-weight: 600;
    text-transform: uppercase;
  }

  .article-header h1 {
    margin: 0 0 12px;
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.7rem);
    line-height: 1.15;
  }

  .article-lead {
    margin: 0 0 12px;
    font-size: 1.08rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  .article-byline {
    font-size: 0.88rem;
    color: var(--muted);
  }

  .tag-row {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--muted);
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag-row a {
    color: var(--link);
    font-weight: 500;
  }

  .prev-next-nav {
    margin-top: 28px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (min-width: 640px) {
    .prev-next-nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .pn-link {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: inherit;
    text-decoration: none !important;
  }

  .pn-link:hover {
    border-color: var(--link);
  }

  .pn-next {
    text-align: right;
  }

  .pn-kicker {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--link);
  }

  .pn-title {
    font-family: var(--font-display);
    font-size: 0.96rem;
    color: var(--text);
    line-height: 1.35;
  }

  .article-cover {
    margin: 0 0 28px;
  }

  .article-cover img {
    width: 100%;
    max-height: 440px;
    object-fit: cover;
    border-radius: 12px;
    border: 1px solid var(--border);
  }

  .author-box {
    margin-top: 32px;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .author-name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 1.05rem;
    margin-bottom: 6px;
  }

  .author-bio {
    margin: 0;
    font-size: 0.92rem;
    color: var(--text-2);
  }

  .related-section {
    max-width: 1120px;
    margin: 48px auto 0;
    padding-top: 28px;
    border-top: 1px solid var(--border);
  }

  .related-title {
    margin: 0 0 18px;
    font-family: var(--font-display);
    font-size: 1.35rem;
  }

  .related-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
  }

  @media (min-width: 640px) {
    .related-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 960px) {
    .related-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .comments-box {
    margin-top: 32px;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
  }

  .comments-heading {
    margin: 0 0 14px;
    font-family: var(--font-display);
    font-size: 1.2rem;
  }
</style>
`;

  const chuyenMucIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import {
  formatVietnameseDate,
  getPostCategory,
  getPostCategorySlug,
  getPostDate,
  getPostSlug,
  getPostTitle,
  withBase,
} from '../../utils/url';

const entries = (await getCollection('bai_viet'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

const map = new Map<string, { name: string; slug: string; posts: any[] }>();
for (const entry of entries) {
  const name = getPostCategory(entry);
  const slug = getPostCategorySlug(entry);
  const group = map.get(slug);
  if (group) {
    group.posts.push(entry);
  } else {
    map.set(slug, { name, slug, posts: [entry] });
  }
}
const categories = Array.from(map.values()).sort((a, b) => b.posts.length - a.posts.length);
---

<BaseLayout title="Chuyên mục" description="Danh mục tất cả chuyên mục bài viết và bài tiêu biểu.">
  <div class="page-head">
    <p class="page-kicker">Điều hướng nhiều trang · Danh bạ chuyên mục</p>
    <h1>Chuyên mục bài viết</h1>
    <p class="page-sub">Toàn bộ {categories.length} chuyên mục và {entries.length} bài viết đã xuất bản.</p>
  </div>

  {categories.length === 0 ? (
    <p style="color: var(--muted);">Chưa có chuyên mục nào.</p>
  ) : (
    <div class="cat-directory">
      {categories.map((cat, idx) => (
        <section class="cat-dir-card">
          <div class="cat-dir-head">
            <div>
              <span class="cat-num">0{idx + 1}</span>
              <h2>
                <a href={withBase(\`/chuyen-muc/\${cat.slug}/\`)}>{cat.name}</a>
              </h2>
            </div>
            <span class="cat-count">{cat.posts.length} bài viết</span>
          </div>
          <ul class="cat-post-list">
            {cat.posts.slice(0, 4).map((p) => (
              <li>
                <a href={withBase(\`/bai-viet/\${getPostSlug(p)}/\`)}>{getPostTitle(p)}</a>
                <span>{formatVietnameseDate(getPostDate(p))}</span>
              </li>
            ))}
          </ul>
          <div class="cat-dir-foot">
            <a href={withBase(\`/chuyen-muc/\${cat.slug}/\`) }>Xem toàn bộ chuyên mục {cat.name} →</a>
          </div>
        </section>
      ))}
    </div>
  )}
</BaseLayout>

<style>
  .page-head {
    padding-bottom: 20px;
    margin-bottom: 26px;
    border-bottom: 1px solid var(--border);
  }
  .page-kicker {
    margin: 0 0 8px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--link);
  }
  .page-head h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2.1rem;
  }
  .page-sub {
    margin: 0;
    color: var(--text-2);
  }
  .cat-directory {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 760px) {
    .cat-directory {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .cat-dir-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
  }
  .cat-dir-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .cat-num {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--link);
    margin-bottom: 4px;
  }
  .cat-dir-head h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.35rem;
  }
  .cat-dir-head h2 a {
    color: var(--text);
  }
  .cat-count {
    font-family: var(--font-mono);
    font-size: 0.76rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .cat-post-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }
  .cat-post-list li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: 0.92rem;
  }
  .cat-post-list li a {
    color: var(--text-2);
    font-weight: 500;
  }
  .cat-post-list li a:hover {
    color: var(--link);
  }
  .cat-post-list li span {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .cat-dir-foot {
    padding-top: 10px;
    border-top: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
</style>
`;

  const chuyenMucDetailAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import { getPostCategory, getPostCategorySlug, getPostDate, withBase } from '../../utils/url';

export async function getStaticPaths() {
  const entries = (await getCollection('bai_viet'))
    .filter((e) => !e.data.nhap && !e.data.draft)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

  const grouped = new Map<string, { name: string; slug: string; posts: any[] }>();
  for (const entry of entries) {
    const name = getPostCategory(entry);
    const slug = getPostCategorySlug(entry);
    const cur = grouped.get(slug);
    if (cur) {
      cur.posts.push(entry);
    } else {
      grouped.set(slug, { name, slug, posts: [entry] });
    }
  }
  const allCats = Array.from(grouped.values()).map((c) => ({
    name: c.name,
    slug: c.slug,
    count: c.posts.length,
  }));

  return Array.from(grouped.values()).map((group) => ({
    params: { slug: group.slug },
    props: {
      categoryName: group.name,
      categorySlug: group.slug,
      posts: group.posts,
      allCats,
    },
  }));
}

const { categoryName, categorySlug, posts = [], allCats = [] } = Astro.props;
---

<BaseLayout
  title={\`Chuyên mục: \${categoryName}\`}
  description={\`Danh sách bài viết thuộc chuyên mục \${categoryName}.\`}
>
  <nav class="breadcrumb">
    <a href={withBase('/')}>Trang nhất</a>
    <span>/</span>
    <a href={withBase('/chuyen-muc/')}>Chuyên mục</a>
    <span>/</span>
    <span>{categoryName}</span>
  </nav>

  <header class="page-head">
    <h1>{categoryName}</h1>
    <p>{posts.length} bài viết trong chuyên mục này.</p>
    {allCats.length > 1 && (
      <div class="cat-switch">
        {allCats.map((c: any) => (
          <a
            href={withBase(\`/chuyen-muc/\${c.slug}/\`) }
            class={c.slug === categorySlug ? 'switch-link active' : 'switch-link'}
          >
            {c.name} ({c.count})
          </a>
        ))}
      </div>
    )}
  </header>

  <div class={\`col-grid template-\${SITE_CONFIG.templateStyle}\`}>
    {posts.map((entry: any) => (
      <PostCard entry={entry} />
    ))}
  </div>
</BaseLayout>

<style>
  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--muted);
    margin-bottom: 16px;
  }
  .breadcrumb a {
    color: var(--text-2);
  }
  .page-head {
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .page-head h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2rem;
  }
  .page-head p {
    margin: 0;
    color: var(--text-2);
  }
  .cat-switch {
    margin-top: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .switch-link {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-2);
    font-size: 0.82rem;
    font-weight: 500;
    text-decoration: none !important;
    white-space: nowrap;
  }
  .switch-link.active {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }
  .col-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 720px) {
    .col-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .col-grid.template-nytimes-light,
    .col-grid.template-obsidian-broadsheet,
    .col-grid.template-bbc-dark,
    .col-grid.template-monocle-magazine,
    .col-grid.template-guardian-portal,
    .col-grid.template-economist-digest,
    .col-grid.template-nordic-atlas {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
`;

  const chuDeIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getPostTags, slugifyVi, withBase } from '../../utils/url';

const entries = (await getCollection('bai_viet')).filter((e) => !e.data.nhap && !e.data.draft);

const tagMap = new Map<string, { label: string; slug: string; count: number }>();
for (const entry of entries) {
  for (const tag of getPostTags(entry)) {
    const slug = slugifyVi(tag);
    const existing = tagMap.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      tagMap.set(slug, { label: tag, slug, count: 1 });
    }
  }
}
const tags = Array.from(tagMap.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
---

<BaseLayout title="Chủ đề & Từ khóa" description="Danh sách tất cả từ khóa và chủ đề bài viết.">
  <header class="page-head">
    <p class="page-kicker">Điều hướng nhiều trang · Chỉ mục từ khóa</p>
    <h1>Chủ đề nổi bật</h1>
    <p class="page-sub">Chọn một chủ đề để xem nhanh các bài viết cùng mạch nội dung.</p>
  </header>

  {tags.length === 0 ? (
    <p style="color: var(--muted);">Chưa có thẻ chủ đề nào được gắn cho bài viết.</p>
  ) : (
    <div class="tags-grid">
      {tags.map((tag) => (
        <a class="tag-card" href={withBase(\`/chu-de/\${tag.slug}/\`) }>
          <span class="tag-name">#{tag.label}</span>
          <span class="tag-count">{tag.count} bài</span>
        </a>
      ))}
    </div>
  )}
</BaseLayout>

<style>
  .page-head {
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .page-kicker {
    margin: 0 0 8px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--link);
  }
  .page-head h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2rem;
  }
  .page-sub {
    margin: 0;
    color: var(--text-2);
  }
  .tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px;
  }
  .tag-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    text-decoration: none !important;
    transition: border-color 0.16s ease, transform 0.16s ease;
  }
  .tag-card:hover {
    border-color: var(--link);
    transform: translateY(-1px);
  }
  .tag-name {
    font-family: var(--font-mono);
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--link);
  }
  .tag-count {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
  }
</style>
`;

  const chuDeDetailAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import { getPostDate, getPostTags, slugifyVi, withBase } from '../../utils/url';

export async function getStaticPaths() {
  const entries = (await getCollection('bai_viet'))
    .filter((e) => !e.data.nhap && !e.data.draft)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

  const grouped = new Map<string, { label: string; slug: string; posts: any[] }>();
  for (const entry of entries) {
    for (const tag of getPostTags(entry)) {
      const slug = slugifyVi(tag);
      const existing = grouped.get(slug);
      if (existing) {
        if (!existing.posts.includes(entry)) existing.posts.push(entry);
      } else {
        grouped.set(slug, { label: tag, slug, posts: [entry] });
      }
    }
  }

  return Array.from(grouped.values()).map((g) => ({
    params: { tag: g.slug },
    props: { tagLabel: g.label, posts: g.posts },
  }));
}

const { tagLabel, posts = [] } = Astro.props;
---

<BaseLayout title={\`Chủ đề: #\${tagLabel}\`} description={\`Các bài viết gắn thẻ #\${tagLabel}.\`} >
  <nav class="breadcrumb">
    <a href={withBase('/')}>Trang nhất</a>
    <span>/</span>
    <a href={withBase('/chu-de/')}>Chủ đề</a>
    <span>/</span>
    <span>#{tagLabel}</span>
  </nav>

  <header class="page-head">
    <h1>#{tagLabel}</h1>
    <p>{posts.length} bài viết mang từ khóa này.</p>
  </header>

  <div class={\`col-grid template-\${SITE_CONFIG.templateStyle}\`}>
    {posts.map((entry: any) => (
      <PostCard entry={entry} />
    ))}
  </div>
</BaseLayout>

<style>
  .breadcrumb {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--muted);
    margin-bottom: 16px;
  }
  .breadcrumb a {
    color: var(--text-2);
  }
  .page-head {
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .page-head h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2rem;
  }
  .page-head p {
    margin: 0;
    color: var(--text-2);
  }
  .col-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 720px) {
    .col-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (min-width: 1024px) {
    .col-grid.template-nytimes-light,
    .col-grid.template-obsidian-broadsheet,
    .col-grid.template-bbc-dark,
    .col-grid.template-monocle-magazine,
    .col-grid.template-guardian-portal,
    .col-grid.template-economist-digest,
    .col-grid.template-nordic-atlas {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
`;

  const luuTruIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import {
  estimateReadingTime,
  formatVietnameseDate,
  getPostCategory,
  getPostCategorySlug,
  getPostDate,
  getPostSlug,
  getPostTags,
  getPostTitle,
  withBase,
} from '../../utils/url';

const entries = (await getCollection('bai_viet'))
  .filter((e) => !e.data.nhap && !e.data.draft)
  .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));

const byYear = new Map<string, Map<string, any[]>>();
const catSet = new Set<string>();
const tagSet = new Set<string>();

for (const entry of entries) {
  const d = getPostDate(entry);
  const year = d.slice(0, 4) || 'Khác';
  const monthNum = d.slice(5, 7) || '01';
  const monthLabel = \`Tháng \${Number(monthNum)}/\${year}\`;
  catSet.add(getPostCategory(entry));
  for (const t of getPostTags(entry)) tagSet.add(t);
  if (!byYear.has(year)) byYear.set(year, new Map());
  const yMap = byYear.get(year)!;
  if (!yMap.has(monthLabel)) yMap.set(monthLabel, []);
  yMap.get(monthLabel)!.push(entry);
}

const years = Array.from(byYear.entries()).map(([year, monthsMap]) => ({
  year,
  months: Array.from(monthsMap.entries()).map(([label, items]) => ({ label, items })),
}));
---

<BaseLayout title="Lưu trữ theo dòng thời gian" description="Mục lục lưu trữ toàn bộ bài viết sắp xếp theo năm và tháng.">
  <header class="page-head">
    <p class="page-kicker">Điều hướng nhiều trang · Biên niên sử bài viết</p>
    <h1>Lưu trữ theo thời gian</h1>
    <div class="archive-stats">
      <span><strong>{entries.length}</strong> bài viết</span>
      <span>·</span>
      <span><strong>{catSet.size}</strong> chuyên mục</span>
      <span>·</span>
      <span><strong>{tagSet.size}</strong> chủ đề</span>
    </div>
  </header>

  {years.length === 0 ? (
    <p style="color: var(--muted);">Chưa có bài viết nào trong kho lưu trữ.</p>
  ) : (
    <div class="timeline">
      {years.map((y) => (
        <section class="year-block" id={\`nam-\${y.year}\`}>
          <h2 class="year-heading">{y.year}</h2>
          <div class="months-wrap">
            {y.months.map((m) => (
              <div class="month-block">
                <h3 class="month-heading">{m.label}</h3>
                <ul class="timeline-list">
                  {m.items.map((post) => (
                    <li class="timeline-item">
                      <time class="tl-date">{formatVietnameseDate(getPostDate(post))}</time>
                      <div class="tl-main">
                        <a class="tl-title" href={withBase(\`/bai-viet/\${getPostSlug(post)}/\`)}>
                          {getPostTitle(post)}
                        </a>
                        <div class="tl-meta">
                          <a href={withBase(\`/chuyen-muc/\${getPostCategorySlug(post)}/\`)}>
                            {getPostCategory(post)}
                          </a>
                          <span>·</span>
                          <span>{estimateReadingTime(post.body || '')} phút đọc</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )}
</BaseLayout>

<style>
  .page-head {
    padding-bottom: 20px;
    margin-bottom: 28px;
    border-bottom: 1px solid var(--border);
  }
  .page-kicker {
    margin: 0 0 8px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--link);
  }
  .page-head h1 {
    margin: 0 0 10px;
    font-family: var(--font-display);
    font-size: 2rem;
  }
  .archive-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--text-2);
  }
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .year-heading {
    margin: 0 0 16px;
    font-family: var(--font-display);
    font-size: 1.7rem;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--accent);
    display: inline-block;
  }
  .months-wrap {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .month-heading {
    margin: 0 0 10px;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--link);
  }
  .timeline-list {
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    overflow: hidden;
  }
  .timeline-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
  }
  .timeline-item:last-child {
    border-bottom: 0;
  }
  @media (min-width: 640px) {
    .timeline-item {
      flex-direction: row;
      align-items: baseline;
      gap: 20px;
    }
  }
  .tl-date {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--muted);
    white-space: nowrap;
    min-width: 92px;
  }
  .tl-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .tl-title {
    font-family: var(--font-display);
    font-size: 1.08rem;
    font-weight: 700;
    color: var(--text);
  }
  .tl-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--muted);
  }
</style>
`;

  const gioiThieuIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import { getPostCategory, withBase } from '../../utils/url';

const entries = (await getCollection('bai_viet')).filter((e) => !e.data.nhap && !e.data.draft);
const categoryCount = new Set(entries.map((e) => getPostCategory(e))).size;
const iconHref = withBase(SITE_CONFIG.siteIcon || '/favicon.svg');
---

<BaseLayout title="Giới thiệu" description={\`Giới thiệu về \${SITE_CONFIG.siteTitle} và tác giả \${SITE_CONFIG.authorName}.\`}>
  <article class="about-wrap">
    <header class="about-hero">
      <img class="about-logo" src={iconHref} alt={SITE_CONFIG.siteTitle} width="64" height="64" />
      <div>
        <p class="page-kicker">Giới thiệu ấn phẩm & Tác giả</p>
        <h1>{SITE_CONFIG.siteTitle}</h1>
        <p class="about-tagline">{SITE_CONFIG.tagline}</p>
      </div>
    </header>

    <section class="about-stats">
      <div class="stat-box">
        <span class="stat-val">{entries.length}</span>
        <span class="stat-lbl">Bài viết xuất bản</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">{categoryCount}</span>
        <span class="stat-lbl">Chuyên mục độc lập</span>
      </div>
      <div class="stat-box">
        <span class="stat-val">{SITE_CONFIG.authorName}</span>
        <span class="stat-lbl">Chủ bút</span>
      </div>
    </section>

    <section class="about-body prose">
      <h2>Về người viết</h2>
      <p>{SITE_CONFIG.authorBio}</p>
      <h2>Tôn chỉ xuất bản</h2>
      <p>
        <strong>{SITE_CONFIG.siteTitle}</strong> được xây dựng trên nền tảng tệp văn bản thuần Markdown
        và bộ khung tĩnh Astro 5, hướng tới sự bền vững và tốc độ đọc tức thì.
        Mọi bài viết đều thuộc toàn quyền sở hữu của tác giả, tối ưu trải nghiệm đọc lâu dài ở cả hai chế độ Sáng và Tối.
      </p>
    </section>

    <div class="about-actions">
      <a class="btn-primary" href={withBase('/bai-viet/')}>Khám phá kho bài viết</a>
      <a class="btn-secondary" href={withBase('/lien-he/')}>Kết nối & Liên hệ</a>
    </div>
  </article>
</BaseLayout>

<style>
  .about-wrap {
    max-width: 780px;
    margin: 0 auto;
  }
  .about-hero {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  @media (min-width: 640px) {
    .about-hero {
      flex-direction: row;
      align-items: center;
      gap: 22px;
    }
  }
  .about-logo {
    border-radius: 9999px;
    border: 1px solid var(--border);
    object-fit: cover;
    background: var(--surface);
    flex-shrink: 0;
  }
  .page-kicker {
    margin: 0 0 6px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--link);
  }
  .about-hero h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2.1rem;
  }
  .about-tagline {
    margin: 0;
    color: var(--text-2);
    font-size: 1.02rem;
  }
  .about-stats {
    margin: 24px 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 600px) {
    .about-stats {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  .stat-box {
    padding: 16px 18px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-val {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--text);
  }
  .stat-lbl {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    color: var(--muted);
  }
  .about-actions {
    margin-top: 28px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .btn-primary,
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 20px;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none !important;
    white-space: nowrap;
  }
  .btn-primary {
    background: var(--accent);
    color: var(--accent-text);
  }
  .btn-secondary {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }
</style>
`;

  const lienHeIndexAstro = `---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { SITE_CONFIG } from '../../cau_hinh/trang_web';
import { withBase } from '../../utils/url';

const channels = (SITE_CONFIG.liveChat?.channels || []).filter(
  (ch) => ch.enabled && ch.value && ch.value.trim().length > 0 && ch.id !== 'tawkto' && ch.id !== 'crisp'
);

function resolveChatHref(id: string, rawValue: string): string {
  const val = rawValue.trim();
  if (/^(https?:|mailto:|tel:)/i.test(val)) return val;
  if (id === 'zalo') return \`https://zalo.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'messenger') return \`https://m.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'telegram') return \`https://t.me/\${encodeURIComponent(val.replace(/^@/, ''))}\`;
  if (id === 'whatsapp') {
    const digits = val.replace(/[^0-9]/g, '');
    const normalized = /^0\\d{8,10}$/.test(digits) ? \`84\${digits.slice(1)}\` : digits;
    return \`https://wa.me/\${normalized}\`;
  }
  if (id === 'email') return \`mailto:\${val}\`;
  return val;
}

const rssUrl = \`\${SITE_CONFIG.pagesUrl.replace(/\\/+$/, '')}\${withBase('/rss.xml')}\`;
---

<BaseLayout title="Liên hệ & Theo dõi" description={\`Kênh liên hệ trực tiếp và nguồn cấp RSS của \${SITE_CONFIG.siteTitle}.\`}>
  <div class="contact-wrap">
    <header class="page-head">
      <p class="page-kicker">Kết nối trực tiếp · Theo dõi bản tin</p>
      <h1>Liên hệ & Theo dõi</h1>
      <p class="page-sub">
        Trao đổi trực tiếp với <strong>{SITE_CONFIG.authorName}</strong> hoặc đăng ký đọc bài mới qua RSS.
      </p>
    </header>

    <div class="contact-grid">
      <section class="contact-card">
        <h2>Kênh trò chuyện trực tiếp</h2>
        {channels.length > 0 ? (
          <div class="channel-list">
            {channels.map((ch) => (
              <a
                class="channel-item"
                href={resolveChatHref(ch.id, ch.value)}
                target={ch.id === 'email' ? undefined : '_blank'}
                rel={ch.id === 'email' ? undefined : 'noreferrer'}
              >
                <span>{ch.label || ch.id.toUpperCase()}</span>
                <span class="channel-go">Mở kênh →</span>
              </a>
            ))}
          </div>
        ) : (
          <p class="card-note">
            Tác giả có thể bật Zalo, Messenger, Telegram, WhatsApp hoặc Email trong mục Cấu hình Live Chat để hiển thị tại đây.
          </p>
        )}
      </section>

      <section class="contact-card">
        <h2>Theo dõi qua RSS</h2>
        <p class="card-note">
          Thêm địa chỉ RSS vào trình đọc tin ưa thích (Feedly, NetNewsWire, Reeder) để nhận bài mới không qua thuật toán.
        </p>
        <div class="rss-box">
          <code>{rssUrl}</code>
        </div>
        <div class="rss-actions">
          <a class="btn-rss" href={withBase('/rss.xml')}>Mở RSS Feed</a>
        </div>
      </section>
    </div>
  </div>
</BaseLayout>

<style>
  .contact-wrap {
    max-width: 920px;
    margin: 0 auto;
  }
  .page-head {
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .page-kicker {
    margin: 0 0 8px;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--link);
  }
  .page-head h1 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 2rem;
  }
  .page-sub {
    margin: 0;
    color: var(--text-2);
  }
  .contact-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  @media (min-width: 720px) {
    .contact-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .contact-card {
    padding: 22px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .contact-card h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 1.25rem;
  }
  .card-note {
    margin: 0;
    font-size: 0.92rem;
    color: var(--text-2);
    line-height: 1.6;
  }
  .channel-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .channel-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none !important;
  }
  .channel-item:hover {
    border-color: var(--link);
  }
  .channel-go {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--link);
  }
  .rss-box {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--text);
  }
  .rss-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .btn-rss {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    text-decoration: none !important;
    white-space: nowrap;
    background: var(--accent);
    color: var(--accent-text);
  }
</style>
`;

  const page404Astro = `---
import BaseLayout from '../layouts/BaseLayout.astro';
import { withBase } from '../utils/url';
---

<BaseLayout title="404 — Không tìm thấy trang" noindex={true}>
  <div class="box-404">
    <p class="code">404</p>
    <h1>Không tìm thấy nội dung này</h1>
    <p>Liên kết có thể đã thay đổi hoặc bài viết chưa được xuất bản.</p>
    <a class="btn-home" href={withBase('/')}>Quay về trang nhất</a>
  </div>
</BaseLayout>

<style>
  .box-404 {
    max-width: 480px;
    margin: 48px auto;
    padding: 32px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    text-align: center;
  }
  .code {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-size: 3rem;
    font-weight: 700;
  }
  h1 {
    margin: 0 0 10px;
    font-size: 1.3rem;
  }
  p {
    color: var(--text-2);
    margin: 0 0 20px;
  }
  .btn-home {
    display: inline-block;
    padding: 10px 18px;
    border-radius: 10px;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 600;
    text-decoration: none !important;
  }
</style>
`;

  const rssXmlTs = `import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import { getPostDate, getPostExcerpt, getPostSlug, getPostTitle, withBase } from '../utils/url';

function escXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ? site.toString().replace(/\\/+$/, '') : SITE_CONFIG.pagesUrl.replace(/\\/+$/, '');
  const posts = (await getCollection('bai_viet'))
    .filter((e) => !e.data.nhap && !e.data.draft && !e.data.noindex)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)))
    .slice(0, 40);

  const items = posts
    .map((entry) => {
      const slug = getPostSlug(entry);
      const link = \`\${origin}\${withBase(\`/bai-viet/\${slug}/\`)}\`;
      const rawDate = getPostDate(entry);
      const parsedMs = Date.parse(rawDate);
      const pubDate = Number.isNaN(parsedMs) ? new Date().toUTCString() : new Date(parsedMs).toUTCString();
      return [
        '    <item>',
        \`      <title>\${escXml(getPostTitle(entry))}</title>\`,
        \`      <link>\${escXml(link)}</link>\`,
        \`      <guid isPermaLink="true">\${escXml(link)}</guid>\`,
        \`      <pubDate>\${escXml(pubDate)}</pubDate>\`,
        \`      <description>\${escXml(getPostExcerpt(entry))}</description>\`,
        '    </item>',
      ].join('\\n');
    })
    .join('\\n');

  const homeUrl = \`\${origin}\${withBase('/')}\`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    \`    <title>\${escXml(SITE_CONFIG.siteTitle)}</title>\`,
    \`    <link>\${escXml(homeUrl)}</link>\`,
    \`    <description>\${escXml(SITE_CONFIG.tagline)}</description>\`,
    '    <language>vi</language>',
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
`;

  const duAnIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getPostCover, getPostDate, getPostExcerpt, getPostSlug, getPostTitle, withBase } from '../../utils/url';

let entries: any[] = [];
try {
  entries = (await getCollection('du_an'))
    .filter((e) => !e.data.nhap && !e.data.draft)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));
} catch {}
---

<BaseLayout title="Dự án" description="Danh sách dự án phần mềm và sản phẩm sáng tạo.">
  <header class="page-head">
    <p class="page-kicker">Hồ sơ công việc</p>
    <h1>Dự án đã thực hiện</h1>
    <p class="page-sub">Tổng hợp các dự án kỹ thuật, công cụ nguồn mở và sản phẩm cá nhân.</p>
  </header>

  {entries.length === 0 ? (
    <p class="empty-msg">Chưa có dự án nào được xuất bản.</p>
  ) : (
    <div class="col-grid">
      {entries.map((entry) => {
        const slug = getPostSlug(entry);
        const title = getPostTitle(entry);
        const excerpt = getPostExcerpt(entry);
        const cover = getPostCover(entry);
        const techs = Array.isArray(entry.data?.cong_nghe)
          ? entry.data.cong_nghe
          : Array.isArray(entry.data?.tags)
          ? entry.data.tags
          : [];
        return (
          <article class="proj-card">
            {cover && (
              <a href={withBase(\`/du-an/\${slug}/\`) } class="proj-cover">
                <img src={cover} alt={title} loading="lazy" />
              </a>
            )}
            <div class="proj-body">
              <h2><a href={withBase(\`/du-an/\${slug}/\`) }>{title}</a></h2>
              {excerpt && <p>{excerpt}</p>}
              {techs.length > 0 && (
                <div class="tech-list">
                  {techs.slice(0, 5).map((t: string) => <span>{t}</span>)}
                </div>
              )}
              <div class="proj-actions">
                <a class="btn-main" href={withBase(\`/du-an/\${slug}/\`) }>Chi tiết →</a>
                {entry.data?.link_demo && (
                  <a class="btn-sub" href={entry.data.link_demo} target="_blank" rel="noreferrer">Demo ↗</a>
                )}
                {entry.data?.link_github && (
                  <a class="btn-sub" href={entry.data.link_github} target="_blank" rel="noreferrer">GitHub ↗</a>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  )}
</BaseLayout>

<style>
  .page-head { padding-bottom: 20px; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
  .page-kicker { margin: 0 0 8px; font-family: var(--font-mono); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--link); }
  .page-head h1 { margin: 0 0 8px; font-family: var(--font-display); font-size: 2rem; }
  .page-sub, .empty-msg { color: var(--text-2); margin: 0; }
  .col-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 760px) { .col-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .proj-card { border: 1px solid var(--border); border-radius: 12px; background: var(--card); overflow: hidden; display: flex; flex-direction: column; }
  .proj-cover { aspect-ratio: 16/9; display: block; overflow: hidden; background: var(--surface); border-bottom: 1px solid var(--border); }
  .proj-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .proj-body { padding: 18px 20px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .proj-body h2 { margin: 0; font-family: var(--font-display); font-size: 1.3rem; }
  .proj-body h2 a { color: var(--text); }
  .proj-body p { margin: 0; font-size: 0.92rem; color: var(--text-2); }
  .tech-list { display: flex; flex-wrap: wrap; gap: 6px; font-family: var(--font-mono); font-size: 0.72rem; color: var(--link); }
  .tech-list span { padding: 2px 8px; border-radius: 6px; background: var(--surface); border: 1px solid var(--border); }
  .proj-actions { margin-top: auto; padding-top: 8px; display: flex; flex-wrap: wrap; gap: 8px; }
  .btn-main, .btn-sub { display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 600; text-decoration: none !important; }
  .btn-main { background: var(--accent); color: var(--accent-text); }
  .btn-sub { border: 1px solid var(--border); background: var(--surface); color: var(--text); }
</style>
`;

  const duAnDetailAstro = `---
import { getCollection, render } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getPostCover, getPostExcerpt, getPostSlug, getPostTitle, withBase } from '../../utils/url';

export async function getStaticPaths() {
  let entries: any[] = [];
  try {
    entries = (await getCollection('du_an')).filter((e) => !e.data.nhap && !e.data.draft);
  } catch {}
  return entries.map((entry) => ({
    params: { slug: getPostSlug(entry) },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
const title = getPostTitle(entry);
const excerpt = getPostExcerpt(entry);
const cover = getPostCover(entry);
---

<BaseLayout title={title} description={excerpt} ogImage={cover}>
  <article class="detail-wrap">
    <nav class="breadcrumb">
      <a href={withBase('/')}>Trang nhất</a>
      <span>/</span>
      <a href={withBase('/du-an/')}>Dự án</a>
      <span>/</span>
      <span>{title}</span>
    </nav>
    <header class="detail-head">
      <h1>{title}</h1>
      {excerpt && <p class="lead">{excerpt}</p>}
      <div class="links">
        {entry.data?.link_demo && (
          <a class="btn-main" href={entry.data.link_demo} target="_blank" rel="noreferrer">Mở Demo ↗</a>
        )}
        {entry.data?.link_github && (
          <a class="btn-sub" href={entry.data.link_github} target="_blank" rel="noreferrer">Mã nguồn GitHub ↗</a>
        )}
      </div>
    </header>
    {cover && (
      <figure class="detail-cover">
        <img src={cover} alt={title} />
      </figure>
    )}
    <div class="prose">
      <Content />
    </div>
  </article>
</BaseLayout>

<style>
  .detail-wrap { max-width: 760px; margin: 0 auto; }
  .breadcrumb { display: flex; flex-wrap: wrap; gap: 8px; font-family: var(--font-mono); font-size: 0.78rem; color: var(--muted); margin-bottom: 18px; }
  .breadcrumb a { color: var(--text-2); }
  .detail-head { padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
  .detail-head h1 { margin: 0 0 10px; font-family: var(--font-display); font-size: clamp(1.8rem, 4vw, 2.5rem); }
  .lead { margin: 0 0 14px; color: var(--text-2); font-size: 1.05rem; }
  .links { display: flex; flex-wrap: wrap; gap: 10px; }
  .btn-main, .btn-sub { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border-radius: 8px; font-size: 0.86rem; font-weight: 600; text-decoration: none !important; }
  .btn-main { background: var(--accent); color: var(--accent-text); }
  .btn-sub { border: 1px solid var(--border); background: var(--surface); color: var(--text); }
  .detail-cover { margin: 0 0 24px; }
  .detail-cover img { width: 100%; max-height: 420px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); }
</style>
`;

  const sachIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getPostCover, getPostDate, getPostExcerpt, getPostTitle } from '../../utils/url';

let entries: any[] = [];
try {
  entries = (await getCollection('sach'))
    .filter((e) => !e.data.nhap && !e.data.draft)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));
} catch {}
---

<BaseLayout title="Tủ sách & Ebook" description="Danh mục sách và tài liệu chuyên sâu.">
  <header class="page-head">
    <p class="page-kicker">Ấn phẩm &amp; Đọc sách</p>
    <h1>Tủ sách &amp; Ebook</h1>
    <p class="page-sub">Những cuốn sách biên soạn và tài liệu lưu trữ.</p>
  </header>

  {entries.length === 0 ? (
    <p class="empty-msg">Chưa có đầu sách nào được xuất bản.</p>
  ) : (
    <div class="book-grid">
      {entries.map((entry) => {
        const title = getPostTitle(entry);
        const excerpt = getPostExcerpt(entry);
        const cover = getPostCover(entry);
        const formats = Array.isArray(entry.data?.dinh_dang) ? entry.data.dinh_dang : [];
        return (
          <article class="book-card">
            {cover && (
              <div class="book-cover"><img src={cover} alt={title} loading="lazy" /></div>
            )}
            <div class="book-body">
              <h2>{title}</h2>
              {entry.data?.tac_gia && <div class="book-author">Tác giả: {entry.data.tac_gia}</div>}
              {excerpt && <p>{excerpt}</p>}
              {formats.length > 0 && (
                <div class="book-meta">{formats.join(' · ')}</div>
              )}
              {entry.data?.link_mua && (
                <a class="book-btn" href={entry.data.link_mua} target="_blank" rel="noreferrer">
                  Xem chi tiết / Tải về ↗
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  )}
</BaseLayout>

<style>
  .page-head { padding-bottom: 20px; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
  .page-kicker { margin: 0 0 8px; font-family: var(--font-mono); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--link); }
  .page-head h1 { margin: 0 0 8px; font-family: var(--font-display); font-size: 2rem; }
  .page-sub, .empty-msg { color: var(--text-2); margin: 0; }
  .book-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 720px) { .book-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .book-card { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 12px; background: var(--card); overflow: hidden; }
  .book-cover { aspect-ratio: 16/10; overflow: hidden; background: var(--surface); border-bottom: 1px solid var(--border); }
  .book-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .book-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .book-body h2 { margin: 0; font-family: var(--font-display); font-size: 1.25rem; }
  .book-author, .book-meta { font-family: var(--font-mono); font-size: 0.76rem; color: var(--muted); }
  .book-body p { margin: 0; font-size: 0.92rem; color: var(--text-2); }
  .book-btn { margin-top: auto; align-self: flex-start; display: inline-flex; align-items: center; min-height: 38px; padding: 0 14px; border-radius: 8px; background: var(--accent); color: var(--accent-text); font-size: 0.84rem; font-weight: 600; text-decoration: none !important; }
</style>
`;

  const cuaHangIndexAstro = `---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getPostCover, getPostDate, getPostExcerpt, getPostTitle } from '../../utils/url';

let entries: any[] = [];
try {
  entries = (await getCollection('cua_hang'))
    .filter((e) => !e.data.nhap && !e.data.draft)
    .sort((a, b) => getPostDate(b).localeCompare(getPostDate(a)));
} catch {}
---

<BaseLayout title="Cửa hàng & Tài nguyên" description="Sản phẩm số, mẫu giao diện và tài nguyên chọn lọc.">
  <header class="page-head">
    <p class="page-kicker">Cửa hàng số</p>
    <h1>Sản phẩm &amp; Tài nguyên</h1>
    <p class="page-sub">Bộ công cụ, ebook và tài liệu hữu ích.</p>
  </header>

  {entries.length === 0 ? (
    <p class="empty-msg">Hiện chưa có sản phẩm nào.</p>
  ) : (
    <div class="shop-grid">
      {entries.map((entry) => {
        const title = getPostTitle(entry);
        const excerpt = getPostExcerpt(entry);
        const cover = getPostCover(entry);
        return (
          <article class="shop-card">
            {cover && (
              <div class="shop-cover"><img src={cover} alt={title} loading="lazy" /></div>
            )}
            <div class="shop-body">
              <h2>{title}</h2>
              {entry.data?.gia && (
                <div class="shop-price">
                  <strong>{entry.data.gia}</strong>
                  {entry.data?.gia_goc && <s>{entry.data.gia_goc}</s>}
                </div>
              )}
              {excerpt && <p>{excerpt}</p>}
              {entry.data?.link_mua && (
                <a class="shop-btn" href={entry.data.link_mua} target="_blank" rel="noreferrer">
                  Đặt mua / Nhận tài nguyên ↗
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  )}
</BaseLayout>

<style>
  .page-head { padding-bottom: 20px; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
  .page-kicker { margin: 0 0 8px; font-family: var(--font-mono); font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--link); }
  .page-head h1 { margin: 0 0 8px; font-family: var(--font-display); font-size: 2rem; }
  .page-sub, .empty-msg { color: var(--text-2); margin: 0; }
  .shop-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 720px) { .shop-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .shop-card { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 12px; background: var(--card); overflow: hidden; }
  .shop-cover { aspect-ratio: 16/10; overflow: hidden; background: var(--surface); border-bottom: 1px solid var(--border); }
  .shop-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .shop-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .shop-body h2 { margin: 0; font-family: var(--font-display); font-size: 1.2rem; }
  .shop-price { display: flex; align-items: baseline; gap: 8px; font-family: var(--font-mono); color: var(--link); font-size: 0.96rem; }
  .shop-price s { color: var(--muted); font-size: 0.8rem; }
  .shop-body p { margin: 0; font-size: 0.9rem; color: var(--text-2); }
  .shop-btn { margin-top: auto; align-self: flex-start; display: inline-flex; align-items: center; min-height: 38px; padding: 0 14px; border-radius: 8px; background: var(--accent); color: var(--accent-text); font-size: 0.84rem; font-weight: 600; text-decoration: none !important; }
</style>
`;

  const sitemapXmlTs = `import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../cau_hinh/trang_web';
import {
  getPostCategorySlug,
  getPostDate,
  getPostSlug,
  getPostTags,
  slugifyVi,
  withBase,
} from '../utils/url';

function escXml(str: string): string {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ? site.toString().replace(/\\/+$/, '') : SITE_CONFIG.pagesUrl.replace(/\\/+$/, '');
  const posts = (await getCollection('bai_viet')).filter(
    (e) => !e.data.nhap && !e.data.draft && !e.data.noindex
  );

  let projects: any[] = [];
  let books: any[] = [];
  let shop: any[] = [];
  try {
    projects = (await getCollection('du_an')).filter((e) => !e.data.nhap && !e.data.draft);
  } catch {}
  try {
    books = (await getCollection('sach')).filter((e) => !e.data.nhap && !e.data.draft);
  } catch {}
  try {
    shop = (await getCollection('cua_hang')).filter((e) => !e.data.nhap && !e.data.draft);
  } catch {}

  const todayStr = new Date().toISOString().slice(0, 10);
  const staticRoutes = [
    '/',
    '/bai-viet/',
    '/chuyen-muc/',
    '/chu-de/',
    '/luu-tru/',
    '/gioi-thieu/',
    '/lien-he/',
    ...(projects.length > 0 ? ['/du-an/'] : []),
    ...(books.length > 0 ? ['/sach/'] : []),
    ...(shop.length > 0 ? ['/cua-hang/'] : []),
  ];
  const categorySlugs = Array.from(new Set(posts.map((p) => getPostCategorySlug(p))));
  const tagSlugs = Array.from(
    new Set(posts.flatMap((p) => getPostTags(p).map((t) => slugifyVi(t))))
  );

  const urls = [
    ...staticRoutes.map((r) => ({
      loc: \`\${origin}\${withBase(r)}\`,
      lastmod: todayStr,
    })),
    ...categorySlugs.map((slug) => ({
      loc: \`\${origin}\${withBase(\`/chuyen-muc/\${slug}/\`)}\`,
      lastmod: todayStr,
    })),
    ...tagSlugs.map((slug) => ({
      loc: \`\${origin}\${withBase(\`/chu-de/\${slug}/\`)}\`,
      lastmod: todayStr,
    })),
    ...posts.map((p) => ({
      loc: \`\${origin}\${withBase(\`/bai-viet/\${getPostSlug(p)}/\`)}\`,
      lastmod: getPostDate(p),
    })),
    ...projects.map((p) => ({
      loc: \`\${origin}\${withBase(\`/du-an/\${getPostSlug(p)}/\`)}\`,
      lastmod: getPostDate(p),
    })),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) => \`  <url><loc>\${escXml(u.loc)}</loc><lastmod>\${escXml(u.lastmod)}</lastmod></url>\`
    ),
    '</urlset>',
    '',
  ].join('\\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
`;

  const makeMarkdown = (fm: Record<string, any>, body: string) =>
    `---\n${dumpYaml(fm, { lineWidth: -1 }).trim()}\n---\n\n${body.trim()}\n`;

  interface StarterSeed {
    fileName: string;
    coverIndex: 1 | 2 | 3 | 4 | 5 | 6;
    title: string;
    category: string;
    categorySlug: string;
    slug: string;
    tags: string[];
    excerpt: string;
    date: string;
    body: string;
  }

  const STARTER_SEEDS_BY_TEMPLATE: Record<AstroTemplateId, StarterSeed[]> = {
    'newyorker-light': [
      {
        fileName: 'giu-tam-tri-tinh-tai.md',
        coverIndex: 1,
        title: 'Nghệ thuật giữ tâm trí tĩnh tại giữa dòng tin tức hối hả',
        category: 'Tiểu luận · Văn hoá',
        categorySlug: 'tieu-luan-van-hoa',
        slug: 'giu-tam-tri-tinh-tai',
        tags: ['tieu-luan', 'van-hoa', 'dao-ky'],
        excerpt:
          'Một bài tiểu luận về thói quen viết chậm, đọc sâu và giữ một thư phòng chữ nghĩa độc lập khỏi thuật toán trên ' +
          siteTitle +
          '.',
        date: today,
        body: `Giữa dòng chảy thông tin ngắn hạn thay đổi từng phút, việc giữ một không gian viết lách chậm rãi giống như mở một ô cửa nhìn ra khu vườn tĩnh lặng. **${siteTitle}** được ${authorName} dựng nên từ tinh thần đó: mỗi bài viết là một mảnh suy tư có đầu có cuối, không chạy theo lượt bấm vội vàng.

## Đọc chậm để hiểu sâu

Khi tốc độ lướt tin tăng lên, khả năng kiên nhẫn với một lập luận kéo dài bảy tám trăm chữ lại trở thành điều hiếm hoi. Tạp chí văn chương truyền thống tồn tại bền bỉ hàng trăm năm bởi họ tôn trọng nhịp thở tự nhiên của người viết lẫn người đọc.

> Một trang viết tốt không chỉ truyền đạt thông tin, mà còn tạo ra khoảng lặng để người đọc tự đối thoại với chính mình.

## Giữ độc lập khỏi thuật toán

- **Chữ nghĩa thuần Markdown**: Lưu trữ ngay dưới dạng tệp văn bản thuần dưới quyền kiểm soát 100% của bạn.
- **Nhịp trình bày thư thái**: Độ rộng dòng chữ vừa tầm mắt, giấy ngà dịu nhẹ và hỗ trợ bật tắt chế độ Sáng/Tối bất cứ lúc nào.
- **Định danh rõ ràng**: Tích hợp sẵn dữ liệu cấu trúc \`BlogPosting\`, RSS Feed và Sitemap chuẩn mực.`,
      },
      {
        fileName: 'nhip-cau-chu-tap-chi-van-chuong.md',
        coverIndex: 2,
        title: 'Bàn về nhịp câu chữ trong tạp chí văn chương hiện đại',
        category: 'Văn chương',
        categorySlug: 'van-chuong',
        slug: 'nhip-cau-chu-tap-chi-van-chuong',
        tags: ['van-chuong', 'bien-tap', 'serif'],
        excerpt:
          'Cách sắp xếp độ dài đoạn văn, đề mục và khoảng trống để trang tiểu luận giữ được sự trang nhã cổ điển trên màn hình điện thoại.',
        date: dayOffsetStr(1),
        body: `## Nhịp điệu của đoạn văn và khoảng trắng

Một bài tiểu luận dù giàu ý tưởng đến đâu cũng khó đi hết lòng người đọc nếu thiếu nhịp nghỉ hợp lý. Xen kẽ giữa những đoạn phân tích chiều sâu là một trích dẫn súc tích hay một tiêu đề phụ giàu sức gợi.

### Ba nguyên tắc biên tập chữ nghĩa

1. **Mở đầu giàu hình ảnh**: Đưa người đọc bước thẳng vào bối cảnh câu chuyện trong ba câu đầu.
2. **Đề mục vừa đủ**: Chia mạch ý thành 2–4 chặng lớn giúp đọc trên điện thoại vẫn mạch lạc.
3. **Kết bài dư âm**: Để lại một câu hỏi mở hoặc một suy ngẫm đọng lại lâu hơn sau khi khép trang.`,
      },
      {
        fileName: 'ghi-chep-so-tay-bia-vai.md',
        coverIndex: 3,
        title: 'Ghi chép bên tách cà phê sáng và cuốn sổ tay bìa vải',
        category: 'Thư phòng',
        categorySlug: 'thu-phong',
        slug: 'ghi-chep-so-tay-bia-vai',
        tags: ['so-tay', 'thu-phong', 'ghi-chep'],
        excerpt:
          'Vì sao thói quen ghi chép mỗi sáng biến thành kho tư liệu quý giá cho những bài viết dài hơi về sau.',
        date: dayOffsetStr(2),
        body: `## Từ trang giấy nháp đến kho lưu trữ số

Mỗi ý tưởng lớn hiếm khi xuất hiện trọn vẹn ngay lập tức. Chúng thường bắt đầu từ một câu ghi chú vội bên lề sách, một đoạn quan sát ngoài phố hay một thắc mắc nhỏ buổi sớm mai.

## Xuất bản đơn giản cùng Đạo Ký

Khi chuyển những ghi chép ấy vào kho Markdown trên **${siteTitle}**, bạn giữ nguyên được tính nguyên bản của giọng văn cá nhân và lưu giữ trọn đời trên GitHub Pages.`,
      },
    ],
    'nytimes-light': [
      {
        fileName: 'bo-cuc-bao-in-ro-rang.md',
        coverIndex: 1,
        title: 'Vì sao các toà soạn lớn quay lại bố cục báo in rõ ràng?',
        category: 'Tiêu điểm · Phân tích',
        categorySlug: 'tieu-diem',
        slug: 'bo-cuc-bao-in-ro-rang',
        tags: ['bao-chi', 'bo-cuc', 'editorial'],
        excerpt:
          'Cấu trúc cột tin mạch lạc, đường kẻ chỉ sắc nét và hệ phân cấp tiêu đề giúp độc giả của ' +
          siteTitle +
          ' nắm bắt vấn đề trong vài giây.',
        date: today,
        body: `Các ấn phẩm tin tức và phân tích uy tín đều chia sẻ một triết lý thiết kế chung: đừng bắt độc giả phải đoán xem đâu là bài quan trọng nhất trên trang. Trên **${siteTitle}**, bài tiêu điểm được đặt trang trọng ngay dưới măng-sét để dẫn dắt toàn bộ câu chuyện trong ngày.

## Sức mạnh của hệ phân cấp báo in

Một đường kẻ 1px sắc nét, một dòng kicker ngắn bằng font Monospace kết hợp cùng tiêu đề Serif khổ lớn đủ sức tạo ra trật tự thị giác rõ ràng mà không cần bất kỳ hiệu ứng rối mắt nào.

- **Bài tiêu điểm (Lead Story)**: Tập trung trọn vẹn vào câu chuyện trung tâm và hình ảnh chủ đạo.
- **Lưới tin theo chuyên mục**: Cho phép độc giả lướt nhanh tiêu đề, tóm tắt và thời gian đọc ước lượng.
- **Chế độ Sáng / Tối linh hoạt**: Chuyển đổi mượt mà chỉ bằng một chạm ngay trên thanh tiêu đề.`,
      },
      {
        fileName: 'kien-truc-web-tinh-github-pages.md',
        coverIndex: 2,
        title: 'Toàn cảnh kiến trúc web tĩnh tốc độ cao trên GitHub Pages',
        category: 'Kỹ thuật',
        categorySlug: 'ky-thuat',
        slug: 'kien-truc-web-tinh-github-pages',
        tags: ['astro', 'web-tinh', 'hieu-nang'],
        excerpt:
          'Astro biên dịch trước toàn bộ HTML/CSS giúp trang blog đạt điểm tải gần như tức thì ở mọi nơi.',
        date: dayOffsetStr(1),
        body: `## Không cơ sở dữ liệu cồng kềnh, không chi phí vận hành

Thay vì chờ máy chủ truy vấn mỗi khi có người mở bài viết, toàn bộ các trang trên **${siteTitle}** được biên dịch sẵn thành tệp tĩnh siêu nhẹ. Kết hợp với mạng phân phối toàn cầu của GitHub Pages, thời gian phản hồi đầu tiên luôn ở mức thấp nhất.

### Lợi ích thực tế cho người viết

1. **Ổn định tuyệt đối**: Không lo sập cơ sở dữ liệu hay lỗ hổng plugin.
2. **Bảo mật lịch sử sửa đổi**: Mọi lần cập nhật nội dung đều nằm gọn trong lịch sử commit của Git.`,
      },
      {
        fileName: 'chuan-seo-an-pham-bao-chi.md',
        coverIndex: 3,
        title: 'Chuẩn SEO tự nhiên cho ấn phẩm báo chí cá nhân',
        category: 'SEO & Dữ liệu',
        categorySlug: 'seo-du-lieu',
        slug: 'chuan-seo-an-pham-bao-chi',
        tags: ['seo', 'json-ld', 'rss'],
        excerpt:
          'Từ Sitemap XML, OpenGraph đến dữ liệu có cấu trúc BlogPosting — mọi tiêu chuẩn cốt lõi đều được sinh tự động.',
        date: dayOffsetStr(2),
        body: `## Viết hay đi đôi với cấu trúc kỹ thuật chuẩn

Mỗi bài viết xuất bản từ Đạo Ký lên **${siteTitle}** đều tự động sở hữu thẻ Meta chuẩn xác, URL slug sạch tiếng Việt không dấu, Sitemap XML cập nhật liên tục và JSON-LD \`BlogPosting\` để công cụ tìm kiếm hiểu đúng chủ đề lẫn tác giả **${authorName}**.`,
      },
      {
        fileName: 'luong-tin-chuyen-sau-hang-tuan.md',
        coverIndex: 4,
        title: 'Sắp xếp chuyên mục tin phân tích & bản tin cuối tuần',
        category: 'Bình luận',
        categorySlug: 'binh-luan',
        slug: 'luong-tin-chuyen-sau-hang-tuan',
        tags: ['chuyen-muc', 'ban-tin', 'nytimes'],
        excerpt:
          'Giữ nhịp xuất bản đều đặn theo chuyên mục giúp kho bài viết ngày càng có chiều sâu và dễ tra cứu.',
        date: dayOffsetStr(3),
        body: `## Trật tự từ những bản tin định kỳ

Khi phân loại rõ ràng giữa **Tiêu điểm**, **Kỹ thuật**, **SEO & Dữ liệu** và **Bình luận**, người đọc mới ghé **${siteTitle}** có thể lọc đúng chủ đề quan tâm ngay trong kho lưu trữ.`,
      },
    ],
    'bbc-dark': [
      {
        fileName: 'trang-tin-da-phuong-tien.md',
        coverIndex: 1,
        title: 'Tổ chức trang tin đa phương tiện & video YouTube sắc bén',
        category: 'Thời sự · Media',
        categorySlug: 'thoi-su-media',
        slug: 'trang-tin-da-phuong-tien',
        tags: ['media', 'studio', 'video'],
        excerpt:
          'Phong cách phòng tin tương phản cao trên ' +
          siteTitle +
          ' làm nổi bật ảnh bìa khổ rộng, trích xuất trực tiếp từ video hoặc ảnh chụp thực tế.',
        date: today,
        body: `Trong kỷ nguyên nội dung đa phương tiện, hình ảnh đại diện 16:9 và nhịp lưới thẻ tin hiện đại quyết định ấn tượng đầu tiên của độc giả. Giao diện **BBC Studio** trên **${siteTitle}** đặt trọng tâm vào độ tương phản sắc nét và điểm nhấn đỏ thẫm đặc trưng phòng tin.

## Tối ưu ảnh bìa và video nhúng

- **Ảnh chụp trực tiếp từ điện thoại**: Được nén tự động sang WebP nhẹ nhưng giữ trọn độ chi tiết.
- **Lấy ảnh thumbnail YouTube**: Dán đường dẫn video là có ngay ảnh bìa phân giải cao cho bài phân tích hoặc podcast.
- **Hỗ trợ Sáng / Tối chủ động**: Phù hợp cả khi đọc ngoài trời lẫn trong phòng tối.`,
      },
      {
        fileName: 'trai-nghiem-doc-di-dong.md',
        coverIndex: 2,
        title: 'Góc nhìn quốc tế: Tối ưu trải nghiệm đọc trên màn hình nhỏ',
        category: 'Góc nhìn',
        categorySlug: 'goc-nhin',
        slug: 'trai-nghiem-doc-di-dong',
        tags: ['mobile', 'ui-ux', 'doc-nhanh'],
        excerpt:
          'Thiết kế ưu tiên điện thoại giúp người đọc lướt tiêu điểm, tìm kiếm và lọc chuyên mục mượt mà bằng một ngón tay.',
        date: dayOffsetStr(1),
        body: `## 70% độc giả đọc tin trên thiết bị cầm tay

Từ kích thước nút chạm tối thiểu 44px đến khoảng cách lề gọn gàng không bị tràn ngang, từng khối giao diện trên **${siteTitle}** đều được cân chỉnh để đọc dễ chịu trên cả màn hình 375px lẫn màn hình máy tính rộng.`,
      },
      {
        fileName: 'bien-tap-markdown-di-dong.md',
        coverIndex: 3,
        title: 'Quy trình biên tập và xuất bản Markdown từ điện thoại',
        category: 'Quy trình',
        categorySlug: 'quy-trinh',
        slug: 'bien-tap-markdown-di-dong',
        tags: ['markdown', 'workflow', 'xuat-ban'],
        excerpt:
          'Viết nháp nhanh mọi lúc mọi nơi với thanh công cụ định dạng ổn định ngay phía trên bàn phím.',
        date: dayOffsetStr(2),
        body: `## Biến mọi khoảnh khắc thành bài viết hoàn chỉnh

Với trình soạn thảo tách biệt không gian viết và tối ưu SEO trong **Đạo Ký**, **${authorName}** có thể định dạng tiêu đề, danh sách hay trích dẫn ngay tại vị trí con trỏ mà không bị nhảy màn hình, sau đó đồng bộ một chạm lên GitHub.`,
      },
      {
        fileName: 'dong-bo-kenh-live-chat-doc-gia.md',
        coverIndex: 4,
        title: 'Kết nối trực tiếp độc giả với Live Chat & mạng xã hội',
        category: 'Tương tác',
        categorySlug: 'tuong-tac',
        slug: 'dong-bo-kenh-live-chat-doc-gia',
        tags: ['live-chat', 'zalo', 'cong-dong'],
        excerpt:
          'Cho phép độc giả nhắn tin nhanh qua Zalo, Messenger, Telegram hoặc Tawk.to ngay trên trang blog.',
        date: dayOffsetStr(3),
        body: `## Không bỏ lỡ phản hồi từ người đọc

Bằng hộp thoại Live Chat ở góc dưới bên phải, **${siteTitle}** kết nối tức thì với những kênh liên lạc quen thuộc mà bạn chủ động bật hoặc tắt trong bảng điều khiển.`,
      },
    ],
    'obsidian-broadsheet': [
      {
        fileName: 'he-thong-blog-markdown-ben-vung.md',
        coverIndex: 1,
        title: 'Thiết kế hệ thống blog Markdown bền vững suốt hàng chục năm',
        category: 'Nhật báo Đêm · Công nghệ',
        categorySlug: 'cong-nghe',
        slug: 'he-thong-blog-markdown-ben-vung',
        tags: ['markdown', 'kien-truc', 'ben-vung'],
        excerpt:
          'Mực đêm xanh thẫm dịu mắt kết hợp tiêu đề Serif uy nghiêm, mang lại sự tập trung tối đa cho độc giả trên ' +
          siteTitle +
          '.',
        date: today,
        body: `Những hệ thống quản trị nội dung nặng nề thường lỗi thời sau vài năm nâng cấp, khiến việc bảo trì trở thành gánh nặng thay vì niềm vui viết lách. **${siteTitle}** chọn hướng đi tối giản mà trường tồn: dữ liệu thuần Markdown lưu trữ trên Git kết hợp bộ khung biên dịch tĩnh Astro 5.

## Kiến trúc hướng đến sự tĩnh lặng và dài hạn

- **Độ tương phản tính toán kỹ**: Nền mực đêm xanh thẫm kết hợp ánh xanh coban giúp giảm chói khi đọc bài phân tích dài vào ban đêm.
- **Đổi chế độ Sáng / Tối tức thì**: Đáp ứng linh hoạt mọi môi trường ánh sáng của độc giả.
- **Tài sản sở hữu trọn vẹn**: Toàn bộ tệp \`.md\` và hình ảnh đều nằm trong kho lưu trữ cá nhân của ${authorName}.`,
      },
      {
        fileName: 'luu-tru-tron-doi-tren-git.md',
        coverIndex: 2,
        title: 'Lưu trữ trọn đời bằng tệp văn bản thuần Markdown',
        category: 'Lưu trữ Git',
        categorySlug: 'luu-tru-git',
        slug: 'luu-tru-tron-doi-tren-git',
        tags: ['git', 'luu-tru', 'tu-chu'],
        excerpt:
          'Làm chủ hoàn toàn lịch sử chỉnh sửa, sao lưu tức thì và không bao giờ phụ thuộc vào định dạng đóng.',
        date: dayOffsetStr(1),
        body: `## Mọi bản thảo đều có thể đọc sau 30 năm

Một tệp văn bản Markdown hoàn toàn trong suốt với mọi trình soạn thảo và hệ điều hành. Khi kết hợp với Git, từng dòng sửa nhỏ nhất của bạn đều được ghi nhận minh bạch và dễ dàng khôi phục bất kỳ lúc nào.`,
      },
      {
        fileName: 'toi-uu-blogposting-json-ld.md',
        coverIndex: 3,
        title: 'Tối ưu dữ liệu có cấu trúc BlogPosting JSON-LD cho Google',
        category: 'Cấu trúc Dữ liệu',
        categorySlug: 'cau-truc-du-lieu',
        slug: 'toi-uu-blogposting-json-ld',
        tags: ['json-ld', 'schema', 'google-search'],
        excerpt:
          'Giúp bọ tìm kiếm nhận diện chuẩn xác tác giả, ngày đăng, ảnh đại diện và chủ đề của từng bài viết.',
        date: dayOffsetStr(2),
        body: `## Ngôn ngữ chung với công cụ tìm kiếm

Thẻ lược đồ \`BlogPosting\` được nhúng tự động trong phần đầu mỗi trang bài viết trên **${siteTitle}**, đảm bảo liên kết khi chia sẻ lên mạng xã hội hay xuất hiện trên kết quả tìm kiếm luôn rõ ràng và chuyên nghiệp.`,
      },
      {
        fileName: 'he-mau-broadsheet-hai-che-do.md',
        coverIndex: 4,
        title: 'Cân chỉnh độ tương phản Sáng và Tối cho bài viết chuyên sâu',
        category: 'Thiết kế',
        categorySlug: 'thiet-ke',
        slug: 'he-mau-broadsheet-hai-che-do',
        tags: ['dark-mode', 'light-mode', 'typography'],
        excerpt:
          'Từ nền mực đêm xanh thẫm sang giấy báo ban ngày chỉ qua biểu tượng Mặt trời / Mặt trăng trên thanh tiêu đề.',
        date: dayOffsetStr(3),
        body: `## Đọc thoải mái ở mọi điều kiện ánh sáng

Bảng màu kép của **Broadsheet Đêm** giữ nguyên tinh thần nhật báo nghiêm cẩn cho cả hai chế độ sáng và tối, giúp độc giả của **${siteTitle}** luôn đọc mượt mà dù đang ngoài trời nắng hay trong phòng yên tĩnh.`,
      },
    ],
    'espresso-salon': [
      {
        fileName: 'nhung-trang-viet-cuoi-ngay.md',
        coverIndex: 1,
        title: 'Những trang viết cuối ngày bên ánh đèn vàng ấm áp',
        category: 'Thư phòng · Suy tư',
        categorySlug: 'thu-phong-suy-tu',
        slug: 'nhung-trang-viet-cuoi-ngay',
        tags: ['suy-tu', 'thu-phong', 'hoi-ky'],
        excerpt:
          'Sắc nền thư phòng êm dịu với chữ Serif cổ điển trên ' +
          siteTitle +
          ', giảm mỏi mắt cho những bài viết phân tích và hồi ký dài hơi.',
        date: today,
        body: `Cuối ngày là lúc những tạp âm thường nhật lắng xuống, nhường chỗ cho các suy nghĩ trung thực nhất cất lời. **${siteTitle}** với giao diện **Salon Suy tư** được ${authorName} lựa chọn như một góc thư phòng nhỏ — nơi chữ nghĩa mang hơi ấm giấy cũ và ánh đèn hổ phách dịu dàng.

## Không gian dành riêng cho những bài viết dài

> Hãy viết như thể đang trò chuyện chân thành với một người bạn tri kỷ ngồi đối diện qua chiếc bàn gỗ nhỏ.

- **Phông chữ Serif êm mắt**: Khơi gợi cảm giác đọc sách giấy dù đang xem trên màn hình.
- **Mở đầu bằng chữ hoa thả (Drop Cap)**: Điểm nhấn cổ điển tôn vinh từng bài tiểu luận và hồi ký.
- **Chuyển đổi Mặt trời / Mặt trăng**: Chuyển từ ánh đèn vàng thư phòng sang giấy ấm ban ngày chỉ trong một cú chạm.`,
      },
      {
        fileName: 'rut-gon-doan-mo-dau.md',
        coverIndex: 2,
        title: 'Sổ tay đọc sách: Rút gọn đoạn mở đầu để giữ mạch cảm xúc',
        category: 'Sổ tay Đọc sách',
        categorySlug: 'so-tay-doc-sach',
        slug: 'rut-gon-doan-mo-dau',
        tags: ['doc-sach', 'viet-lach', 'bien-tap'],
        excerpt:
          'Bí quyết gọt bỏ những lời rào đón dư thừa để câu đầu tiên chạm thẳng vào tâm trạng người đọc.',
        date: dayOffsetStr(1),
        body: `## Đừng khởi động quá lâu trước khi vào câu chuyện

Phần lớn người viết hay dành hai đoạn đầu chỉ để rào đón lý do vì sao mình viết. Khi mạnh dạn cắt bớt lớp sương mù đó và bắt đầu ngay tại chi tiết sống động nhất, cả bài viết lập tức có sức nặng riêng.`,
      },
      {
        fileName: 'nhip-tho-de-muc-bai-viet.md',
        coverIndex: 3,
        title: 'Xây dựng nhịp thở đều đặn qua từng đề mục bài viết',
        category: 'Ghi chép',
        categorySlug: 'ghi-chep',
        slug: 'nhip-tho-de-muc-bai-viet',
        tags: ['nhip-dieu', 'cau-truc', 'dao-ky'],
        excerpt:
          'Mỗi tiêu đề phụ là một trạm nghỉ giúp độc giả đi trọn vẹn hành trình câu chữ từ đầu đến cuối.',
        date: dayOffsetStr(2),
        body: `## Cân bằng giữa chiều sâu và sự thanh thoát
 
Dù viết về triết lý sống, ghi chép đọc sách hay câu chuyện nghề nghiệp, việc giữ cho mỗi đề mục giải quyết trọn vẹn một ý sẽ giúp trang blog **${siteTitle}** luôn sáng sủa và lôi cuốn.`,
      },
    ],
    'monocle-magazine': [
      {
        fileName: 'kien-truc-tap-chi-da-trang.md',
        coverIndex: 1,
        title: 'Kiến trúc tạp chí nhiều trang cho ấn phẩm cá nhân hiện đại',
        category: 'Tiêu điểm · Biên tập',
        categorySlug: 'tieu-diem-bien-tap',
        slug: 'kien-truc-tap-chi-da-trang',
        tags: ['nhieu-trang', 'tap-chi', 'monocle'],
        excerpt:
          'Từ trang nhất dẫn dắt câu chuyện đến các trang Chuyên mục, Chủ đề, Lưu trữ và Giới thiệu tách biệt mạch lạc trên ' +
          siteTitle +
          '.',
        date: today,
        body: `Một blog trưởng thành không chỉ là danh sách bài viết trôi dài trên một trang đơn. Với giao diện **Monocle Đa trang**, **${siteTitle}** được ${authorName} tổ chức như một tòa soạn tạp chí thu nhỏ có đầy đủ phân khu: Trang nhất, Chuyên mục, Kho bài phân trang, Lưu trữ theo năm, Giới thiệu và Liên hệ.

## Năm trang trụ cột giúp độc giả dễ khám phá

- **Trang nhất**: Hội tụ bài tiêu điểm (Lead Story), thanh truy cập nhanh đa trang và khối chuyên mục nổi bật.
- **Trang Chuyên mục**: Gom nhóm toàn bộ bài viết theo từng mảng nội dung riêng biệt.
- **Kho bài viết có phân trang**: Tích hợp tìm kiếm, lọc chuyên mục và nút chuyển trang mượt mà.
- **Lưu trữ theo dòng thời gian**: Hệ thống hóa toàn bộ sáng tác theo từng năm và tháng.
- **Giới thiệu & Liên hệ**: Xây dựng hồ sơ chủ bút và kênh Live Chat trực tiếp với bạn đọc.`,
      },
      {
        fileName: 'phong-do-thi-thanh-pho-song-xanh.md',
        coverIndex: 2,
        title: 'Ghi chép đô thị: Nhịp sống xanh và không gian công cộng tĩnh lặng',
        category: 'Đô thị & Thiết kế',
        categorySlug: 'do-thi-thiet-ke',
        slug: 'phong-do-thi-thanh-pho-song-xanh',
        tags: ['do-thi', 'thiet-ke', 'kien-truc'],
        excerpt:
          'Quan sát cách những con phố rợp bóng cây, hàng quán nhỏ và thư viện cộng đồng tạo nên chất lượng sống bền vững.',
        date: dayOffsetStr(3),
        body: `## Những khoảng thở giữa lòng thành phố

Khi thiết kế một không gian công cộng hay một trang tạp chí đọc chữ, yếu tố quyết định cảm giác dễ chịu nằm ở khoảng thở. Những băng ghế gỗ dưới tán cây xanh, lối đi bộ thoáng đãng hay tỷ lệ cột chữ vừa phải đều tuân theo cùng một nguyên tắc phục vụ con người.`,
      },
      {
        fileName: 'nghe-thuat-lam-an-pham-doc-lap.md',
        coverIndex: 3,
        title: 'Nghệ thuật xuất bản ấn phẩm độc lập với chi phí vận hành bằng không',
        category: 'Kinh doanh · Xuất bản',
        categorySlug: 'kinh-doanh-xuat-ban',
        slug: 'nghe-thuat-lam-an-pham-doc-lap',
        tags: ['xuat-ban', 'doc-lap', 'markdown'],
        excerpt:
          'Kết hợp viết thuần Markdown và hạ tầng tĩnh GitHub Pages để duy trì tạp chí cá nhân suốt hàng chục năm.',
        date: dayOffsetStr(12),
        body: `## Tự chủ hoàn toàn dữ liệu sáng tác

Trên **${siteTitle}**, mỗi bài viết đều được lưu giữ dưới dạng tệp \`.md\` trong kho Git riêng. Bạn không bị ràng buộc bởi nền tảng đóng và luôn sẵn sàng chuyển đổi giao diện bất kỳ lúc nào.`,
      },
      {
        fileName: 'ghi-chep-tu-quan-ca-phe-sach.md',
        coverIndex: 4,
        title: 'Thư từ phương xa: Một buổi sáng tại hiệu sách độc lập góc phố',
        category: 'Văn hoá & Du ký',
        categorySlug: 'van-hoa-du-ky',
        slug: 'ghi-chep-tu-quan-ca-phe-sach',
        tags: ['du-ky', 'van-hoa', 'doc-sach'],
        excerpt:
          'Nơi mùi giấy in mới hòa quyện cùng hương cà phê rang mộc và những cuộc trò chuyện nhỏ về văn chương.',
        date: dayOffsetStr(35),
        body: `## Sức hút bền bỉ của những không gian tuyển chọn kỹ lưỡng

Không cần hàng vạn đầu sách hỗn độn, một hiệu sách độc lập chinh phục người ghé thăm bằng gu tuyển chọn tinh tế của người chủ — giống cách chuyên mục và từ khóa trên **${siteTitle}** dẫn dắt độc giả đi đúng mạch suy tư của tác giả.`,
      },
      {
        fileName: 'he-thong-chuyen-muc-nhieu-trang.md',
        coverIndex: 5,
        title: 'Quy chuẩn phân loại chuyên mục & từ khóa để người đọc quay lại lâu dài',
        category: 'Tiêu điểm · Biên tập',
        categorySlug: 'tieu-diem-bien-tap',
        slug: 'he-thong-chuyen-muc-nhieu-trang',
        tags: ['bien-tap', 'nhieu-trang', 'seo'],
        excerpt:
          'Phân biệt rạch ròi giữa Chuyên mục chính (lớn, ổn định) và Chủ đề/Tag (linh hoạt, xuyên suốt) giúp blog sạch đẹp.',
        date: dayOffsetStr(48),
        body: `## Chuyên mục là khung xương, Chủ đề là mạch nối

Giữ tối đa 4–6 chuyên mục lớn trên **${siteTitle}** và dùng thẻ \`#tag\` cho các lát cắt chủ đề nhỏ giúp trang \`/chuyen-muc/\` và \`/chu-de/\` luôn cân đối, không bao giờ loãng.`,
      },
      {
        fileName: 'luu-giu-ky-uc-qua-anh-va-chu.md',
        coverIndex: 6,
        title: 'Lưu giữ ký ức qua những khung hình vuông vắn và trang nhật ký ngắn',
        category: 'Văn hoá & Du ký',
        categorySlug: 'van-hoa-du-ky',
        slug: 'luu-giu-ky-uc-qua-anh-va-chu',
        tags: ['nhiep-anh', 'du-ky', 'dao-ky'],
        excerpt:
          'Mỗi bức ảnh kèm một đoạn ghi chú ngắn trong kho lưu trữ sẽ trở thành cuốn biên niên sử quý giá theo năm tháng.',
        date: dayOffsetStr(72),
        body: `## Viết để ghi nhớ điều tưởng chừng bình dị

Trang **Lưu trữ theo năm** trên **${siteTitle}** tự động gom toàn bộ bài viết qua từng tháng và từng năm, giúp bạn ngoái nhìn lại hành trình viết lách của chính mình thật rõ ràng.`,
      },
    ],
    'guardian-portal': [
      {
        fileName: 'cong-thong-tin-da-chuyen-trang.md',
        coverIndex: 1,
        title: 'Tổ chức cổng thông tin đa chuyên trang rõ ràng cho blog cá nhân',
        category: 'Thời sự · Phân tích',
        categorySlug: 'thoi-su-phan-tich',
        slug: 'cong-thong-tin-da-chuyen-trang',
        tags: ['nhieu-trang', 'bao-chi', 'guardian'],
        excerpt:
          'Lấy cảm hứng từ tuần báo đa chuyên mục: phân tách rạch ròi Thời sự, Công nghệ, Góc nhìn và Xã hội trên ' +
          siteTitle +
          '.',
        date: today,
        body: `Một cổng bài viết đáng tin cậy luôn giúp độc giả định vị chính xác mình đang ở đâu: từ trang nhất tổng hợp, danh bạ chuyên mục, kho lưu trữ phân trang cho tới từng trang bài đọc chi tiết có thanh điều hướng breadcrumb đầy đủ.

## Điểm mạnh của cấu trúc Guardian Cổng tin

- **Màu xanh navy & điểm nhấn đỏ báo chí**: Tạo uy tín thị giác cao ngay cả ở chế độ Sáng lẫn Tối.
- **Điều hướng nhiều trang đầy đủ**: Truy cập tức thì \`Chuyên mục\`, \`Kho bài\`, \`Lưu trữ\`, \`Giới thiệu\` và \`Liên hệ\`.
- **Liên kết trước/sau liền mạch**: Đọc xong bài này chuyển ngay sang bài kế tiếp cùng kho dữ liệu.`,
      },
      {
        fileName: 'phan-tich-du-lieu-va-bao-chi-so.md',
        coverIndex: 2,
        title: 'Phân tích dữ liệu minh bạch trong kỷ nguyên xuất bản cá nhân',
        category: 'Công nghệ & Dữ liệu',
        categorySlug: 'cong-nghe-du-lieu',
        slug: 'phan-tich-du-lieu-va-bao-chi-so',
        tags: ['du-lieu', 'phan-tich', 'seo'],
        excerpt:
          'Vì sao dữ liệu có cấu trúc, RSS Feed và Sitemap đầy đủ mọi chuyên trang giúp bài viết dễ được tìm thấy hơn.',
        date: dayOffsetStr(4),
        body: `## Kỹ thuật nền vững chắc phía sau từng trang viết

Mỗi chuyên mục và thẻ chủ đề mới được bạn thêm vào **${siteTitle}** đều tự động được đưa vào \`sitemap.xml\` khi GitHub Actions biên dịch.`,
      },
      {
        fileName: 'doc-sau-giua-ky-nguyen-tom-tat.md',
        coverIndex: 3,
        title: 'Bảo vệ thói quen đọc sâu giữa kỷ nguyên tóm tắt siêu tốc',
        category: 'Góc nhìn',
        categorySlug: 'goc-nhin',
        slug: 'doc-sau-giua-ky-nguyen-tom-tat',
        tags: ['goc-nhin', 'doc-sau', 'tu-duy'],
        excerpt:
          'Khi máy móc tóm lược mọi thứ thành ba gạch đầu dòng, giá trị của góc nhìn cá nhân có dẫn chứng càng trở nên khác biệt.',
        date: dayOffsetStr(15),
        body: `## Tiếng nói cá nhân là lợi thế không thể thay thế

Trải nghiệm thực tế, bối cảnh địa phương và sự trung thực của ${authorName} chính là lý do khiến bạn đọc quay lại **${siteTitle}** hàng tuần.`,
      },
      {
        fileName: 'chinh-sach-moi-truong-va-nong-nghiep.md',
        coverIndex: 4,
        title: 'Ghi nhận thực địa: Chuyển đổi xanh trong canh tác nông nghiệp bền vững',
        category: 'Xã hội & Môi trường',
        categorySlug: 'xa-hoi-moi-truong',
        slug: 'chinh-sach-moi-truong-va-nong-nghiep',
        tags: ['nong-nghiep', 'ben-vung', 'thuc-dia'],
        excerpt:
          'Những mô hình canh tác tái tạo đất và tiết kiệm nước đang mở ra hướng đi mới cho cộng đồng nông thôn.',
        date: dayOffsetStr(34),
        body: `## Câu chuyện từ những cánh đồng thực nghiệm

Những ghi chép từ thực tế đồng ruộng giúp chuyên mục **Xã hội & Môi trường** mang hơi thở đời sống rõ rệt, kết nối người viết với những độc giả cùng quan tâm.`,
      },
      {
        fileName: 'to-chuc-kho-bai-viet-phan-trang.md',
        coverIndex: 5,
        title: 'Cách sắp xếp kho bài viết phân trang kết hợp tìm kiếm tức thì',
        category: 'Công nghệ & Dữ liệu',
        categorySlug: 'cong-nghe-du-lieu',
        slug: 'to-chuc-kho-bai-viet-phan-trang',
        tags: ['phan-trang', 'tim-kiem', 'astro'],
        excerpt:
          'Kho bài viết hiển thị gọn 4 bài mỗi trang giúp trang tải nhanh trên di động mà vẫn lọc được ngay lập tức.',
        date: dayOffsetStr(52),
        body: `## Gọn gàng dù kho lưu trữ lên tới hàng trăm bài

Khi kết hợp ô tìm kiếm, bộ lọc chuyên mục và nút chuyển trang ngay trên \`/bai-viet/\`, độc giả trên điện thoại không phải cuộn mỏi tay để tìm bài viết cũ.`,
      },
      {
        fileName: 'doi-thoai-cung-ban-doc-qua-live-chat.md',
        coverIndex: 6,
        title: 'Mở kênh đối thoại trực tiếp với độc giả qua trang Liên hệ & Live Chat',
        category: 'Góc nhìn',
        categorySlug: 'goc-nhin',
        slug: 'doi-thoai-cung-ban-doc-qua-live-chat',
        tags: ['live-chat', 'lien-he', 'cong-dong'],
        excerpt:
          'Trang Liên hệ tập hợp đầy đủ Zalo, Messenger, Telegram và RSS để bạn đọc phản hồi thuận tiện nhất.',
        date: dayOffsetStr(68),
        body: `## Biến blog một chiều thành cuộc trò chuyện hai chiều

Không cần hệ thống bình luận nặng nề dễ dính spam, kênh Live Chat và trang **Liên hệ** giúp **${siteTitle}** giữ kết nối chân thành và nhanh chóng với độc giả.`,
      },
    ],
    'kyoto-folio': [
      {
        fileName: 'trien-lam-chu-nghia-tren-nen-giay-washi.md',
        coverIndex: 1,
        title: 'Triển lãm chữ nghĩa: Tỷ lệ khoảng trắng và sự tĩnh tại trên giấy Washi',
        category: 'Triển lãm · Thủ công',
        categorySlug: 'trien-lam-thu-cong',
        slug: 'trien-lam-chu-nghia-tren-nen-giay-washi',
        tags: ['washi', 'kyoto', 'thiet-ke'],
        excerpt:
          'Cảm hứng mỹ học Nhật Bản trong giao diện hồ sơ nhiều trang trên ' +
          siteTitle +
          ' — ít chi tiết thừa, trọn vẹn chiều sâu.',
        date: today,
        body: `Trong truyền thống thủ công Kyoto, khoảng trống không phải là phần bị bỏ quên mà là nơi ánh sáng và hơi thở được giữ lại. **Kyoto Triển lãm** mang tinh thần đó vào không gian blog nhiều trang của **${siteTitle}**: từng trang Chuyên mục, Chủ đề, Lưu trữ và Giới thiệu đều được chăm chút như một phòng trưng bày tĩnh lặng.

## Vẻ đẹp của bố cục hồ sơ nhiều trang

- **Đánh số mục lục tinh tế**: Giúp người đọc theo dõi từng phòng chuyên đề rõ ràng.
- **Chữ hoa thả Drop Cap cổ điển**: Mở đầu bài tiểu luận với phong vị sách in thủ công.
- **Giấy Washi Sáng & Đêm Gỗ Trầm**: Bảo vệ thị lực cả ban ngày lẫn lúc khuya.`,
      },
      {
        fileName: 'khong-gian-am-thanh-va-su-tinh-lang.md',
        coverIndex: 2,
        title: 'Không gian âm thanh và nghệ thuật lắng nghe sự tĩnh lặng',
        category: 'Mỹ học',
        categorySlug: 'my-hoc',
        slug: 'khong-gian-am-thanh-va-su-tinh-lang',
        tags: ['my-hoc', 'tinh-lang', 'suy-tu'],
        excerpt:
          'Khi ta bớt đi tiếng ồn thị giác trên màn hình, từng câu văn tự nhiên vang lên rõ ràng hơn.',
        date: dayOffsetStr(5),
        body: `## Lọc bỏ tạp âm để giữ lại tinh chất

Một trang đọc bài không có quảng cáo nhấp nháy hay khung tiện ích chen chúc là món quà quý giá nhất tác giả **${authorName}** dành cho độc giả ghé thăm **${siteTitle}**.`,
      },
      {
        fileName: 'ho-so-luu-tru-theo-dong-thoi-gian.md',
        coverIndex: 3,
        title: 'Cách sắp đặt hồ sơ lưu trữ theo dòng thời gian năm và tháng',
        category: 'Hồ sơ & Lưu trữ',
        categorySlug: 'ho-so-luu-tru',
        slug: 'ho-so-luu-tru-theo-dong-thoi-gian',
        tags: ['luu-tru', 'bien-nien-su', 'nhieu-trang'],
        excerpt:
          'Mỗi bài viết được ghi nhận ngày tháng bằng phông chữ đơn cách đều đặn như một cuốn mục lục bảo tàng.',
        date: dayOffsetStr(18),
        body: `## Mỗi tháng viết là một lớp trầm tích

Trang \`/luu-tru/\` sắp xếp lại toàn bộ bài viết từ mới nhất đến lâu năm nhất, cho thấy sự tiến triển trong góc nhìn của bạn theo thời gian.`,
      },
      {
        fileName: 'nghe-thuat-in-sach-va-chu-serif.md',
        coverIndex: 4,
        title: 'Sức quyến rũ trường tồn của phông chữ Serif cổ điển trên màn hình số',
        category: 'Văn hoá Đọc',
        categorySlug: 'van-hoa-doc',
        slug: 'nghe-thuat-in-sach-va-chu-serif',
        tags: ['serif', 'typography', 'doc-sach'],
        excerpt:
          'Sự kết hợp giữa Cormorant Garamond cho tiêu đề lớn và Lora cho văn bản dài mang lại trải nghiệm tựa như lật trang sách.',
        date: dayOffsetStr(38),
        body: `## Đọc dài mà không mỏi mắt

Độ rộng cột văn bản giới hạn ở mức 68 ký tự trên **${siteTitle}** giúp mắt chuyển dòng tự nhiên mà không bị trượt mất vị trí.`,
      },
      {
        fileName: 'nhung-buoi-chieu-mua-o-co-do.md',
        coverIndex: 5,
        title: 'Ghi chép bên hiên gỗ: Những buổi chiều mưa nhẹ ở cố đô',
        category: 'Mỹ học',
        categorySlug: 'my-hoc',
        slug: 'nhung-buoi-chieu-mua-o-co-do',
        tags: ['du-ky', 'my-hoc', 'kyoto'],
        excerpt:
          'Một lát cắt du ký ngắn về mái ngói sẫm màu, tiếng nước rơi hiên chùa và trang sổ tay mang theo.',
        date: dayOffsetStr(55),
        body: `## Viết ngay khi cảm xúc còn ấm

Những bài tản văn ngắn đặt trong chuyên mục **Mỹ học** tạo nên sự cân bằng mềm mại bên cạnh các bài phân tích hồ sơ.`,
      },
      {
        fileName: 'giu-net-tinh-khoi-cho-trang-gioi-thieu.md',
        coverIndex: 6,
        title: 'Giữ nét tinh khôi và chân thật cho trang Giới thiệu tác giả',
        category: 'Hồ sơ & Lưu trữ',
        categorySlug: 'ho-so-luu-tru',
        slug: 'giu-net-tinh-khoi-cho-trang-gioi-thieu',
        tags: ['gioi-thieu', 'tac-gia', 'dao-ky'],
        excerpt:
          'Một trang Giới thiệu chỉn chu trả lời ba câu hỏi giản dị: bạn là ai, bạn viết điều gì và vì sao bạn chọn viết chậm.',
        date: dayOffsetStr(75),
        body: `## Điểm hẹn đầu tiên với độc giả mới

Trang \`/gioi-thieu/\` trên **${siteTitle}** trình bày logo, lời mở đầu của **${authorName}** cùng số liệu xuất bản minh bạch để mọi người hiểu ngay tinh thần của khu vườn chữ nghĩa này.`,
      },
    ],
    'economist-digest': [
      {
        fileName: 'chuyen-san-phan-tich-da-trang.md',
        coverIndex: 1,
        title: 'Chuyên san phân tích đa trang: Tổ chức tri thức theo lát cắt chuyên đề',
        category: 'Kinh tế & Chiến lược',
        categorySlug: 'kinh-te-chien-luoc',
        slug: 'chuyen-san-phan-tich-da-trang',
        tags: ['phan-tich', 'chien-luoc', 'nhieu-trang'],
        excerpt:
          'Cấu trúc chuyên san tối màu với dải nhấn đỏ thẫm đặc trưng trên ' +
          siteTitle +
          ', tách bạch Kinh tế, Hạ tầng Số và Quản trị.',
        date: today,
        body: `Khi blog vượt quá vài chục bài nghiên cứu, một trang chủ đơn giản không còn đủ sức chứa toàn bộ hệ thống lập luận của bạn. Giao diện **Economist Chuyên san** biến **${siteTitle}** thành một ấn phẩm phân tích nhiều trang: trang chủ chọn lọc, trang Chuyên mục phân tầng, Kho bài có phân trang và Biên niên lưu trữ.

## Chuẩn mực của một chuyên san phân tích

- **Độ tương phản sắc sảo**: Nền than đêm kết hợp đỏ thẫm làm nổi bật ngay lập tức chỉ mục chuyên mục và tiêu đề bài viết.
- **Điều hướng phân tầng sâu**: Từ trang chủ -> Chuyên mục -> Bài viết -> Chủ đề liên quan, mọi bước chỉ cách một chạm.
- **Linh hoạt chuyển đổi Sáng / Tối**: Hỗ trợ đọc ban ngày ngoài trời bằng một cú bấm biểu tượng Mặt trời / Mặt trăng.`,
      },
      {
        fileName: 'kinh-te-tu-nhan-va-cong-cu-doc-lap.md',
        coverIndex: 2,
        title: 'Làn sóng công cụ làm việc độc lập và quyền sở hữu tri thức số',
        category: 'Kinh tế & Chiến lược',
        categorySlug: 'kinh-te-chien-luoc',
        slug: 'kinh-te-tu-nhan-va-cong-cu-doc-lap',
        tags: ['kinh-te', 'tu-chu', 'tri-thuc'],
        excerpt:
          'Tại sao ngày càng nhiều chuyên gia chuyển ghi chú nghiên cứu từ mạng xã hội về website tĩnh do mình làm chủ.',
        date: dayOffsetStr(6),
        body: `## Xây tài sản dài hạn thay vì thuê đất thuật toán

Mỗi bài phân tích đăng trên **${siteTitle}** đều được Google lập chỉ mục ổn định qua năm tháng thông qua hệ thống \`sitemap.xml\` và \`BlogPosting\` JSON-LD.`,
      },
      {
        fileName: 'ha-tang-github-pages-khong-chi-phi.md',
        coverIndex: 3,
        title: 'Hạ tầng xuất bản tĩnh trên GitHub Pages: Hiệu năng, bảo mật và chi phí',
        category: 'Hạ tầng Số',
        categorySlug: 'ha-tang-so',
        slug: 'ha-tang-github-pages-khong-chi-phi',
        tags: ['github-pages', 'astro', 'ha-tang'],
        excerpt:
          'So sánh mô hình xuất bản tĩnh hiện đại với CMS truyền thống từ góc độ tốc độ tải trang và chi phí bảo trì.',
        date: dayOffsetStr(19),
        body: `## Tối đa hóa hiệu năng trên từng kilobyte

Không truy vấn cơ sở dữ liệu động, không phụ thuộc máy chủ trả phí hàng tháng — mọi trang của **${siteTitle}** sẵn sàng phục vụ đồng thời hàng nghìn lượt truy cập tức thì.`,
      },
      {
        fileName: 'tu-duy-he-thong-trong-quan-tri-tri-thuc.md',
        coverIndex: 4,
        title: 'Ứng dụng tư duy hệ thống khi xây dựng kho bài viết nhiều chuyên đề',
        category: 'Quản trị & Dữ liệu',
        categorySlug: 'quan-tri-du-lieu',
        slug: 'tu-duy-he-thong-trong-quan-tri-tri-thuc',
        tags: ['he-thong', 'quan-tri', 'du-lieu'],
        excerpt:
          'Từ quy ước đặt tên slug không dấu đến phân tách thẻ chủ đề xuyên suốt giúp việc tra cứu tài liệu cũ nhanh gấp bội.',
        date: dayOffsetStr(39),
        body: `## Hệ thống tốt tự chứng minh giá trị sau 6 tháng viết đều

Khi kho bài trên **${siteTitle}** lớn lên, trang \`/luu-tru/\` và \`/chu-de/\` phát huy tác dụng như một thư viện tham khảo cá nhân đáng tin cậy.`,
      },
      {
        fileName: 'bao-cao-chuyen-de-theo-chu-de.md',
        coverIndex: 5,
        title: 'Đọc chéo theo Chủ đề: Nối kết những phân tích tưởng như rời rạc',
        category: 'Bình luận Quốc tế',
        categorySlug: 'binh-luan-quoc-te',
        slug: 'bao-cao-chuyen-de-theo-chu-de',
        tags: ['chu-de', 'binh-luan', 'nhieu-trang'],
        excerpt:
          'Tính năng gom bài theo từ khóa #tag giúp độc giả theo dõi trọn vẹn một câu chuyện dài kỳ qua nhiều tháng.',
        date: dayOffsetStr(56),
        body: `## Liên kết đa chiều ngoài khung chuyên mục

Chỉ cần bấm vào bất kỳ thẻ \`#tag\` nào ở cuối bài viết trên **${siteTitle}**, bạn đọc lập tức mở ra trang tổng hợp riêng cho chủ đề đó.`,
      },
      {
        fileName: 'thoi-quen-doc-bao-cao-buoi-toi.md',
        coverIndex: 6,
        title: 'Tối ưu chế độ ban đêm cho độc giả đọc báo cáo phân tích cuối ngày',
        category: 'Quản trị & Dữ liệu',
        categorySlug: 'quan-tri-du-lieu',
        slug: 'thoi-quen-doc-bao-cao-buoi-toi',
        tags: ['dark-mode', 'doc-sau', 'typography'],
        excerpt:
          'Cân bằng độ sáng văn bản #F3F4F6 trên nền #101218 giúp đọc suốt 20 phút buổi tối vẫn hoàn toàn dễ chịu.',
        date: dayOffsetStr(74),
        body: `## Thiết kế phục vụ thời gian đọc thực sự

Mọi thông số tương phản trên **${siteTitle}** đều được chọn để chữ sắc nét mà không gây lóa mắt khi tắt đèn phòng.`,
      },
    ],
    'nordic-atlas': [
      {
        fileName: 'hanh-trinh-qua-nhung-vung-dat-phia-bac.md',
        coverIndex: 1,
        title: 'Nordic Atlas: Nhật ký hành trình và bản đồ tri thức nhiều trang',
        category: 'Du ký · Bắc Âu',
        categorySlug: 'du-ky-bac-au',
        slug: 'hanh-trinh-qua-nhung-vung-dat-phia-bac',
        tags: ['du-ky', 'nordic', 'nhieu-trang'],
        excerpt:
          'Gam xanh băng đêm dịu mắt cùng kiến trúc nhiều trang trên ' +
          siteTitle +
          ', lưu giữ từng chặng đường và trang ghi chép.',
        date: today,
        body: `Một cuốn nhật ký hành trình hay là cuốn sách mà khi mở lại ở trang bất kỳ, bạn vẫn biết mình đang đi trên tuyến đường nào. Giao diện **Nordic Atlas** thiết kế cho **${siteTitle}** tổ chức bài viết theo hệ thống đa trang rõ nét: Trang nhất, Chuyên mục, Kho bài phân trang, Lưu trữ theo thời gian, Giới thiệu và Liên hệ.

## Trải nghiệm như một cuốn tập bản đồ mở rộng

- **Sắc xanh băng & ngọc lục bảo dịu mắt**: Tạo cảm giác thoáng rộng, trong trẻo cả ở giao diện Tối lẫn Sáng.
- **Phân tầng Chuyên mục & Chủ đề**: Gom nhóm chuyến đi theo vùng đất, kiến trúc hoặc kỹ thuật ghi chép.
- **Lưu trữ biên niên sử**: Theo dõi lộ trình sáng tác của ${authorName} qua từng tháng và năm.`,
      },
      {
        fileName: 'thiet-ke-toi-gian-va-anh-sang-mua-dong.md',
        coverIndex: 2,
        title: 'Thiết kế tối giản Bắc Âu và cách tận dụng ánh sáng tự nhiên',
        category: 'Kiến trúc & Sống',
        categorySlug: 'kien-truc-song',
        slug: 'thiet-ke-toi-gian-va-anh-sang-mua-dong',
        tags: ['kien-truc', 'toi-gian', 'anh-sang'],
        excerpt:
          'Bài học từ những ngôi nhà gỗ sáng thoáng vùng Bắc Âu áp dụng vào thiết kế giao diện đọc chữ trên web.',
        date: dayOffsetStr(4),
        body: `## Ít đồ vật, nhiều ánh sáng và công năng chính xác

Không gian số cũng vậy: khi loại bỏ các thành phần thừa thãi, từng bức ảnh bìa và dòng chữ trên **${siteTitle}** tự nhiên tỏa sáng.`,
      },
      {
        fileName: 'ban-do-chuyen-muc-cho-nguoi-me-du-ky.md',
        coverIndex: 3,
        title: 'Dựng bản đồ chuyên mục cho blog du ký, nhiếp ảnh và trải nghiệm sống',
        category: 'Bản đồ & Lộ trình',
        categorySlug: 'ban-do-lo-trinh',
        slug: 'ban-do-chuyen-muc-cho-nguoi-me-du-ky',
        tags: ['ban-do', 'chuyen-muc', 'du-ky'],
        excerpt:
          'Cách chia chuyên mục theo chủ đề chuyến đi để độc giả dễ tra cứu lại kinh nghiệm sau nhiều năm.',
        date: dayOffsetStr(16),
        body: `## Mỗi chuyên mục là một tọa độ quen thuộc

Dù là \`Du ký\`, \`Kiến trúc & Sống\` hay \`Bản đồ & Lộ trình\`, trang \`/chuyen-muc/\` trên **${siteTitle}** hiển thị ngay số bài viết và bài mới nhất để độc giả định hướng tức thì.`,
      },
      {
        fileName: 'nhat-ky-di-bo-duong-dai-va-ghi-chep.md',
        coverIndex: 4,
        title: 'Những ngày đi bộ đường dài và thói quen viết vội bên trạm dừng chân',
        category: 'Du ký · Bắc Âu',
        categorySlug: 'du-ky-bac-au',
        slug: 'nhat-ky-di-bo-duong-dai-va-ghi-chep',
        tags: ['di-bo', 'ghi-chep', 'mobile'],
        excerpt:
          'Ghi nháp ngay trên điện thoại lúc dừng chân và xuất bản hoàn chỉnh chỉ bằng một lần đồng bộ.',
        date: dayOffsetStr(36),
        body: `## Không để cảm hứng trôi qua sau chuyến đi

Trình biên tập tối ưu cho màn hình nhỏ giúp bạn lưu giữ chi tiết chân thực nhất ngay khi vừa đặt ba lô xuống.`,
      },
      {
        fileName: 'suoi-am-khong-gian-doc-bang-hai-che-do.md',
        coverIndex: 5,
        title: 'Nhiếp ảnh vùng lạnh & cách chọn bảng màu hiển thị ảnh đẹp nhất',
        category: 'Nhiếp ảnh & Ánh sáng',
        categorySlug: 'nhiep-anh-anh-sang',
        slug: 'suoi-am-khong-gian-doc-bang-hai-che-do',
        tags: ['nhiep-anh', 'anh-sang', 'dark-mode'],
        excerpt:
          'Nền xanh băng đêm làm nổi bật sắc độ ảnh phong cảnh, đồng thời vẫn chuyển sang nền sáng thanh thoát bằng một chạm.',
        date: dayOffsetStr(53),
        body: `## Tôn vinh khung hình ở cả hai chế độ hiển thị

Thử bấm nút Mặt trời / Mặt trăng ở góc phải thanh tiêu đề **${siteTitle}** để xem sự chuyển đổi mượt mà giữa nền băng đêm và nền sáng ban ngày.`,
      },
      {
        fileName: 'chia-se-toa-do-va-kinh-nghiem-chuyen-di.md',
        coverIndex: 6,
        title: 'Kết nối cộng đồng xê dịch qua trang Liên hệ và bản tin RSS riêng',
        category: 'Bản đồ & Lộ trình',
        categorySlug: 'ban-do-lo-trinh',
        slug: 'chia-se-toa-do-va-kinh-nghiem-chuyen-di',
        tags: ['rss', 'lien-he', 'cong-dong'],
        excerpt:
          'Để độc giả nhắn tin hỏi kinh nghiệm lộ trình qua Zalo, Telegram hoặc theo dõi hành trình mới qua RSS.',
        date: dayOffsetStr(71),
        body: `## Chia sẻ hành trình không phụ thuộc mạng xã hội

Trang \`/lien-he/\` trên **${siteTitle}** lưu giữ trọn vẹn đường dẫn RSS và các kênh nhắn tin trực tiếp do chính bạn quản lý.`,
      },
    ],
  };

  const selectedSeeds = STARTER_SEEDS_BY_TEMPLATE[templateStyle] || STARTER_SEEDS_BY_TEMPLATE['newyorker-light'];
  const totalCovers = selectedSeeds.length;
  const coverFiles = selectedSeeds.map((seed, idx) => ({
    path: `public/tainguyen/hinhanh/cover-${idx + 1}.svg`,
    content: buildCoverSvg(idx + 1, totalCovers, seed.category, seed.title),
  }));

  const starterFiles = selectedSeeds.map((seed, idx) => ({
    path: `src/content/bai_viet/${seed.fileName}`,
    content: makeMarkdown(
      {
        tieu_de: seed.title,
        danh_muc: seed.category,
        chuyen_muc: seed.categorySlug,
        slug: seed.slug,
        tags: seed.tags,
        mo_ta: seed.excerpt,
        ngay: seed.date,
        anh_bia: `/tainguyen/hinhanh/cover-${idx + 1}.svg`,
        nhap: false,
        tac_gia: authorName,
      },
      seed.body
    ),
  }));

  const files: Array<{ path: string; content: string; isBase64?: boolean }> = [
    { path: '.gitignore', content: gitignore },
    { path: 'package.json', content: packageJson },
    { path: 'tsconfig.json', content: tsconfigJson },
    { path: 'astro.config.mjs', content: astroConfigMjs },
    { path: '.github/workflows/deploy-astro.yml', content: deployWorkflowYml },
    { path: '.blogvn/site-config.json', content: JSON.stringify(persistedConfig, null, 2) + '\n' },
    { path: 'public/.nojekyll', content: '' },
    { path: 'public/robots.txt', content: robotsTxt },
    { path: 'public/favicon.svg', content: faviconSvg },
    { path: 'public/manifest.webmanifest', content: manifestJson },
    { path: 'public/tainguyen/hinhanh/og-default.svg', content: ogDefaultSvg },
    ...coverFiles,
    { path: 'public/tainguyen/hinhanh/uploads/.gitkeep', content: '' },
    { path: 'src/content/du_an/.gitkeep', content: '' },
    { path: 'src/content/sach/.gitkeep', content: '' },
    { path: 'src/content/cua_hang/.gitkeep', content: '' },
    ...(cleanCustomDomain ? [{ path: 'public/CNAME', content: `${cleanCustomDomain}\n` }] : []),
    {
      path: 'src/cau_hinh/trang_web.ts',
      content: buildAstroSiteConfigModule({
        owner,
        repo,
        config: persistedConfig,
        templateId: templateStyle,
        hasBundledPngFavicon,
      }),
    },
    { path: 'src/utils/url.ts', content: urlUtilsTs },
    { path: 'src/content.config.ts', content: contentConfigTs },
    { path: 'src/layouts/BaseLayout.astro', content: baseLayoutAstro },
    { path: 'src/components/PostCard.astro', content: postCardAstro },
    { path: 'src/pages/index.astro', content: indexAstro },
    { path: 'src/pages/bai-viet/index.astro', content: archiveIndexAstro },
    { path: 'src/pages/bai-viet/[slug].astro', content: articleDetailAstro },
    { path: 'src/pages/chuyen-muc/index.astro', content: chuyenMucIndexAstro },
    { path: 'src/pages/chuyen-muc/[slug].astro', content: chuyenMucDetailAstro },
    { path: 'src/pages/chu-de/index.astro', content: chuDeIndexAstro },
    { path: 'src/pages/chu-de/[tag].astro', content: chuDeDetailAstro },
    { path: 'src/pages/du-an/index.astro', content: duAnIndexAstro },
    { path: 'src/pages/du-an/[slug].astro', content: duAnDetailAstro },
    { path: 'src/pages/sach/index.astro', content: sachIndexAstro },
    { path: 'src/pages/cua-hang/index.astro', content: cuaHangIndexAstro },
    { path: 'src/pages/luu-tru/index.astro', content: luuTruIndexAstro },
    { path: 'src/pages/gioi-thieu/index.astro', content: gioiThieuIndexAstro },
    { path: 'src/pages/lien-he/index.astro', content: lienHeIndexAstro },
    { path: 'src/pages/404.astro', content: page404Astro },
    { path: 'src/pages/rss.xml.ts', content: rssXmlTs },
    { path: 'src/pages/sitemap.xml.ts', content: sitemapXmlTs },
  ];

  if (includeStarterPosts) {
    files.push(...starterFiles);
  }

  if (faviconPngBase64) {
    files.push({
      path: 'public/favicon.png',
      content: faviconPngBase64,
      isBase64: true,
    });
  }

  return files;
}
