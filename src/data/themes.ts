import type { BlogCollection, BlogConfig, BlogTheme, ThemeMode } from '../types/blog';

export const AM_DUONG_THEMES: Record<ThemeMode, BlogTheme> = {
  light: {
    id: 'light',
    name: 'Dương (Sáng)',
    isDark: false,
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: {
      canvas: '#FAFAFA',
      surface: '#F3F4F6',
      surfaceElevated: '#FFFFFF',
      border: '#E5E7EB',
      textPrimary: '#111827',
      textSecondary: '#374151',
      textMuted: '#6B7280',
      accent: '#111827',
      accentText: '#FFFFFF',
      link: '#2563EB',
    },
  },
  dark: {
    id: 'dark',
    name: 'Âm (Tối)',
    isDark: true,
    fonts: {
      display: "'Fraunces', Georgia, serif",
      body: "'Plus Jakarta Sans', system-ui, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    palette: {
      canvas: '#0B0D12',
      surface: '#141720',
      surfaceElevated: '#1B202C',
      border: '#272D3D',
      textPrimary: '#F3F4F6',
      textSecondary: '#D1D5DB',
      textMuted: '#9CA3AF',
      accent: '#F3F4F6',
      accentText: '#0B0D12',
      link: '#60A5FA',
    },
  },
};

export const DEFAULT_BLOG_CONFIG: BlogConfig = {
  siteTitle: 'Huyền Không Thư Quán',
  tagline:
    'Nhật ký nghiên cứu kỹ thuật, thiết kế hệ thống và những ghi chép tĩnh tại trên GitHub Pages.',
  siteIcon: './icon.svg',
  headerTitle: 'BlogVN',
  headerNavLinks: [],
  footerText: 'Xuất bản trực tiếp qua GitHub Pages & BlogVN.',
  footerLinks: [],
  authorName: 'Bùi Trung Tín',
  authorBio:
    'Kỹ sư phần mềm & tác giả blog cá nhân. Chia sẻ ghi chép thực chiến về web, kiến trúc và công cụ số.',
  githubOwner: 'trungtin87',
  githubRepo: 'trungtin87.github.io',
  pagesUrl: 'https://trungtin87.github.io',
  themeMode: 'light',
  postsDirectory: '_posts',
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
    label: 'Bài viết chuyên sâu',
    collection: 'bai_viet',
    title: 'Ghi chép về kiến trúc ứng dụng web bền vững',
    category: 'Kỹ thuật',
    tags: ['kien-truc', 'web', 'markdown'],
    excerpt: 'Tổng hợp nguyên tắc thiết kế hệ thống nhẹ, dễ bảo trì và triển khai trực tiếp trên GitHub Pages.',
    markdownBody: `## Bối cảnh\n\nKhi xây dựng một góc viết cá nhân hoặc tài liệu kỹ thuật dài hạn, sự đơn giản trong định dạng lưu trữ (Markdown thuần túy + Git) mang lại tuổi thọ vượt trội.\n\n## Ba nguyên tắc cốt lõi\n\n1. **Nội dung tách rời khỏi giao diện**: Toàn bộ bài viết nằm trong các tệp \`.md\` có cấu trúc rõ ràng.\n2. **Tối ưu tốc độ tải trang**: Ảnh được nén về chuẩn WebP/JPEG nhẹ trước khi đưa lên kho lưu trữ.\n3. **Chủ quyền dữ liệu**: Mọi dòng chữ đều nằm trong Git repository của chính bạn.\n\n> Sự rõ ràng trong tư duy luôn bắt đầu từ những công cụ không gây xao nhãng.`,
  },
  {
    label: 'Giới thiệu dự án',
    collection: 'du_an',
    title: 'Hệ thống quản trị nội dung tĩnh BlogVN',
    category: 'Phần mềm',
    tags: ['typescript', 'react', 'github-api'],
    excerpt: 'Ứng dụng PWA hỗ trợ soạn thảo Markdown, nén ảnh hàng loạt và đồng bộ trực tiếp lên GitHub Pages.',
    markdownBody: `## Mục tiêu dự án\n\nGiúp người viết xuất bản bài viết lên GitHub Pages ngay từ điện thoại hoặc máy tính mà không cần mở trình soạn thảo code.\n\n## Tính năng nổi bật\n\n- Tự động nhận diện Jekyll, Astro, Hugo, Hexo và HTML tĩnh.\n- Lên lịch đăng bài và hẹn giờ tự động xoá bài.\n- Dữ liệu thiết lập và nháp tách biệt trên thiết bị theo từng tài khoản Google.`,
  },
  {
    label: 'Điểm sách / Tài liệu',
    collection: 'sach',
    title: 'Nghệ thuật viết mạch lạc trong kỷ nguyên số',
    category: 'Sách hay',
    tags: ['doc-sach', 'tu-duy', 'viet-lach'],
    excerpt: 'Những bài học giá trị về cách cấu trúc lập luận ngắn gọn, súc tích và tôn trọng thời gian của người đọc.',
    markdownBody: `## Tóm tắt nội dung\n\nCuốn sách phân tích lý do vì sao văn phong trực diện, câu ngắn và ví dụ cụ thể luôn tạo sức thuyết phục cao hơn ngôn từ hoa mỹ.\n\n## Trích dẫn đáng nhớ\n\n- Bỏ mọi từ thừa trước khi thêm câu mới.\n- Viết cho một người đọc cụ thể thay vì viết cho đám đông vô hình.`,
  },
  {
    label: 'Sản phẩm / Ấn phẩm',
    collection: 'cua_hang',
    title: 'Bộ mẫu giao diện & tài liệu hướng dẫn GitHub Pages',
    category: 'Tài nguyên số',
    tags: ['template', 'ebook', 'seo'],
    excerpt: 'Trọn bộ cấu trúc thư mục, checklist SEO và hướng dẫn tối ưu RSS, Sitemap cho blog cá nhân.',
    markdownBody: `## Thành phần gói tài nguyên\n\n- Bộ khung cấu trúc bài viết chuẩn SEO.\n- Hướng dẫn kết nối tên miền riêng HTTPS trên GitHub Pages.\n- Tài liệu hướng dẫn sử dụng định dạng Markdown nâng cao.`,
  },
];
