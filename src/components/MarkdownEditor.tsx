import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  CalendarClock,
  Check,
  CheckCircle2,
  CheckSquare,
  CircleAlert,
  Clock,
  Code,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  GitBranch,
  Heading,
  ImagePlus,
  Images,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Save,
  Search,
  Send,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Strikethrough,
  Table,
  Trash2,
  Undo2,
  Upload,
  Video,
  X,
  Youtube,
} from 'lucide-react';
import type {
  AuthStatus,
  BlogCollection,
  BlogConfig,
  BlogPost,
  BlogTheme,
  RepoStructureInfo,
  ScheduledTask,
  SocialPlatformId,
} from '../types/blog';
import { COLLECTION_LABELS, STARTER_TEMPLATES } from '../data/themes';
import {
  composeMarkdownWithFrontmatter,
  estimateReadingStats,
  extractYouTubeVideoId,
  formatDisplayDate,
  renderMarkdownToSafeHtml,
  resolveYouTubeCoverUrl,
  slugifyVietnamese,
} from '../utils/markdown';
import {
  resolveGitHubAssetPreviewUrl,
  uploadImageToGitHub,
  type UploadedImageResult,
} from '../utils/imageUpload';
import { evaluatePostSeo } from '../utils/siteGenerators';
import {
  applyMissingImageAltSuggestions,
  autoOptimizePostSeo,
} from '../utils/seoAutoOptimizer';
import { ghCreateSchedule, ghSavePost } from '../utils/githubClient';
import {
  buildPublishedArticleUrl,
  buildSocialCaption,
  loadSocialCredentials,
  publishToSocialPlatform,
} from '../utils/socialPublisher';
import {
  type ActiveFormatsState,
  type FormatEditResult,
  cycleHeadingPrefix,
  getActiveFormatsAtCursor,
  handleSmartEnter,
  indentSelection,
  insertBlockElement,
  insertSmartLink,
  toggleCheckboxPrefix,
  toggleInlineFormat,
  toggleLinePrefix,
} from '../utils/obsidianFormat';
import { ImageBatchModal, type BatchInsertLayout } from './ImageBatchModal';
import { MediaLibraryModal } from './MediaLibraryModal';
import { ObsidianMobileToolbar } from './ObsidianMobileToolbar';
import { ResilientImage } from './ResilientImage';
import { SocialSharePanel } from './SocialSharePanel';

interface MarkdownEditorProps {
  theme: BlogTheme;
  config: BlogConfig;
  uid?: string;
  authStatus: AuthStatus | null;
  initialPost: BlogPost | null;
  existingPosts?: BlogPost[];
  defaultCollection?: BlogCollection;
  defaultBranch?: string;
  isAstroRepo?: boolean;
  repoStructure?: RepoStructureInfo | null;
  onSaveLocalDraft: (post: BlogPost) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPublishSuccess: (publishedPost: BlogPost, commitUrl?: string, socialNote?: string) => void;
  onScheduledSuccess?: (task: ScheduledTask, focusGitHubTab?: boolean) => void;
  onOpenGitHubTab: () => void;
  onMobileFocusChange?: (focused: boolean) => void;
}

type EditorPaneMode = 'write' | 'optimize' | 'split' | 'preview';

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function getPresetDatetimeInput(hoursOffset: number, fixedHour?: number): string {
  const d = new Date(Date.now() + hoursOffset * 3600000);
  if (fixedHour !== undefined) {
    d.setHours(fixedHour, 0, 0, 0);
  }
  return toLocalDatetimeInput(d);
}

export function MarkdownEditor({
  theme,
  config,
  uid = '',
  authStatus,
  initialPost,
  existingPosts = [],
  defaultCollection = 'bai_viet',
  defaultBranch = 'main',
  isAstroRepo = true,
  repoStructure = null,
  onSaveLocalDraft,
  onDirtyChange,
  onPublishSuccess,
  onScheduledSuccess,
  onOpenGitHubTab,
  onMobileFocusChange,
}: MarkdownEditorProps) {
  const { palette, fonts, isDark } = theme;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const bodyImageInputRef = useRef<HTMLInputElement | null>(null);

  const pendingSelectionRef = useRef<{
    start: number;
    end: number;
    scrollTop: number;
    winX: number;
    winY: number;
    refocus?: boolean;
  } | null>(null);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const blurTimerRef = useRef<number | null>(null);
  const historyRef = useRef<{
    past: Array<{ text: string; start: number; end: number }>;
    future: Array<{ text: string; start: number; end: number }>;
  }>({ past: [], future: [] });

  const [paneMode, setPaneMode] = useState<EditorPaneMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'write' : 'split'
  );

  const [collection, setCollection] = useState<BlogCollection>(
    initialPost?.collection || defaultCollection
  );
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Kỹ thuật');
  const [tagsText, setTagsText] = useState('markdown, github-pages');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState('');
  const [draft, setDraft] = useState(false);
  const [markdownBody, setMarkdownBody] = useState('');
  const [existingPath, setExistingPath] = useState<string | null>(null);
  const [existingSha, setExistingSha] = useState<string | undefined>(undefined);
  const [directoryMode, setDirectoryMode] = useState<string>(
    repoStructure?.postsDir || config.postsDirectory || '_posts'
  );

  // Collection-specific schema fields matching src/content/config.ts
  const [authorName, setAuthorName] = useState(config.authorName || 'Tác giả');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [inStock, setInStock] = useState(true);
  const [linkDemo, setLinkDemo] = useState('');
  const [linkGithub, setLinkGithub] = useState('');
  const [linkBuy, setLinkBuy] = useState('');
  const [formatsText, setFormatsText] = useState('PDF, EPUB');
  const [publishYear, setPublishYear] = useState('');
  const [featured, setFeatured] = useState(false);

  // Maps uploaded publicPath -> instant localDataUrl for zero-latency preview
  const [sessionImagePreviews, setSessionImagePreviews] = useState<Record<string, string>>({});
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingBodyImage, setIsUploadingBodyImage] = useState(false);
  const [showYoutubeCoverBox, setShowYoutubeCoverBox] = useState(false);
  const [youtubeCoverInput, setYoutubeCoverInput] = useState('');
  const [isExtractingYoutubeCover, setIsExtractingYoutubeCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDropFiles, setBatchDropFiles] = useState<File[]>([]);
  const [showMediaLibraryModal, setShowMediaLibraryModal] = useState(false);

  // Per-Post SEO Studio fields
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [noindex, setNoindex] = useState(false);
  const [copiedJsonLd, setCopiedJsonLd] = useState(false);
  const [isAutoOptimizingSeo, setIsAutoOptimizingSeo] = useState(false);
  const [seoOptimizeNote, setSeoOptimizeNote] = useState<string | null>(null);

  // Social Media Sharing state
  const [socialCaption, setSocialCaption] = useState('');
  const [socialCaptionEdited, setSocialCaptionEdited] = useState(false);
  const [selectedSocialPlatforms, setSelectedSocialPlatforms] = useState<SocialPlatformId[]>([]);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAtInput, setScheduledAtInput] = useState(() => getPresetDatetimeInput(1));
  const [enableAutoDelete, setEnableAutoDelete] = useState(false);
  const [autoDeleteAtInput, setAutoDeleteAtInput] = useState(() => getPresetDatetimeInput(24 * 7));
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [localSavedMessage, setLocalSavedMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const skipDirtyRef = useRef(true);
  const [editorFocused, setEditorFocused] = useState(false);
  const [historyMeta, setHistoryMeta] = useState({ canUndo: false, canRedo: false });
  const [activeFormats, setActiveFormats] = useState<ActiveFormatsState>({
    bold: false,
    italic: false,
    strike: false,
    code: false,
    headingLevel: 0,
    bullet: false,
    ordered: false,
    checkbox: false,
    quote: false,
  });

  useEffect(() => {
    if (initialPost) {
      setCollection(initialPost.collection || 'bai_viet');
      setTitle(initialPost.title);
      setSlug(initialPost.slug);
      setSlugEdited(true);
      setDate(initialPost.date || new Date().toISOString().slice(0, 10));
      setCategory(initialPost.category || 'Ghi chép');
      setTagsText(initialPost.tags.join(', '));
      setExcerpt(initialPost.excerpt || '');
      setCover(initialPost.cover || '');
      setDraft(Boolean(initialPost.draft));
      setMarkdownBody(initialPost.markdownBody || '');
      setExistingPath(initialPost.source === 'github' ? initialPost.path : null);
      setExistingSha(initialPost.source === 'github' ? initialPost.sha : undefined);

      setAuthorName(initialPost.authorName || config.authorName || 'Tác giả');
      setPrice(initialPost.price || '');
      setOriginalPrice(initialPost.originalPrice || '');
      setInStock(initialPost.inStock !== false);
      setLinkDemo(initialPost.linkDemo || '');
      setLinkGithub(initialPost.linkGithub || '');
      setLinkBuy(initialPost.linkBuy || '');
      setFormatsText((initialPost.formats || ['PDF', 'EPUB']).join(', '));
      setPublishYear(initialPost.publishYear ? String(initialPost.publishYear) : '');
      setFeatured(Boolean(initialPost.featured));
      setSeoTitle(initialPost.seoTitle || '');
      setSeoDescription(initialPost.seoDescription || '');
      setCanonicalUrl(initialPost.canonicalUrl || '');
      setNoindex(Boolean(initialPost.noindex));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setCollection(defaultCollection);
      setTitle('');
      setSlug('');
      setSlugEdited(false);
      setDate(today);
      setCategory(
        defaultCollection === 'bai_viet'
          ? 'Kỹ thuật'
          : COLLECTION_LABELS[defaultCollection].label
      );
      setTagsText(
        defaultCollection === 'du_an'
          ? 'TypeScript, Astro'
          : defaultCollection === 'sach'
          ? 'Kỹ thuật, Triết học'
          : defaultCollection === 'cua_hang'
          ? 'Ebook'
          : 'markdown, github-pages'
      );
      setExcerpt('');
      setCover('');
      setDraft(false);
      setMarkdownBody(
        `## Nội dung mới\n\nViết nội dung Markdown trực tiếp tại đây. Bạn có thể tải ảnh từ máy tính hoặc điện thoại để chèn thẳng vào bài viết.\n`
      );
      setExistingPath(null);
      setExistingSha(undefined);

      setAuthorName(config.authorName || 'Tác giả');
      setPrice(defaultCollection === 'sach' ? 'Miễn phí' : defaultCollection === 'cua_hang' ? '99.000₫' : '');
      setOriginalPrice('');
      setInStock(true);
      setLinkDemo('');
      setLinkGithub('');
      setLinkBuy('');
      setFormatsText('PDF, EPUB');
      setPublishYear('');
      setFeatured(false);
      setSeoTitle('');
      setSeoDescription('');
      setCanonicalUrl('');
      setNoindex(false);
    }
    setPublishError(null);
    setUploadError(null);
    setSocialCaptionEdited(false);
    setIsDirty(false);
    onDirtyChange?.(false);
    skipDirtyRef.current = true;
    historyRef.current = { past: [], future: [] };
    setHistoryMeta({ canUndo: false, canRedo: false });
    lastSelectionRef.current = { start: 0, end: 0 };
  }, [initialPost?.id, defaultCollection]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
      onMobileFocusChange?.(false);
    };
  }, [onMobileFocusChange]);

  useEffect(() => {
    if (!slugEdited && title.trim()) {
      setSlug(slugifyVietnamese(title));
    }
  }, [title, slugEdited]);

  useEffect(() => {
    setDirectoryMode(repoStructure?.postsDir || config.postsDirectory || '_posts');
  }, [repoStructure?.postsDir, config.postsDirectory]);

  const computedPath = useMemo(() => {
    if (existingPath) return existingPath;
    const cleanSlug = slugifyVietnamese(slug || title || 'bai-viet-moi');
    if (repoStructure?.framework === 'astro-vn' || directoryMode === 'src/content/bai_viet') {
      return `src/content/${collection}/${cleanSlug}.md`;
    }
    const cleanDir = directoryMode.replace(/^\/+|\/+$/g, '');
    if (cleanDir === '_posts') {
      return `_posts/${date || new Date().toISOString().slice(0, 10)}-${cleanSlug}.md`;
    }
    return `${cleanDir}/${cleanSlug}.md`;
  }, [existingPath, repoStructure?.framework, directoryMode, collection, date, slug, title]);

  const parsedTags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [tagsText]
  );

  const parsedFormats = useMemo(
    () =>
      formatsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [formatsText]
  );

  const effectiveSlug = useMemo(
    () => slugifyVietnamese(slug || title || 'bai-viet-moi'),
    [slug, title]
  );

  const postPublicUrl = useMemo(
    () => buildPublishedArticleUrl(config, effectiveSlug),
    [config, effectiveSlug]
  );

  useEffect(() => {
    if (!socialCaptionEdited) {
      setSocialCaption(
        buildSocialCaption({
          title: title || 'Bài viết mới',
          excerpt,
          tags: parsedTags,
          url: postPublicUrl,
        })
      );
    }
  }, [socialCaptionEdited, title, excerpt, parsedTags, postPublicUrl]);

  // B5: Pre-publish validation checks
  const validationIssues = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('Ngày đăng không đúng chuẩn YYYY-MM-DD.');
    }
    if (canonicalUrl.trim() && !/^https?:\/\/\S+$/i.test(canonicalUrl.trim())) {
      errors.push('Canonical URL phải bắt đầu bằng https:// hoặc http://.');
    }
    if (cover.trim() && !cover.trim().startsWith('/') && !/^https?:\/\/\S+$/i.test(cover.trim())) {
      warnings.push('Đường dẫn ảnh bìa nên bắt đầu bằng "/" hoặc "https://".');
    }

    const duplicatePost = existingPosts.find(
      (p) =>
        p.slug === effectiveSlug &&
        p.collection === collection &&
        p.path !== existingPath &&
        p.source === 'github'
    );
    if (duplicatePost) {
      warnings.push(
        `Slug "${effectiveSlug}" đang trùng với bài "${duplicatePost.title}" trên GitHub. Xuất bản sẽ ghi đè tệp này hoặc hãy đổi Slug khác.`
      );
    }

    return { errors, warnings };
  }, [date, canonicalUrl, cover, existingPosts, effectiveSlug, collection, existingPath]);

  const stats = useMemo(() => estimateReadingStats(markdownBody), [markdownBody]);

  const seoAudit = useMemo(
    () =>
      evaluatePostSeo({
        title,
        seoTitle,
        excerpt,
        seoDescription,
        slug: slugifyVietnamese(slug || title || 'bai-viet'),
        cover,
        date,
        markdownBody,
        tags: parsedTags,
        authorName: authorName || config.authorName,
        pagesUrl: config.pagesUrl,
        canonicalUrl,
        collection,
        framework: repoStructure?.framework,
      }),
    [
      title,
      seoTitle,
      excerpt,
      seoDescription,
      slug,
      cover,
      date,
      markdownBody,
      parsedTags,
      authorName,
      config.authorName,
      config.pagesUrl,
      canonicalUrl,
      collection,
      repoStructure?.framework,
    ]
  );

  // Resolve images inside preview HTML (session localDataUrl first, then raw GitHub fallback)
  const previewHtml = useMemo(() => {
    let bodyForPreview = markdownBody;
    for (const [pubPath, dataUrl] of Object.entries(sessionImagePreviews)) {
      if (bodyForPreview.includes(pubPath)) {
        bodyForPreview = bodyForPreview.split(pubPath).join(dataUrl);
      }
    }
    return renderMarkdownToSafeHtml(bodyForPreview, {
      owner: config.githubOwner,
      repo: config.githubRepo,
      isAstroRepo,
      assetsPrefix: repoStructure?.assetsPrefix,
    });
  }, [
    markdownBody,
    sessionImagePreviews,
    config.githubOwner,
    config.githubRepo,
    isAstroRepo,
    repoStructure?.assetsPrefix,
  ]);

  const coverPreviewPrimary = useMemo(() => {
    if (!cover) return '';
    if (sessionImagePreviews[cover]) return sessionImagePreviews[cover];
    if (cover.startsWith('/')) {
      const owner = config.githubOwner?.trim();
      const base = config.githubRepo?.trim();
      if (!owner || !base) return cover;
      const pagesPrefix = base.endsWith('.github.io')
        ? `https://${base}`
        : `https://${owner}.github.io/${base}`;
      return `${pagesPrefix}${cover}`;
    }
    return cover;
  }, [cover, sessionImagePreviews, config.githubOwner, config.githubRepo]);

  const coverPreviewFallback = useMemo(() => {
    if (!cover) return undefined;
    if (sessionImagePreviews[cover]) return sessionImagePreviews[cover];
    return resolveGitHubAssetPreviewUrl(
      cover,
      config.githubOwner,
      config.githubRepo,
      repoStructure?.assetsPrefix ?? isAstroRepo
    );
  }, [cover, sessionImagePreviews, config.githubOwner, config.githubRepo, repoStructure?.assetsPrefix, isAstroRepo]);

  // Lock caret selection & both textarea/window scroll synchronously before paint (zero mobile jump/jitter)
  useLayoutEffect(() => {
    const pending = pendingSelectionRef.current;
    const el = textareaRef.current;
    if (!pending || !el) return;
    pendingSelectionRef.current = null;

    if (pending.refocus && document.activeElement !== el) {
      el.focus({ preventScroll: true });
    }
    if (document.activeElement === el) {
      el.setSelectionRange(pending.start, pending.end);
    }
    el.scrollTop = pending.scrollTop;
    if (window.scrollX !== pending.winX || window.scrollY !== pending.winY) {
      window.scrollTo(pending.winX, pending.winY);
    }
  }, [markdownBody]);

  const getCursorBounds = () => {
    const el = textareaRef.current;
    if (el && document.activeElement === el) {
      return {
        start: el.selectionStart ?? 0,
        end: el.selectionEnd ?? 0,
      };
    }
    return {
      start: Math.min(lastSelectionRef.current.start, markdownBody.length),
      end: Math.min(lastSelectionRef.current.end, markdownBody.length),
    };
  };

  const syncCursorState = (textOverride?: string) => {
    const el = textareaRef.current;
    const text = textOverride ?? markdownBody;
    const start = el ? Math.min(el.selectionStart ?? 0, text.length) : 0;
    const end = el ? Math.min(el.selectionEnd ?? start, text.length) : start;
    lastSelectionRef.current = { start, end };
    setActiveFormats(getActiveFormatsAtCursor(text, start, end));
  };

  const syncHistoryMeta = () => {
    setHistoryMeta({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    });
  };

  const applyFormatEdit = (
    transform: (text: string, start: number, end: number) => FormatEditResult | null
  ): boolean => {
    const el = textareaRef.current;
    const { start, end } = getCursorBounds();
    const result = transform(markdownBody, start, end);
    if (!result) return false;

    historyRef.current.past.push({ text: markdownBody, start, end });
    if (historyRef.current.past.length > 60) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
    syncHistoryMeta();

    pendingSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
      scrollTop: el ? el.scrollTop : 0,
      winX: window.scrollX,
      winY: window.scrollY,
      refocus: Boolean(el && document.activeElement !== el),
    };
    lastSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };
    setMarkdownBody(result.text);
    setActiveFormats(
      getActiveFormatsAtCursor(result.text, result.selectionStart, result.selectionEnd)
    );
    return true;
  };

  const handleUndo = () => {
    const prev = historyRef.current.past.pop();
    if (!prev) return;
    const el = textareaRef.current;
    const { start, end } = getCursorBounds();
    historyRef.current.future.push({ text: markdownBody, start, end });
    syncHistoryMeta();

    pendingSelectionRef.current = {
      start: prev.start,
      end: prev.end,
      scrollTop: el ? el.scrollTop : 0,
      winX: window.scrollX,
      winY: window.scrollY,
      refocus: Boolean(el && document.activeElement !== el),
    };
    lastSelectionRef.current = { start: prev.start, end: prev.end };
    setMarkdownBody(prev.text);
    setActiveFormats(getActiveFormatsAtCursor(prev.text, prev.start, prev.end));
  };

  const handleRedo = () => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    const el = textareaRef.current;
    const { start, end } = getCursorBounds();
    historyRef.current.past.push({ text: markdownBody, start, end });
    syncHistoryMeta();

    pendingSelectionRef.current = {
      start: next.start,
      end: next.end,
      scrollTop: el ? el.scrollTop : 0,
      winX: window.scrollX,
      winY: window.scrollY,
      refocus: Boolean(el && document.activeElement !== el),
    };
    lastSelectionRef.current = { start: next.start, end: next.end };
    setMarkdownBody(next.text);
    setActiveFormats(getActiveFormatsAtCursor(next.text, next.start, next.end));
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const handled = applyFormatEdit((t, s, en) => handleSmartEnter(t, s, en));
      if (handled) {
        e.preventDefault();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const lower = e.key.toLowerCase();
      if (lower === 'b') {
        e.preventDefault();
        applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '**'));
      } else if (lower === 'i') {
        e.preventDefault();
        applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '*'));
      } else if (lower === 'z') {
        if (e.shiftKey && historyRef.current.future.length > 0) {
          e.preventDefault();
          handleRedo();
        } else if (!e.shiftKey && historyRef.current.past.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    }
  };

  const handleDismissKeyboard = () => {
    textareaRef.current?.blur();
    setEditorFocused(false);
    onMobileFocusChange?.(false);
  };

  const insertSnippet = (before: string, after = '', placeholder = '') => {
    applyFormatEdit((text, start, end) => {
      const selected = text.slice(start, end) || placeholder;
      const nextText = text.slice(0, start) + before + selected + after + text.slice(end);
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + selected.length;
      return {
        text: nextText,
        selectionStart: cursorStart,
        selectionEnd: cursorEnd,
      };
    });
  };

  const handleCoverFileSelected = async (file?: File | null) => {
    if (!file) return;
    setUploadError(null);
    setIsUploadingCover(true);
    try {
      const res = await uploadImageToGitHub({
        file,
        owner: config.githubOwner,
        repo: config.githubRepo,
        isAstroRepo,
        uploadDir: repoStructure?.uploadDir,
        publicUploadPrefix: repoStructure?.publicUploadPrefix,
      });
      setSessionImagePreviews((prev) => ({
        ...prev,
        [res.publicPath]: res.localDataUrl,
      }));
      setCover(res.publicPath);
    } catch (err: any) {
      setUploadError(err?.message || 'Không thể tải ảnh bìa lên GitHub.');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const detectedYoutubeVideoId = useMemo(() => {
    if (!cover || cover.includes('i.ytimg.com/vi/')) return null;
    return extractYouTubeVideoId(cover);
  }, [cover]);

  const handleExtractYoutubeCover = async (rawInput: string) => {
    const videoId = extractYouTubeVideoId(rawInput);
    if (!videoId) {
      setUploadError(
        'Link YouTube không hợp lệ. Hỗ trợ dạng youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...'
      );
      return;
    }
    setUploadError(null);
    setIsExtractingYoutubeCover(true);
    try {
      const resolved = await resolveYouTubeCoverUrl(rawInput);
      if (resolved?.thumbnailUrl) {
        setCover(resolved.thumbnailUrl);
        setYoutubeCoverInput('');
        setShowYoutubeCoverBox(false);
      }
    } finally {
      setIsExtractingYoutubeCover(false);
    }
  };

  const handleBodyImageFileSelected = async (file?: File | null) => {
    if (!file) return;
    setUploadError(null);
    setIsUploadingBodyImage(true);
    try {
      const res = await uploadImageToGitHub({
        file,
        owner: config.githubOwner,
        repo: config.githubRepo,
        isAstroRepo,
        uploadDir: repoStructure?.uploadDir,
        publicUploadPrefix: repoStructure?.publicUploadPrefix,
      });
      setSessionImagePreviews((prev) => ({
        ...prev,
        [res.publicPath]: res.localDataUrl,
      }));
      const altText = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ') || 'hình ảnh';
      insertSnippet(`\n![${altText}](${res.publicPath})\n`, '', '');
    } catch (err: any) {
      setUploadError(err?.message || 'Không thể tải ảnh lên GitHub.');
    } finally {
      setIsUploadingBodyImage(false);
      if (bodyImageInputRef.current) bodyImageInputRef.current.value = '';
    }
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleBodyImageFileSelected(file);
          return;
        }
      }
    }
  };

  const handleTextareaDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 1) {
      e.preventDefault();
      handleBodyImageFileSelected(imageFiles[0]);
    } else if (imageFiles.length > 1) {
      e.preventDefault();
      setBatchDropFiles(imageFiles);
      setShowBatchModal(true);
    }
  };

  const handleBatchUploaded = (params: {
    uploaded: UploadedImageResult[];
    altTexts: string[];
    layout: BatchInsertLayout;
    setFirstAsCover: boolean;
  }) => {
    const { uploaded, altTexts, layout, setFirstAsCover } = params;
    if (uploaded.length === 0) return;

    setSessionImagePreviews((prev) => {
      const next = { ...prev };
      for (const item of uploaded) {
        next[item.publicPath] = item.localDataUrl;
      }
      return next;
    });

    if (setFirstAsCover) {
      setCover(uploaded[0].publicPath);
    }

    if (layout === 'grid') {
      const figures = uploaded
        .map((item, idx) => {
          const alt = (altTexts[idx] || 'Hình ảnh').replace(/"/g, '&quot;');
          return `  <figure style="margin:0;">\n    <img src="${item.publicPath}" alt="${alt}" loading="lazy" style="width:100%;border-radius:10px;" />\n    <figcaption style="font-size:0.85em;opacity:0.75;margin-top:4px;">${alt}</figcaption>\n  </figure>`;
        })
        .join('\n');
      insertSnippet(
        `\n<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin:20px 0;">\n${figures}\n</div>\n`,
        '',
        ''
      );
    } else {
      const mdLines = uploaded
        .map((item, idx) => `![${altTexts[idx] || 'Hình ảnh'}](${item.publicPath})`)
        .join('\n\n');
      insertSnippet(`\n${mdLines}\n`, '', '');
    }
  };

  const handleLoadTemplate = (tplIndex: number) => {
    const tpl = STARTER_TEMPLATES[tplIndex];
    if (!tpl) return;
    if (!existingPath) {
      setCollection(tpl.collection);
    }
    setTitle(tpl.title);
    setSlug(slugifyVietnamese(tpl.title));
    setSlugEdited(false);
    setCategory(tpl.category);
    setTagsText(tpl.tags.join(', '));
    setExcerpt(tpl.excerpt);
    setMarkdownBody(tpl.markdownBody);
    setShowTemplateMenu(false);
  };

  const buildCurrentPostObject = (source: 'local' | 'github'): BlogPost => {
    const finalTitle = title.trim() || 'Chưa đặt tên';
    const finalSlug = slugifyVietnamese(slug || finalTitle);
    const safeExcerpt = excerpt.trim() || markdownBody.slice(0, 140).replace(/\s+/g, ' ');
    const raw = composeMarkdownWithFrontmatter({
      title: finalTitle,
      date,
      slug: finalSlug,
      category,
      tags: parsedTags,
      excerpt: safeExcerpt,
      cover: cover.trim() || undefined,
      draft,
      markdownBody,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      canonicalUrl: canonicalUrl.trim() || undefined,
      noindex,
    });

    return {
      id: existingSha || `local-${collection}-${finalSlug}`,
      collection,
      slug: finalSlug,
      title: finalTitle,
      date,
      category,
      tags: parsedTags,
      excerpt: safeExcerpt,
      cover: cover.trim() || undefined,
      draft,
      markdownBody,
      rawContent: raw,
      path: computedPath,
      sha: existingSha,
      source,
      authorName: authorName.trim() || undefined,
      price: price.trim() || undefined,
      originalPrice: originalPrice.trim() || undefined,
      inStock,
      linkDemo: linkDemo.trim() || undefined,
      linkGithub: linkGithub.trim() || undefined,
      linkBuy: linkBuy.trim() || undefined,
      formats: parsedFormats,
      publishYear: publishYear.trim() ? Number(publishYear.trim()) : undefined,
      featured,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      canonicalUrl: canonicalUrl.trim() || undefined,
      noindex,
    };
  };

  const handleSaveLocal = () => {
    const postObj = buildCurrentPostObject('local');
    onSaveLocalDraft(postObj);
    setIsDirty(false);
    onDirtyChange?.(false);
    setLocalSavedMessage(`Đã lưu nháp ${new Date().toLocaleTimeString('vi-VN')}`);
    setTimeout(() => setLocalSavedMessage(null), 3500);
  };

  // B1: 2.5s debounced auto-save draft + B3: dirty state & browser beforeunload guard
  useEffect(() => {
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setIsDirty(true);
    onDirtyChange?.(true);

    if (!title.trim() && markdownBody.trim().length < 20) return;

    const timer = window.setTimeout(() => {
      const postObj = buildCurrentPostObject('local');
      onSaveLocalDraft(postObj);
      setIsDirty(false);
      onDirtyChange?.(false);
      const hhmm = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setLocalSavedMessage(`Đã tự lưu lúc ${hhmm}`);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [title, slug, date, category, tagsText, excerpt, cover, draft, markdownBody, seoTitle, seoDescription, canonicalUrl, noindex]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const handleAutoOptimizeSeo = async () => {
    if (isAutoOptimizingSeo) return;
    setIsAutoOptimizingSeo(true);
    setSeoOptimizeNote(null);
    try {
      const suggestion = await autoOptimizePostSeo({
        title: title.trim() || 'Bài viết mới',
        category: category.trim(),
        markdownBody,
        tags: parsedTags,
      });

      if (suggestion.seoTitle) setSeoTitle(suggestion.seoTitle);
      if (suggestion.seoDescription) setSeoDescription(suggestion.seoDescription);
      if (suggestion.excerpt) setExcerpt(suggestion.excerpt);
      if (suggestion.slug) {
        setSlug(suggestion.slug);
        setSlugEdited(true);
      }
      if (suggestion.tags.length > 0) {
        const merged = Array.from(new Set([...parsedTags, ...suggestion.tags])).slice(0, 6);
        setTagsText(merged.join(', '));
      }

      let altCount = 0;
      if (suggestion.imageAltSuggestions.length > 0) {
        const altApplied = applyMissingImageAltSuggestions(
          markdownBody,
          suggestion.imageAltSuggestions
        );
        if (altApplied.updatedCount > 0) {
          setMarkdownBody(altApplied.updatedMarkdown);
          altCount = altApplied.updatedCount;
        }
      }

      const modeLabel = suggestion.mode === 'ai' ? 'AI Gemini' : 'Phân tích tự động cục bộ';
      setSeoOptimizeNote(
        `Đã tối ưu SEO (${modeLabel}): cập nhật tiêu đề SEO, meta description, slug, thẻ tags${
          altCount > 0 ? ` và bổ sung alt cho ${altCount} ảnh` : ''
        }.`
      );
    } finally {
      setIsAutoOptimizingSeo(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const postObj = buildCurrentPostObject('local');
    const blob = new Blob([postObj.rawContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${postObj.slug}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenPublishModal = () => {
    const finalTitle = title.trim() || 'Mục mới';
    const colLabel = COLLECTION_LABELS[collection].label.toLowerCase();
    setCommitMessage(
      existingSha ? `Cập nhật ${colLabel}: ${finalTitle}` : `Đăng ${colLabel}: ${finalTitle}`
    );
    setPublishMode('now');
    setScheduledAtInput(getPresetDatetimeInput(1));
    setEnableAutoDelete(false);
    setAutoDeleteAtInput(getPresetDatetimeInput(24 * 7));
    setPublishError(null);
    setShowPublishModal(true);
  };

  const handlePublishToGitHub = async () => {
    if (!title.trim()) {
      setPublishError('Vui lòng nhập tiêu đề trước khi đăng.');
      return;
    }
    if (validationIssues.errors.length > 0) {
      setPublishError(validationIssues.errors[0]);
      return;
    }

    const publishAtMs =
      publishMode === 'schedule' ? Date.parse(scheduledAtInput) : Date.now();
    if (publishMode === 'schedule') {
      if (!scheduledAtInput || Number.isNaN(publishAtMs)) {
        setPublishError('Vui lòng chọn thời gian đăng bài hợp lệ.');
        return;
      }
      if (publishAtMs <= Date.now() + 30000) {
        setPublishError('Thời gian hẹn đăng phải ở tương lai (ít nhất sau hiện tại 1 phút).');
        return;
      }
    }

    let autoDeleteIso: string | undefined;
    if (enableAutoDelete) {
      const autoDeleteMs = Date.parse(autoDeleteAtInput);
      if (!autoDeleteAtInput || Number.isNaN(autoDeleteMs)) {
        setPublishError('Vui lòng chọn thời gian tự động xoá bài hợp lệ.');
        return;
      }
      if (autoDeleteMs <= publishAtMs + 60000) {
        setPublishError('Thời điểm tự động xoá bài phải sau thời điểm đăng bài ít nhất 1 phút.');
        return;
      }
      autoDeleteIso = new Date(autoDeleteMs).toISOString();
    }

    setIsPublishing(true);
    setPublishError(null);

    const postPayload = {
      owner: config.githubOwner,
      repo: config.githubRepo,
      branch: defaultBranch || 'main',
      collection,
      filePath: computedPath,
      title: title.trim(),
      date,
      slug: slugifyVietnamese(slug || title),
      category,
      tags: parsedTags,
      excerpt: excerpt.trim(),
      cover: cover.trim() || undefined,
      draft,
      markdownBody,
      sha: existingSha,
      commitMessage:
        commitMessage.trim() ||
        (publishMode === 'schedule' ? `Scheduled publish: ${title.trim()}` : `Publish ${title.trim()}`),
      framework: repoStructure?.framework || 'jekyll',
      frontmatterSchema: repoStructure?.frontmatterSchema,
      existingFrontmatter: initialPost?.rawFrontmatter,
      authorName: authorName.trim() || undefined,
      price: price.trim() || undefined,
      originalPrice: originalPrice.trim() || undefined,
      inStock,
      linkDemo: linkDemo.trim() || undefined,
      linkGithub: linkGithub.trim() || undefined,
      linkBuy: linkBuy.trim() || undefined,
      formats: parsedFormats,
      publishYear: publishYear.trim() ? Number(publishYear.trim()) : undefined,
      featured,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      canonicalUrl: canonicalUrl.trim() || undefined,
      noindex,
    };

    try {
      if (publishMode === 'schedule') {
        const res = await ghCreateSchedule({
          type: 'publish',
          owner: config.githubOwner,
          repo: config.githubRepo,
          branch: defaultBranch || 'main',
          filePath: computedPath,
          title: title.trim(),
          scheduledAt: new Date(publishAtMs).toISOString(),
          autoDeleteAt: autoDeleteIso,
          postPayload,
        });
        if (!res.ok || !res.task) {
          setPublishError(res.error || 'Không thể lưu lịch đăng bài.');
          return;
        }
        onSaveLocalDraft(buildCurrentPostObject('local'));
        setShowPublishModal(false);
        onScheduledSuccess?.(res.task, true);
        return;
      }

      const data = await ghSavePost(postPayload);
      if (!data.ok || !data.post) {
        setPublishError(
          data.error || 'Không thể đăng bài lên GitHub. Vui lòng kiểm tra kết nối.'
        );
        return;
      }

      if (autoDeleteIso) {
        const delRes = await ghCreateSchedule({
          type: 'delete',
          owner: config.githubOwner,
          repo: config.githubRepo,
          branch: defaultBranch || 'main',
          filePath: data.post.path || computedPath,
          title: title.trim(),
          scheduledAt: autoDeleteIso,
        });
        if (delRes.ok && delRes.task) {
          onScheduledSuccess?.(delRes.task, false);
        }
      }

      let socialSummary: string | undefined;
      if (!draft && selectedSocialPlatforms.length > 0) {
        const creds = loadSocialCredentials(uid);
        const articleUrl = buildPublishedArticleUrl(config, postPayload.slug);
        const shareCaption = socialCaption.trim() || title.trim();
        const shareResults = await Promise.all(
          selectedSocialPlatforms.map((pid) =>
            publishToSocialPlatform(pid, creds, {
              title: title.trim(),
              excerpt: excerpt.trim(),
              caption: shareCaption,
              url: articleUrl,
              cover: cover.trim() || undefined,
            })
          )
        );
        const okNames = shareResults.filter((r) => r.ok).map((r) => r.platformName);
        const failCount = shareResults.filter((r) => !r.ok).length;
        if (okNames.length > 0) {
          socialSummary = `Đã chia sẻ API tới ${okNames.join(', ')}${failCount > 0 ? ` (${failCount} nền tảng cần mở hộp thoại/API)` : ''}.`;
        } else if (failCount > 0) {
          socialSummary = `Bài viết đã lên GitHub; ${failCount} nền tảng mạng xã hội chưa có Token hoặc cần mở hộp thoại chia sẻ thủ công.`;
        }
      }

      setExistingPath(data.post.path);
      setExistingSha(data.post.sha);
      setIsDirty(false);
      onDirtyChange?.(false);
      setShowPublishModal(false);
      onPublishSuccess(data.post, data.commit?.html_url, socialSummary);
    } catch {
      setPublishError('Lỗi mạng khi kết nối tới GitHub API.');
    } finally {
      setIsPublishing(false);
    }
  };

  const titleLabel =
    collection === 'cua_hang'
      ? 'Tên sản phẩm'
      : collection === 'sach'
      ? 'Tên sách'
      : collection === 'du_an'
      ? 'Tên dự án'
      : 'Tiêu đề bài viết';

  const coverLabel =
    collection === 'cua_hang'
      ? 'Ảnh sản phẩm'
      : collection === 'du_an'
      ? 'Ảnh đại diện dự án'
      : 'Ảnh bìa';

  const tagsLabel =
    collection === 'du_an'
      ? 'Công nghệ (phân tách bởi dấu phẩy)'
      : collection === 'sach'
      ? 'Thể loại (phân tách bởi dấu phẩy)'
      : collection === 'cua_hang'
      ? 'Danh mục (phân tách bởi dấu phẩy)'
      : 'Thẻ (phân tách bởi dấu phẩy)';

  return (
    <div
      style={{
        backgroundColor: palette.canvas,
        color: palette.textPrimary,
        fontFamily: fonts.body,
      }}
      className="min-h-[calc(100vh-4rem)] flex flex-col pb-20 md:pb-6"
    >
      {/* Hidden File Inputs for Device Upload */}
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleCoverFileSelected(e.target.files?.[0])}
      />
      <input
        ref={bodyImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleBodyImageFileSelected(e.target.files?.[0])}
      />

      {/* Editor Sub-Toolbar */}
      <div
        style={{
          borderColor: palette.border,
          backgroundColor: palette.surface,
        }}
        className="border-b px-3 sm:px-6 py-2 sm:py-3"
      >
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          {/* View Mode Segmented Control (Write | Optimize & SEO | Preview | Desktop Split) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              style={{
                backgroundColor: palette.canvas,
                borderColor: palette.border,
              }}
              className="inline-flex p-1 rounded-xl border overflow-x-auto max-w-full"
              role="group"
              aria-label="Chế độ trình biên soạn"
            >
              {(
                [
                  { id: 'write', label: 'Viết bài', desktopOnly: false },
                  {
                    id: 'optimize',
                    label: `Tối ưu · ${seoAudit.score}đ`,
                    desktopOnly: false,
                  },
                  { id: 'split', label: 'Chia đôi', desktopOnly: true },
                  { id: 'preview', label: 'Xem trước', desktopOnly: false },
                ] as const
              ).map((mode) => {
                const active = paneMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaneMode(mode.id)}
                    style={{
                      backgroundColor: active ? palette.accent : 'transparent',
                      color: active ? palette.accentText : palette.textSecondary,
                    }}
                    className={`${
                      mode.desktopOnly ? 'hidden lg:inline-flex' : 'inline-flex'
                    } items-center justify-center px-3 min-h-[38px] sm:min-h-[36px] text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateMenu((v) => !v)}
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.canvas,
                  color: palette.textPrimary,
                }}
                className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                Mẫu nội dung
              </button>
              {showTemplateMenu && (
                <div
                  style={{
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                  className="absolute left-0 mt-2 w-64 rounded-xl border shadow-lg p-1.5 z-30"
                >
                  {STARTER_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => handleLoadTemplate(idx)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-xs hover:bg-black/5 cursor-pointer min-h-[44px]"
                    >
                      <div className="font-semibold">{tpl.label}</div>
                      <div style={{ color: palette.textMuted }} className="truncate mt-0.5">
                        {tpl.title}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {localSavedMessage && (
              <span style={{ color: palette.textMuted }} className="text-xs">
                {localSavedMessage}
              </span>
            )}
          </div>

          {/* Primary Editor Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveLocal}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              className="inline-flex items-center gap-1.5 px-3 min-h-[44px] sm:min-h-[38px] text-xs sm:text-sm font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
                color: palette.textPrimary,
              }}
              aria-label="Tải xuống .md"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs sm:text-sm font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              Tải .md
            </button>

            <button
              type="button"
              onClick={handleOpenPublishModal}
              style={{
                backgroundColor: palette.accent,
                color: palette.accentText,
              }}
              className="inline-flex items-center gap-2 px-4 min-h-[44px] sm:min-h-[38px] text-xs sm:text-sm font-semibold rounded-lg cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              Đăng lên GitHub
            </button>
          </div>
        </div>
      </div>

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center justify-between gap-3">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              aria-label="Đóng lỗi"
              className="p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Separated Workspace: Write / Optimize & SEO / Split / Preview */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. WRITING CANVAS (Distraction-free Title + Toolbar + Full-Height Textarea) */}
        {(paneMode === 'write' || paneMode === 'split') && (
          <div
            className={`${
              paneMode === 'split'
                ? 'lg:col-span-6'
                : 'lg:col-span-12 max-w-[920px] mx-auto w-full'
            } flex flex-col gap-3`}
          >
            {/* Streamlined Title Bar */}
            <div>
              <input
                id="post-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Nhập ${titleLabel.toLowerCase()}...`}
                aria-label={titleLabel}
                style={{
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                  fontFamily: fonts.display,
                }}
                className="w-full px-4 py-3 min-h-[50px] text-lg sm:text-xl font-bold rounded-2xl border focus:outline-none focus:ring-2"
              />
            </div>

            {/* Markdown Toolbar + Spacious Editor Surface */}
            <div
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surfaceElevated,
              }}
              className="flex-1 flex flex-col rounded-2xl border overflow-hidden min-h-[58vh] lg:min-h-[540px]"
            >
              {/* Desktop/Tablet Formatting Bar (Hidden on mobile where Obsidian accessory bar docks above keyboard) */}
              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                }}
                className="hidden md:flex px-2.5 py-1.5 border-b items-center gap-1 overflow-x-auto flex-nowrap"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => bodyImageInputRef.current?.click()}
                  disabled={isUploadingBodyImage}
                  style={{
                    backgroundColor: palette.accent,
                    color: palette.accentText,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap shrink-0 mr-1 disabled:opacity-50"
                >
                  {isUploadingBodyImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      Chèn ảnh
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setBatchDropFiles([]);
                    setShowBatchModal(true);
                  }}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.canvas,
                    color: palette.textPrimary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold rounded-lg border cursor-pointer whitespace-nowrap shrink-0 mr-1 hover:opacity-85"
                >
                  <Images className="w-4 h-4" />
                  Loạt ảnh
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowMediaLibraryModal(true)}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.canvas,
                    color: palette.textPrimary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-semibold rounded-lg border cursor-pointer whitespace-nowrap shrink-0 mr-1 hover:opacity-85"
                >
                  <FolderOpen className="w-4 h-4" />
                  Thư viện ảnh
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleUndo}
                  disabled={!historyMeta.canUndo}
                  title="Hoàn tác"
                  aria-label="Hoàn tác"
                  style={{ color: palette.textSecondary }}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-black/5 cursor-pointer disabled:opacity-30 shrink-0"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleRedo}
                  disabled={!historyMeta.canRedo}
                  title="Làm lại"
                  aria-label="Làm lại"
                  style={{ color: palette.textSecondary }}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-black/5 cursor-pointer disabled:opacity-30 shrink-0"
                >
                  <Redo2 className="w-4 h-4" />
                </button>

                <span
                  style={{ backgroundColor: palette.border }}
                  className="w-px h-5 mx-1 shrink-0"
                  aria-hidden="true"
                />

                {[
                  {
                    icon: Heading,
                    label: 'Đổi cấp tiêu đề (H2/H3/H4/H1)',
                    active: activeFormats.headingLevel > 0,
                    badge:
                      activeFormats.headingLevel > 0 ? String(activeFormats.headingLevel) : undefined,
                    action: () => applyFormatEdit((t, s, en) => cycleHeadingPrefix(t, s, en)),
                  },
                  {
                    icon: Bold,
                    label: 'In đậm',
                    active: activeFormats.bold,
                    action: () => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '**')),
                  },
                  {
                    icon: Italic,
                    label: 'In nghiêng',
                    active: activeFormats.italic,
                    action: () => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '*')),
                  },
                  {
                    icon: Strikethrough,
                    label: 'Gạch ngang',
                    active: activeFormats.strike,
                    action: () => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '~~')),
                  },
                  {
                    icon: Code,
                    label: 'Mã nội tuyến',
                    active: activeFormats.code,
                    action: () => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '`')),
                  },
                  {
                    icon: Quote,
                    label: 'Trích dẫn',
                    active: activeFormats.quote,
                    action: () => applyFormatEdit((t, s, en) => toggleLinePrefix(t, s, en, 'quote')),
                  },
                  {
                    icon: List,
                    label: 'Danh sách',
                    active: activeFormats.bullet,
                    action: () => applyFormatEdit((t, s, en) => toggleLinePrefix(t, s, en, 'bullet')),
                  },
                  {
                    icon: ListOrdered,
                    label: 'Danh sách số',
                    active: activeFormats.ordered,
                    action: () =>
                      applyFormatEdit((t, s, en) => toggleLinePrefix(t, s, en, 'ordered')),
                  },
                  {
                    icon: CheckSquare,
                    label: 'Checkbox công việc',
                    active: activeFormats.checkbox,
                    action: () => applyFormatEdit((t, s, en) => toggleCheckboxPrefix(t, s, en)),
                  },
                  {
                    icon: Link2,
                    label: 'Chèn liên kết',
                    active: false,
                    action: () => applyFormatEdit((t, s, en) => insertSmartLink(t, s, en)),
                  },
                  {
                    icon: Code2,
                    label: 'Khối mã nguồn',
                    active: false,
                    action: () =>
                      applyFormatEdit((t, s, en) => insertBlockElement(t, s, en, 'codeblock')),
                  },
                  {
                    icon: Table,
                    label: 'Chèn bảng',
                    active: false,
                    action: () =>
                      applyFormatEdit((t, s, en) => insertBlockElement(t, s, en, 'table')),
                  },
                  {
                    icon: Minus,
                    label: 'Đường phân cách',
                    active: false,
                    action: () => applyFormatEdit((t, s, en) => insertBlockElement(t, s, en, 'hr')),
                  },
                  {
                    icon: Info,
                    label: 'Callout ghi chú (Obsidian)',
                    active: false,
                    action: () =>
                      insertSnippet(
                        '\n> [!NOTE] Ghi chú\n> ',
                        '\n',
                        'Nội dung ghi chú nổi bật...'
                      ),
                  },
                  {
                    icon: Sigma,
                    label: 'Công thức toán LaTeX (KaTeX)',
                    active: false,
                    action: () => insertSnippet('\n$$\n', '\n$$\n', 'E = mc^2'),
                  },
                  {
                    icon: GitBranch,
                    label: 'Sơ đồ Mermaid',
                    active: false,
                    action: () =>
                      insertSnippet(
                        '\n```mermaid\ngraph TD;\n  A[Bắt đầu] --> B[Kết thúc];\n',
                        '```\n',
                        ''
                      ),
                  },
                  {
                    icon: Video,
                    label: 'Nhúng Video YouTube / Vimeo',
                    active: false,
                    action: () =>
                      insertSnippet(
                        '\n@[youtube](',
                        ')\n',
                        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                      ),
                  },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.label}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={tool.action}
                      title={tool.label}
                      aria-label={tool.label}
                      aria-pressed={tool.active}
                      style={{
                        color: tool.active ? palette.accent : palette.textSecondary,
                        backgroundColor: tool.active
                          ? isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(15,23,42,0.07)'
                          : 'transparent',
                      }}
                      className="min-w-[38px] min-h-[38px] px-1.5 flex items-center justify-center rounded-lg hover:bg-black/5 cursor-pointer transition-colors shrink-0"
                    >
                      <Icon className="w-4 h-4" />
                      {tool.badge && (
                        <span className="ml-0.5 text-[10px] font-bold leading-none tabular-nums">
                          {tool.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <textarea
                ref={textareaRef}
                value={markdownBody}
                onChange={(e) => {
                  const nextVal = e.target.value;
                  const start = e.currentTarget.selectionStart ?? 0;
                  const end = e.currentTarget.selectionEnd ?? start;
                  setMarkdownBody(nextVal);
                  lastSelectionRef.current = { start, end };
                  setActiveFormats(getActiveFormatsAtCursor(nextVal, start, end));
                }}
                onFocus={() => {
                  if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                  setEditorFocused(true);
                  onMobileFocusChange?.(true);
                  syncCursorState();
                }}
                onBlur={() => {
                  if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
                  blurTimerRef.current = window.setTimeout(() => {
                    if (document.activeElement !== textareaRef.current) {
                      setEditorFocused(false);
                      onMobileFocusChange?.(false);
                    }
                  }, 80);
                }}
                onSelect={() => syncCursorState()}
                onKeyUp={() => syncCursorState()}
                onClick={() => syncCursorState()}
                onKeyDown={handleTextareaKeyDown}
                onPaste={handleTextareaPaste}
                onDrop={handleTextareaDrop}
                placeholder="Viết nội dung bài blog tại đây (hỗ trợ định dạng Obsidian, dán hoặc kéo thả ảnh)..."
                style={{
                  backgroundColor: palette.surfaceElevated,
                  color: palette.textPrimary,
                  fontFamily: fonts.mono,
                }}
                className="flex-1 w-full p-4 sm:p-5 pb-20 md:pb-5 text-[16px] sm:text-[15px] leading-[1.7] resize-none focus:outline-none min-h-[54vh] md:min-h-[450px]"
              />

              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                  color: palette.textMuted,
                  fontFamily: fonts.mono,
                }}
                className="px-4 py-2.5 border-t text-xs tabular-nums flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {stats.words} từ · {stats.chars} ký tự · ~{stats.minutes} phút đọc
                </span>
                <button
                  type="button"
                  onClick={() => setPaneMode('optimize')}
                  style={{ color: palette.link }}
                  className="inline-flex items-center gap-1.5 font-semibold hover:underline underline-offset-4 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Ảnh bìa &amp; Tối ưu SEO ({seoAudit.score}/100) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. DEDICATED POST OPTIMIZATION & SEO VIEW (Separated for spacious mobile writing) */}
        {paneMode === 'optimize' && (
          <div className="lg:col-span-12 max-w-[920px] mx-auto w-full space-y-5">
            {/* Section A: Cover Image (Upload / YouTube) & Article Metadata */}
            <div
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
              className="p-4 sm:p-6 rounded-2xl border space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 style={{ fontFamily: fonts.display }} className="text-lg font-bold">
                    Ảnh bìa &amp; Thông tin bài viết
                  </h2>
                  <p style={{ color: palette.textMuted }} className="text-xs mt-0.5">
                    Thiết lập ảnh đại diện (tải từ máy hoặc lấy từ link YouTube), chuyên mục và tóm tắt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaneMode('write')}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.canvas,
                    color: palette.textPrimary,
                  }}
                  className="px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85 whitespace-nowrap"
                >
                  ← Quay lại viết bài
                </button>
              </div>

              {/* Cover Image Upload & YouTube Extractor */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="post-cover-input"
                    style={{ color: palette.textMuted }}
                    className="text-xs font-medium"
                  >
                    {coverLabel}
                  </label>
                  {cover && (
                    <button
                      type="button"
                      onClick={() => setCover('')}
                      style={{ color: palette.textMuted }}
                      className="inline-flex items-center gap-1 text-xs hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xoá ảnh bìa
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={isUploadingCover || isExtractingYoutubeCover}
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {isUploadingCover ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải ảnh lên GitHub...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Tải ảnh từ máy
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (detectedYoutubeVideoId) {
                        handleExtractYoutubeCover(cover);
                      } else {
                        setShowYoutubeCoverBox((v) => !v);
                      }
                    }}
                    disabled={isExtractingYoutubeCover}
                    style={{
                      backgroundColor: showYoutubeCoverBox ? palette.accent : palette.canvas,
                      borderColor: showYoutubeCoverBox ? palette.accent : palette.border,
                      color: showYoutubeCoverBox ? palette.accentText : palette.textPrimary,
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {isExtractingYoutubeCover ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Youtube className="w-4 h-4 text-red-500" />
                    )}
                    Lấy từ YouTube
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMediaLibraryModal(true)}
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] text-xs sm:text-sm font-semibold rounded-xl border cursor-pointer hover:opacity-85 whitespace-nowrap shrink-0"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Thư viện ảnh
                  </button>

                  <input
                    id="post-cover-input"
                    type="text"
                    value={cover}
                    onChange={(e) => setCover(e.target.value)}
                    onPaste={(e) => {
                      const pasted = e.clipboardData?.getData('text')?.trim() || '';
                      if (
                        pasted &&
                        !pasted.includes('i.ytimg.com/vi/') &&
                        extractYouTubeVideoId(pasted)
                      ) {
                        e.preventDefault();
                        handleExtractYoutubeCover(pasted);
                      }
                    }}
                    placeholder="/tainguyen/hinhanh/... hoặc dán URL ảnh / link video YouTube"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="flex-1 min-w-0 px-3.5 min-h-[44px] text-xs rounded-xl border"
                  />
                </div>

                {showYoutubeCoverBox && (
                  <div
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.canvas,
                    }}
                    className="p-3 rounded-xl border flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="url"
                      value={youtubeCoverInput}
                      onChange={(e) => setYoutubeCoverInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleExtractYoutubeCover(youtubeCoverInput);
                        }
                      }}
                      placeholder="Dán link video YouTube (https://youtube.com/watch?v=... hoặc https://youtu.be/...)"
                      style={{
                        backgroundColor: palette.surface,
                        borderColor: palette.border,
                        color: palette.textPrimary,
                      }}
                      className="flex-1 min-w-0 px-3 min-h-[40px] text-xs rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => handleExtractYoutubeCover(youtubeCoverInput)}
                      disabled={isExtractingYoutubeCover || !youtubeCoverInput.trim()}
                      style={{
                        backgroundColor: palette.accent,
                        color: palette.accentText,
                      }}
                      className="px-4 min-h-[40px] text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-45 whitespace-nowrap shrink-0"
                    >
                      {isExtractingYoutubeCover ? 'Đang lấy ảnh...' : 'Lấy ảnh bìa'}
                    </button>
                  </div>
                )}

                {detectedYoutubeVideoId && (
                  <div
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.canvas,
                    }}
                    className="px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span style={{ color: palette.textSecondary }} className="flex items-center gap-1.5">
                      <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                      Đã nhận diện link YouTube (<code>{detectedYoutubeVideoId}</code>)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExtractYoutubeCover(cover)}
                      disabled={isExtractingYoutubeCover}
                      style={{
                        backgroundColor: palette.accent,
                        color: palette.accentText,
                      }}
                      className="px-3 min-h-[32px] text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {isExtractingYoutubeCover ? 'Đang lấy ảnh...' : 'Lấy ảnh bìa video này'}
                    </button>
                  </div>
                )}

                {cover && (
                  <div className="pt-1 space-y-1.5">
                    <ResilientImage
                      src={coverPreviewPrimary}
                      fallbackSrc={coverPreviewFallback}
                      alt={title || coverLabel}
                      fallbackTitle={cover}
                      isDark={isDark}
                      className="w-full h-44 sm:h-52 object-cover rounded-xl"
                    />
                    {cover.includes('i.ytimg.com/vi/') && (
                      <div
                        style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                        className="text-[11px] truncate"
                      >
                        Ảnh bìa trích xuất từ video YouTube: {cover}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Blog Post Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="post-slug-input"
                    style={{ color: palette.textMuted }}
                    className="block text-xs font-medium mb-1"
                  >
                    Đường dẫn (Slug)
                  </label>
                  <input
                    id="post-slug-input"
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugEdited(true);
                    }}
                    placeholder="tu-dong-tao-slug"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                      fontFamily: fonts.mono,
                    }}
                    className="w-full px-3 min-h-[44px] sm:min-h-[40px] text-xs rounded-xl border"
                  />
                </div>

                <div>
                  <label
                    htmlFor="post-date-input"
                    style={{ color: palette.textMuted }}
                    className="block text-xs font-medium mb-1"
                  >
                    Ngày đăng
                  </label>
                  <input
                    id="post-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                      fontFamily: fonts.mono,
                    }}
                    className="w-full px-3 min-h-[44px] sm:min-h-[40px] text-xs rounded-xl border tabular-nums"
                  />
                </div>

                <div>
                  <label
                    htmlFor="post-category-input"
                    style={{ color: palette.textMuted }}
                    className="block text-xs font-medium mb-1"
                  >
                    Danh mục
                  </label>
                  <input
                    id="post-category-input"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Tiểu luận / Kỹ thuật"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[44px] sm:min-h-[40px] text-xs rounded-xl border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="post-tags-input"
                    style={{ color: palette.textMuted }}
                    className="block text-xs font-medium mb-1"
                  >
                    {tagsLabel}
                  </label>
                  <input
                    id="post-tags-input"
                    type="text"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="github-pages, markdown"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[44px] sm:min-h-[40px] text-xs rounded-xl border"
                  />
                </div>

                <div>
                  <label
                    htmlFor="post-excerpt-input"
                    style={{ color: palette.textMuted }}
                    className="block text-xs font-medium mb-1"
                  >
                    Mô tả ngắn (Sapo / Tóm tắt)
                  </label>
                  <input
                    id="post-excerpt-input"
                    type="text"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Tóm tắt ngắn hiển thị ở trang nhất & Google Search..."
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[44px] sm:min-h-[40px] text-xs rounded-xl border"
                  />
                </div>
              </div>

              {/* Optional Legacy Fields ONLY when editing pre-existing non-blog files */}
              {collection === 'du_an' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                      Link Demo
                    </label>
                    <input
                      type="url"
                      value={linkDemo}
                      onChange={(e) => setLinkDemo(e.target.value)}
                      style={{
                        backgroundColor: palette.canvas,
                        borderColor: palette.border,
                        color: palette.textPrimary,
                      }}
                      className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                    />
                  </div>
                  <div>
                    <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                      Link GitHub
                    </label>
                    <input
                      type="url"
                      value={linkGithub}
                      onChange={(e) => setLinkGithub(e.target.value)}
                      style={{
                        backgroundColor: palette.canvas,
                        borderColor: palette.border,
                        color: palette.textPrimary,
                      }}
                      className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                    />
                  </div>
                </div>
              )}

              {collection === 'sach' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Tác giả"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                  <input
                    type="number"
                    value={publishYear}
                    onChange={(e) => setPublishYear(e.target.value)}
                    placeholder="Năm xuất bản"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                  <input
                    type="text"
                    value={formatsText}
                    onChange={(e) => setFormatsText(e.target.value)}
                    placeholder="PDF, EPUB"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                </div>
              )}

              {collection === 'cua_hang' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Giá bán"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                  <input
                    type="text"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="Giá gốc"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                  <input
                    type="text"
                    value={linkBuy}
                    onChange={(e) => setLinkBuy(e.target.value)}
                    placeholder="Link đặt mua"
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                </div>
              )}

              {/* Target Path & Draft Toggle */}
              <div
                style={{ borderColor: palette.border }}
                className="pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div
                  style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                  className="truncate max-w-full"
                >
                  Đích tệp: <span style={{ color: palette.textPrimary }}>{computedPath}</span>
                </div>

                {collection === 'bai_viet' && (
                  <label className="inline-flex items-center gap-2 min-h-[36px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draft}
                      onChange={(e) => setDraft(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: palette.textSecondary }}>Lưu dạng bản nháp (nhap)</span>
                  </label>
                )}

                {collection === 'sach' && (
                  <label className="inline-flex items-center gap-2 min-h-[36px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: palette.textSecondary }}>Nổi bật (noi_bat)</span>
                  </label>
                )}

                {collection === 'cua_hang' && (
                  <label className="inline-flex items-center gap-2 min-h-[36px] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => setInStock(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span style={{ color: palette.textSecondary }}>Còn hàng (con_hang)</span>
                  </label>
                )}
              </div>
            </div>

            {/* Section B: Dedicated SEO Studio (Always open in Optimization tab) */}
            <div
              style={{
                borderColor: palette.border,
                backgroundColor: palette.surface,
              }}
              className="p-4 sm:p-6 rounded-2xl border space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-base font-bold">
                  <Search className="w-4 h-4" style={{ color: palette.link }} />
                  <span style={{ fontFamily: fonts.display }}>
                    Tối ưu SEO, Google Snippet &amp; Schema JSON-LD
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleAutoOptimizeSeo()}
                    disabled={isAutoOptimizingSeo}
                    style={{
                      backgroundColor: palette.accent,
                      color: palette.accentText,
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 min-h-[40px] text-xs font-semibold rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isAutoOptimizingSeo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Đang tối ưu SEO...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Tự động tối ưu SEO
                      </>
                    )}
                  </button>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      seoAudit.score >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : seoAudit.score >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-500'
                    }`}
                  >
                    Điểm SEO: {seoAudit.score}/100
                  </span>
                </div>
              </div>

              {seoOptimizeNote && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
                  <span>{seoOptimizeNote}</span>
                  <button
                    type="button"
                    onClick={() => setSeoOptimizeNote(null)}
                    aria-label="Đóng thông báo tối ưu SEO"
                    className="p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Google Search Snippet Preview */}
              <div className="space-y-1.5">
                <div style={{ color: palette.textMuted }} className="text-xs font-medium">
                  Xem trước hiển thị trên Google Search
                </div>
                <div
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceElevated,
                  }}
                  className="p-4 rounded-xl border space-y-1"
                >
                  <div
                    style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                    className="text-[11px] truncate"
                  >
                    {seoAudit.previewUrl}
                  </div>
                  <div
                    className="text-sm sm:text-base font-semibold leading-snug truncate"
                    style={{ color: palette.link }}
                  >
                    {seoAudit.effectiveTitle}
                  </div>
                  <div
                    style={{ color: palette.textSecondary }}
                    className="text-xs leading-relaxed line-clamp-2"
                  >
                    {seoAudit.effectiveDescription}
                  </div>
                </div>
              </div>

              {/* SEO Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {seoAudit.checks.map((chk) => (
                  <div
                    key={chk.id}
                    style={{
                      borderColor: palette.border,
                      backgroundColor: palette.canvas,
                    }}
                    className="p-3 rounded-xl border flex items-start gap-2.5 text-xs"
                  >
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <CircleAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium leading-snug">{chk.label}</div>
                      <div style={{ color: palette.textMuted }} className="text-[11px] truncate">
                        {chk.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Optional Custom SEO Overrides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                    Tiêu đề SEO riêng (seo_title — tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || 'Mặc định dùng tiêu đề bài viết'}
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                </div>
                <div>
                  <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                    Canonical URL (tuỳ chọn)
                  </label>
                  <input
                    type="url"
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder={seoAudit.previewUrl}
                    style={{
                      backgroundColor: palette.canvas,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                      fontFamily: fonts.mono,
                    }}
                    className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                  />
                </div>
              </div>

              <div>
                <label style={{ color: palette.textMuted }} className="block text-xs mb-1">
                  Meta Description riêng (seo_description — tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder={excerpt || 'Mặc định dùng mô tả ngắn'}
                  style={{
                    backgroundColor: palette.canvas,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                  className="w-full px-3 min-h-[40px] text-xs rounded-xl border"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={noindex}
                    onChange={(e) => setNoindex(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span style={{ color: palette.textSecondary }}>
                    Ẩn khỏi Google &amp; RSS (noindex)
                  </span>
                </label>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(seoAudit.articleJsonLd);
                      setCopiedJsonLd(true);
                      setTimeout(() => setCopiedJsonLd(false), 2000);
                    } catch {
                      // ignore
                    }
                  }}
                  style={{
                    borderColor: palette.border,
                    backgroundColor: palette.canvas,
                    color: palette.textPrimary,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 min-h-[38px] text-xs font-medium rounded-lg border cursor-pointer hover:opacity-85"
                >
                  {copiedJsonLd ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedJsonLd ? 'Đã chép Schema JSON-LD' : 'Sao chép Schema JSON-LD'}
                </button>
              </div>
            </div>

            {/* Section B2: Validation Notice inside Tối ưu */}
            {(validationIssues.errors.length > 0 || validationIssues.warnings.length > 0) && (
              <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-1.5 text-xs text-amber-800 dark:text-amber-200">
                <div className="font-semibold">Kiểm tra trước khi xuất bản:</div>
                {validationIssues.errors.map((err) => (
                  <div key={err} className="text-red-600 dark:text-red-400 font-medium">
                    • {err}
                  </div>
                ))}
                {validationIssues.warnings.map((warn) => (
                  <div key={warn}>• {warn}</div>
                ))}
              </div>
            )}

            {/* Section C: Official Social Media Sharing Studio */}
            <SocialSharePanel
              mode="studio"
              theme={theme}
              uid={uid}
              postTitle={title}
              postExcerpt={excerpt}
              postUrl={postPublicUrl}
              postCover={coverPreviewPrimary || cover}
              caption={socialCaption}
              onChangeCaption={(val) => {
                setSocialCaption(val);
                setSocialCaptionEdited(true);
              }}
              selectedPlatforms={selectedSocialPlatforms}
              onChangeSelectedPlatforms={setSelectedSocialPlatforms}
            />
          </div>
        )}

        {/* 3. LIVE THEME-MATCHED ARTICLE PREVIEW */}
        {(paneMode === 'preview' || paneMode === 'split') && (
          <div
            className={`${
              paneMode === 'split'
                ? 'lg:col-span-6'
                : 'lg:col-span-12 max-w-[820px] mx-auto w-full'
            } flex flex-col`}
          >
            <div
              style={{
                borderColor: palette.border,
                backgroundColor: palette.canvas,
              }}
              className="flex-1 rounded-2xl border p-5 sm:p-8 overflow-y-auto"
            >
              <div
                style={{ color: palette.textMuted, fontFamily: fonts.mono }}
                className="text-xs tabular-nums mb-3 flex flex-wrap items-center gap-2"
              >
                <span style={{ color: palette.link }} className="font-semibold uppercase">
                  {category || COLLECTION_LABELS[collection].label}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatDisplayDate(date)}</span>
                <span aria-hidden="true">·</span>
                <span>~{stats.minutes} phút đọc</span>
              </div>

              <h1
                style={{ fontFamily: fonts.display, color: palette.textPrimary }}
                className="text-2xl sm:text-4xl font-bold tracking-tight leading-[1.15] text-balance mb-4"
              >
                {title || 'Tiêu đề sẽ hiển thị ở đây'}
              </h1>

              {excerpt && (
                <p style={{ color: palette.textSecondary }} className="text-base leading-relaxed mb-6">
                  {excerpt}
                </p>
              )}

              {cover && (
                <div className="mb-6 overflow-hidden rounded-xl">
                  <ResilientImage
                    src={coverPreviewPrimary}
                    fallbackSrc={coverPreviewFallback}
                    alt={title || coverLabel}
                    fallbackTitle={title || coverLabel}
                    isDark={isDark}
                    className="w-full max-h-[300px] object-cover rounded-xl"
                  />
                </div>
              )}

              <div
                style={
                  {
                    color: palette.textSecondary,
                    '--prose-border': palette.border,
                    '--prose-surface': palette.surface,
                    '--prose-code-bg': palette.surface,
                    '--prose-link': palette.link,
                  } as React.CSSProperties
                }
                className={`blog-prose ${isDark ? 'tracking-[0.01em]' : ''}`}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Publish to GitHub Modal (Bottom Sheet on Mobile, Centered Dialog on Desktop) */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4">
          <div
            style={{
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="sm:hidden w-10 h-1.5 rounded-full bg-zinc-400/40 mx-auto -mt-1 mb-1" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 style={{ fontFamily: fonts.display }} className="text-xl font-bold">
                  Đăng {COLLECTION_LABELS[collection].label.toLowerCase()} lên GitHub
                </h2>
                <p style={{ color: palette.textMuted }} className="text-xs mt-1">
                  Commit vào{' '}
                  {config.githubOwner && config.githubRepo
                    ? `${config.githubOwner}/${config.githubRepo}`
                    : 'kho GitHub chưa chọn'}{' '}
                  và tự động build Astro Pages
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                aria-label="Đóng"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!authStatus?.authenticated && (
              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                }}
                className="p-4 rounded-xl border text-sm space-y-2"
              >
                <div className="font-semibold">Chưa có quyền ghi vào GitHub Repository</div>
                <p style={{ color: palette.textSecondary }} className="text-xs leading-relaxed">
                  Vui lòng nhập GitHub Personal Access Token (PAT) hoặc kết nối GitHub OAuth trong tab{' '}
                  <strong>GitHub &amp; App</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowPublishModal(false);
                    onOpenGitHubTab();
                  }}
                  style={{ color: palette.link }}
                  className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4 cursor-pointer min-h-[36px]"
                >
                  Đi tới thiết lập kết nối GitHub <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div
                style={{
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                  fontFamily: fonts.mono,
                }}
                className="p-3.5 rounded-xl border text-xs space-y-1.5"
              >
                <div className="flex justify-between gap-4">
                  <span style={{ color: palette.textMuted }}>Trang con:</span>
                  <span>{COLLECTION_LABELS[collection].label}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: palette.textMuted }}>Đường dẫn tệp:</span>
                  <span className="truncate">{computedPath}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span style={{ color: palette.textMuted }}>Thao tác:</span>
                  <span>{existingSha ? 'Cập nhật nội dung (SHA)' : 'Tạo tệp mới'}</span>
                </div>
              </div>

              {!existingPath && repoStructure?.framework !== 'astro-vn' && (
                <div>
                  <label style={{ color: palette.textMuted }} className="block text-xs font-medium mb-1.5">
                    Thư mục lưu bài viết ({repoStructure?.frameworkLabel || 'Tự nhận diện'})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { id: '_posts', title: '_posts/', sub: 'Chuẩn Jekyll' },
                        { id: 'content/posts', title: 'content/posts/', sub: 'Chuẩn Hugo' },
                        { id: 'source/_posts', title: 'source/_posts/', sub: 'Chuẩn Hexo' },
                        { id: 'src/content/blog', title: 'src/content/blog/', sub: 'Chuẩn Astro' },
                        { id: 'posts', title: 'posts/', sub: 'Markdown tĩnh' },
                      ] as const
                    ).map((dir) => (
                      <button
                        key={dir.id}
                        type="button"
                        onClick={() => setDirectoryMode(dir.id)}
                        style={{
                          borderColor: directoryMode === dir.id ? palette.accent : palette.border,
                          backgroundColor:
                            directoryMode === dir.id ? palette.surface : 'transparent',
                        }}
                        className="px-3 py-2 min-h-[44px] text-xs font-medium rounded-xl border text-left cursor-pointer"
                      >
                        <div className="truncate">{dir.title}</div>
                        <div style={{ color: palette.textMuted }} className="text-[11px] truncate">
                          {dir.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="commit-msg-input"
                  style={{ color: palette.textMuted }}
                  className="block text-xs font-medium mb-1"
                >
                  Thông điệp Commit
                </label>
                <input
                  id="commit-msg-input"
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  style={{
                    backgroundColor: palette.canvas,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                  className="w-full px-3.5 min-h-[44px] text-sm rounded-xl border"
                />
              </div>

              {/* Publish Mode: Now vs Scheduled */}
              <div
                style={{ borderColor: palette.border, backgroundColor: palette.surface }}
                className="p-3.5 rounded-xl border space-y-3"
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" style={{ color: palette.accent }} />
                  Thời điểm xuất bản
                </div>

                <div
                  style={{ borderColor: palette.border, backgroundColor: palette.canvas }}
                  className="grid grid-cols-2 p-1 rounded-xl border gap-1"
                >
                  <button
                    type="button"
                    onClick={() => setPublishMode('now')}
                    style={{
                      backgroundColor: publishMode === 'now' ? palette.accent : 'transparent',
                      color: publishMode === 'now' ? palette.accentText : palette.textSecondary,
                    }}
                    className="min-h-[40px] px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Đăng ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishMode('schedule')}
                    style={{
                      backgroundColor: publishMode === 'schedule' ? palette.accent : 'transparent',
                      color:
                        publishMode === 'schedule' ? palette.accentText : palette.textSecondary,
                    }}
                    className="min-h-[40px] px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Lên lịch đăng
                  </button>
                </div>

                {publishMode === 'schedule' && (
                  <div className="space-y-2 pt-1">
                    <label
                      htmlFor="schedule-publish-at"
                      style={{ color: palette.textMuted }}
                      className="block text-xs font-medium"
                    >
                      Chọn ngày giờ tự động đăng lên GitHub
                    </label>
                    <input
                      id="schedule-publish-at"
                      type="datetime-local"
                      value={scheduledAtInput}
                      onChange={(e) => setScheduledAtInput(e.target.value)}
                      style={{
                        backgroundColor: palette.canvas,
                        borderColor: palette.border,
                        color: palette.textPrimary,
                        fontFamily: fonts.mono,
                      }}
                      className="w-full px-3 min-h-[44px] text-xs rounded-xl border tabular-nums"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '+1 giờ', getVal: () => getPresetDatetimeInput(1) },
                        { label: '08:00 ngày mai', getVal: () => getPresetDatetimeInput(24, 8) },
                        { label: '20:00 tối nay', getVal: () => getPresetDatetimeInput(0, 20) },
                        { label: '+3 ngày', getVal: () => getPresetDatetimeInput(24 * 3, 9) },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setScheduledAtInput(preset.getVal())}
                          style={{
                            borderColor: palette.border,
                            color: palette.textSecondary,
                          }}
                          className="px-2.5 min-h-[32px] text-[11px] font-medium rounded-lg border hover:opacity-80 cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ color: palette.textMuted }} className="text-[11px] leading-relaxed">
                      Bài viết được lưu vào hàng đợi và tự động commit đúng giờ (hỗ trợ đồng bộ GitHub Actions Cron 24/7 trong tab GitHub &amp; App).
                    </p>
                  </div>
                )}

                {/* Optional Auto-Delete Expiration */}
                <div
                  style={{ borderColor: palette.border }}
                  className="pt-2.5 border-t space-y-2.5"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={enableAutoDelete}
                      onChange={(e) => setEnableAutoDelete(e.target.checked)}
                      className="w-4 h-4 accent-current rounded"
                    />
                    <span className="text-xs font-medium">
                      Tự động xoá bài sau thời điểm (Hẹn ngày hết hạn)
                    </span>
                  </label>

                  {enableAutoDelete && (
                    <div className="space-y-2 pl-1">
                      <input
                        aria-label="Thời gian tự động xoá bài"
                        type="datetime-local"
                        value={autoDeleteAtInput}
                        onChange={(e) => setAutoDeleteAtInput(e.target.value)}
                        style={{
                          backgroundColor: palette.canvas,
                          borderColor: palette.border,
                          color: palette.textPrimary,
                          fontFamily: fonts.mono,
                        }}
                        className="w-full px-3 min-h-[44px] text-xs rounded-xl border tabular-nums"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '+24 giờ', hours: 24 },
                          { label: '+3 ngày', hours: 24 * 3 },
                          { label: '+7 ngày', hours: 24 * 7 },
                          { label: '+30 ngày', hours: 24 * 30 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              const baseMs =
                                publishMode === 'schedule' && scheduledAtInput
                                  ? Math.max(Date.now(), Date.parse(scheduledAtInput) || Date.now())
                                  : Date.now();
                              setAutoDeleteAtInput(
                                toLocalDatetimeInput(new Date(baseMs + preset.hours * 3600000))
                              );
                            }}
                            style={{
                              borderColor: palette.border,
                              color: palette.textSecondary,
                            }}
                            className="px-2.5 min-h-[32px] text-[11px] font-medium rounded-lg border hover:opacity-80 cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Publish-Time Social Sharing Checklist */}
              {publishMode === 'now' && !draft && (
                <SocialSharePanel
                  mode="publish-checklist"
                  theme={theme}
                  uid={uid}
                  postTitle={title}
                  postExcerpt={excerpt}
                  postUrl={postPublicUrl}
                  postCover={coverPreviewPrimary || cover}
                  caption={socialCaption}
                  onChangeCaption={(val) => {
                    setSocialCaption(val);
                    setSocialCaptionEdited(true);
                  }}
                  selectedPlatforms={selectedSocialPlatforms}
                  onChangeSelectedPlatforms={setSelectedSocialPlatforms}
                />
              )}
            </div>

            {(validationIssues.errors.length > 0 || validationIssues.warnings.length > 0) && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs space-y-1 text-amber-800 dark:text-amber-200">
                {validationIssues.errors.map((err) => (
                  <div key={err} className="text-red-600 dark:text-red-400 font-medium">
                    • {err}
                  </div>
                ))}
                {validationIssues.warnings.map((warn) => (
                  <div key={warn}>• {warn}</div>
                ))}
              </div>
            )}

            {publishError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                {publishError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                style={{
                  borderColor: palette.border,
                  color: palette.textSecondary,
                }}
                className="px-4 min-h-[44px] text-sm font-medium rounded-xl border cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handlePublishToGitHub}
                disabled={isPublishing || (publishMode === 'now' && !authStatus?.authenticated)}
                style={{
                  backgroundColor: palette.accent,
                  color: palette.accentText,
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 min-h-[44px] text-sm font-semibold rounded-xl cursor-pointer disabled:opacity-45"
              >
                {publishMode === 'schedule' ? (
                  <CalendarClock className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isPublishing
                  ? publishMode === 'schedule'
                    ? 'Đang lưu lịch trình...'
                    : 'Đang commit lên GitHub...'
                  : publishMode === 'schedule'
                  ? 'Xác nhận lên lịch đăng'
                  : 'Xác nhận đăng bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Image Upload & Compression Studio */}
      <ImageBatchModal
        isOpen={showBatchModal}
        initialFiles={batchDropFiles}
        theme={theme}
        config={config}
        repoStructure={repoStructure}
        isAstroRepo={isAstroRepo}
        authenticated={Boolean(authStatus?.authenticated)}
        onClose={() => {
          setShowBatchModal(false);
          setBatchDropFiles([]);
        }}
        onUploadedAndInsert={handleBatchUploaded}
      />

      {/* Repository Media Library Browser */}
      <MediaLibraryModal
        isOpen={showMediaLibraryModal}
        onClose={() => setShowMediaLibraryModal(false)}
        owner={config.githubOwner}
        repo={config.githubRepo}
        branch={defaultBranch}
        isDark={isDark}
        onInsertMarkdown={(snippet) => insertSnippet(`\n${snippet}\n`, '', '')}
        onSelectCover={(publicPath) => setCover(publicPath)}
      />

      {/* Mobile Obsidian Accessory Toolbar (Docked flush above soft keyboard via visualViewport) */}
      <ObsidianMobileToolbar
        theme={theme}
        visible={paneMode === 'write' || paneMode === 'split'}
        editorFocused={editorFocused}
        canUndo={historyMeta.canUndo}
        canRedo={historyMeta.canRedo}
        activeFormats={activeFormats}
        isUploadingImage={isUploadingBodyImage}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCycleHeading={() => applyFormatEdit((t, s, en) => cycleHeadingPrefix(t, s, en))}
        onToggleBold={() => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '**'))}
        onToggleItalic={() => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '*'))}
        onToggleStrike={() => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '~~'))}
        onToggleCode={() => applyFormatEdit((t, s, en) => toggleInlineFormat(t, s, en, '`'))}
        onToggleBullet={() => applyFormatEdit((t, s, en) => toggleLinePrefix(t, s, en, 'bullet'))}
        onToggleOrdered={() => applyFormatEdit((t, s, en) => toggleLinePrefix(t, s, en, 'ordered'))}
        onToggleCheckbox={() => applyFormatEdit((t, s, en) => toggleCheckboxPrefix(t, s, en))}
        onToggleQuote={() => applyFormatEdit((t, s, en) => toggleLinePrefix(t, s, en, 'quote'))}
        onOutdent={() => applyFormatEdit((t, s, en) => indentSelection(t, s, en, -1))}
        onIndent={() => applyFormatEdit((t, s, en) => indentSelection(t, s, en, 1))}
        onInsertLink={() => applyFormatEdit((t, s, en) => insertSmartLink(t, s, en))}
        onInsertCodeBlock={() =>
          applyFormatEdit((t, s, en) => insertBlockElement(t, s, en, 'codeblock'))
        }
        onInsertTable={() => applyFormatEdit((t, s, en) => insertBlockElement(t, s, en, 'table'))}
        onInsertHr={() => applyFormatEdit((t, s, en) => insertBlockElement(t, s, en, 'hr'))}
        onPickImage={() => bodyImageInputRef.current?.click()}
        onPickBatchImages={() => {
          setBatchDropFiles([]);
          setShowBatchModal(true);
        }}
        onDismissKeyboard={handleDismissKeyboard}
      />
    </div>
  );
}
