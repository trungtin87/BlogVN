import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { sanitizeThemeCustomColors } from '../data/themes';
import type { BlogConfig, BlogPost } from '../types/blog';

const SITE_CONFIG_DOC_ID = 'site';

const cachedConfigCreatedAt = new Map<string, Timestamp>();
const cachedDraftCreatedAt = new Map<string, Timestamp>();
const configWriteQueues = new Map<string, Promise<void>>();

function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.length > maxLen ? val.slice(0, maxLen) : val;
}

function sanitizeDraftId(rawId: string): string {
  const cleaned = String(rawId || '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 150);
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return `draft-${Date.now()}`;
  }
  return cleaned;
}

const ALLOWED_ANALYTICS_PROVIDERS = new Set(['none', 'ga4', 'cloudflare', 'plausible', 'umami']);
const ALLOWED_COLLECTIONS = new Set(['bai_viet', 'du_an', 'sach', 'cua_hang']);

function buildUserConfigPayload(config: BlogConfig, userId: string, existingCreatedAt?: unknown) {
  const analyticsProvider = ALLOWED_ANALYTICS_PROVIDERS.has(config.analyticsProvider || '')
    ? config.analyticsProvider
    : 'none';
  const payload: Record<string, unknown> = {
    uid: userId,
    siteTitle: clampString(config.siteTitle || 'Đạo Ký', 160),
    tagline: clampString(config.tagline || '', 400),
    headerTitle: clampString(config.headerTitle || '', 120),
    footerText: clampString(config.footerText || '', 300),
    authorName: clampString(config.authorName || '', 120),
    authorBio: clampString(config.authorBio || '', 600),
    authorAvatar: config.authorAvatar && config.authorAvatar.length <= 2000 ? config.authorAvatar : '',
    githubOwner: clampString(config.githubOwner || '', 100),
    githubRepo: clampString(config.githubRepo || '', 120),
    pagesUrl: clampString(config.pagesUrl || '', 300),
    themeMode: config.themeMode === 'dark' ? 'dark' : 'light',
    postsDirectory: clampString(config.postsDirectory || 'src/content/bai_viet', 120),
    astroTemplate: clampString(config.astroTemplate || 'newyorker-light', 60),
    customDomain: clampString(config.customDomain || '', 255),
    analyticsProvider,
    analyticsId: clampString(config.analyticsId || '', 120),
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const cleanThemeColors = sanitizeThemeCustomColors(config.themeColors);
  if (cleanThemeColors) {
    payload.themeColors = cleanThemeColors;
  }

  if (config.siteIcon && config.siteIcon.length <= 250000) {
    payload.siteIcon = config.siteIcon;
  }

  if (Array.isArray(config.headerNavLinks)) {
    payload.headerNavLinks = config.headerNavLinks.slice(0, 20).map((item) => ({
      label: clampString(item.label, 80),
      url: clampString(item.url, 300),
    }));
  }

  if (Array.isArray(config.footerLinks)) {
    payload.footerLinks = config.footerLinks.slice(0, 20).map((item) => ({
      label: clampString(item.label, 80),
      url: clampString(item.url, 300),
    }));
  }

  if (config.liveChat) {
    payload.liveChat = {
      enabled: Boolean(config.liveChat.enabled),
      title: clampString(config.liveChat.title || '', 120),
      welcomeText: clampString(config.liveChat.welcomeText || '', 300),
      channels: (config.liveChat.channels || []).slice(0, 10).map((ch) => ({
        id: ch.id,
        enabled: Boolean(ch.enabled),
        value: clampString(ch.value || '', 240),
        label: clampString(ch.label || '', 80),
      })),
    };
  }

  if (config.giscus) {
    payload.giscus = {
      enabled: Boolean(config.giscus.enabled),
      repo: clampString(config.giscus.repo || '', 160),
      repoId: clampString(config.giscus.repoId || '', 120),
      category: clampString(config.giscus.category || '', 120),
      categoryId: clampString(config.giscus.categoryId || '', 120),
    };
  }

  return payload;
}

function buildUserDraftPayload(post: BlogPost, userId: string, existingCreatedAt?: unknown) {
  const safeId = sanitizeDraftId(post.id);
  const resolvedCollection = ALLOWED_COLLECTIONS.has(post.collection || '')
    ? post.collection
    : 'bai_viet';
  const payload: Record<string, unknown> = {
    id: safeId,
    uid: userId,
    collection: resolvedCollection,
    slug: clampString(post.slug || safeId, 160),
    title: clampString(post.title || 'Bản nháp chưa đặt tên', 240),
    date: clampString(post.date || new Date().toISOString().slice(0, 10), 30),
    category: clampString(post.category || 'Chung', 120),
    tags: Array.isArray(post.tags)
      ? post.tags.slice(0, 25).map((t) => clampString(String(t), 60))
      : [],
    excerpt: clampString(post.excerpt || '', 600),
    draft: Boolean(post.draft),
    markdownBody: clampString(post.markdownBody || '', 400000),
    rawContent: clampString(post.rawContent || post.markdownBody || '', 450000),
    path: clampString(post.path || `src/content/${post.collection || 'bai_viet'}/${post.slug || safeId}.md`, 260),
    source: post.source === 'github' || post.source === 'sample' ? post.source : 'local',
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (post.cover && post.cover.length <= 2000) payload.cover = post.cover;
  if (post.sha) payload.sha = clampString(post.sha, 120);
  if (post.seoTitle) payload.seoTitle = clampString(post.seoTitle, 200);
  if (post.seoDescription) payload.seoDescription = clampString(post.seoDescription, 400);
  if (post.canonicalUrl) payload.canonicalUrl = clampString(post.canonicalUrl, 400);
  if (typeof post.noindex === 'boolean') payload.noindex = post.noindex;
  if (post.authorName) payload.authorName = clampString(post.authorName, 120);
  if (post.price) payload.price = clampString(post.price, 60);
  if (post.originalPrice) payload.originalPrice = clampString(post.originalPrice, 60);
  if (typeof post.inStock === 'boolean') payload.inStock = post.inStock;
  if (post.linkDemo) payload.linkDemo = clampString(post.linkDemo, 400);
  if (post.linkGithub) payload.linkGithub = clampString(post.linkGithub, 400);
  if (post.linkBuy) payload.linkBuy = clampString(post.linkBuy, 400);
  if (Array.isArray(post.formats)) {
    payload.formats = post.formats.slice(0, 10).map((f) => clampString(String(f), 40));
  }
  if (typeof post.publishYear === 'number' && !Number.isNaN(post.publishYear)) {
    payload.publishYear = post.publishYear;
  }
  if (typeof post.featured === 'boolean') payload.featured = post.featured;

  return payload;
}

function docToBlogPost(data: Record<string, any>): BlogPost {
  let updatedIso = new Date().toISOString();
  if (data.updatedAt instanceof Timestamp) {
    updatedIso = data.updatedAt.toDate().toISOString();
  } else if (typeof data.updatedAt === 'string') {
    updatedIso = data.updatedAt;
  }

  return {
    id: String(data.id || ''),
    collection: data.collection || 'bai_viet',
    slug: String(data.slug || ''),
    title: String(data.title || ''),
    date: String(data.date || ''),
    category: String(data.category || 'Chung'),
    tags: Array.isArray(data.tags) ? data.tags : [],
    excerpt: String(data.excerpt || ''),
    cover: typeof data.cover === 'string' ? data.cover : undefined,
    draft: Boolean(data.draft),
    markdownBody: String(data.markdownBody || ''),
    rawContent: String(data.rawContent || ''),
    path: String(data.path || ''),
    sha: typeof data.sha === 'string' ? data.sha : undefined,
    source: data.source || 'local',
    updatedAt: updatedIso,
    seoTitle: typeof data.seoTitle === 'string' ? data.seoTitle : undefined,
    seoDescription: typeof data.seoDescription === 'string' ? data.seoDescription : undefined,
    canonicalUrl: typeof data.canonicalUrl === 'string' ? data.canonicalUrl : undefined,
    noindex: typeof data.noindex === 'boolean' ? data.noindex : undefined,
    authorName: typeof data.authorName === 'string' ? data.authorName : undefined,
    price: typeof data.price === 'string' ? data.price : undefined,
    originalPrice: typeof data.originalPrice === 'string' ? data.originalPrice : undefined,
    inStock: typeof data.inStock === 'boolean' ? data.inStock : undefined,
    linkDemo: typeof data.linkDemo === 'string' ? data.linkDemo : undefined,
    linkGithub: typeof data.linkGithub === 'string' ? data.linkGithub : undefined,
    linkBuy: typeof data.linkBuy === 'string' ? data.linkBuy : undefined,
    formats: Array.isArray(data.formats) ? data.formats : undefined,
    publishYear: typeof data.publishYear === 'number' ? data.publishYear : undefined,
    featured: typeof data.featured === 'boolean' ? data.featured : undefined,
  };
}

export interface FirestoreSnapshotMeta {
  hasPendingWrites: boolean;
  fromCache: boolean;
}

export function subscribeUserConfig(
  userId: string,
  onData: (config: Partial<BlogConfig> | null, meta: FirestoreSnapshotMeta) => void,
): Unsubscribe {
  const path = `users/${userId}/config/${SITE_CONFIG_DOC_ID}`;
  const ref = doc(db, 'users', userId, 'config', SITE_CONFIG_DOC_ID);
  return onSnapshot(
    ref,
    (snapshot) => {
      const meta: FirestoreSnapshotMeta = {
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
        fromCache: snapshot.metadata.fromCache,
      };
      if (!snapshot.exists()) {
        onData(null, meta);
        return;
      }
      const data = snapshot.data();
      if (data.createdAt instanceof Timestamp) {
        cachedConfigCreatedAt.set(userId, data.createdAt);
      }
      const partial: Partial<BlogConfig> = {
        siteTitle: data.siteTitle,
        tagline: data.tagline,
        siteIcon: data.siteIcon,
        headerTitle: data.headerTitle,
        headerNavLinks: Array.isArray(data.headerNavLinks) ? data.headerNavLinks : undefined,
        footerText: data.footerText,
        footerLinks: Array.isArray(data.footerLinks) ? data.footerLinks : undefined,
        authorName: data.authorName,
        authorBio: data.authorBio,
        authorAvatar: data.authorAvatar,
        githubOwner: data.githubOwner,
        githubRepo: data.githubRepo,
        pagesUrl: data.pagesUrl,
        themeMode: data.themeMode === 'dark' ? 'dark' : 'light',
        postsDirectory: data.postsDirectory,
        astroTemplate: data.astroTemplate,
        themeColors: sanitizeThemeCustomColors(data.themeColors),
        liveChat: data.liveChat,
        customDomain: data.customDomain,
        analyticsProvider: data.analyticsProvider,
        analyticsId: data.analyticsId,
        giscus: data.giscus,
      };
      onData(partial, meta);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    },
  );
}

export async function saveUserConfigToFirestore(userId: string, config: BlogConfig): Promise<void> {
  const previous = configWriteQueues.get(userId) || Promise.resolve();
  const runWrite = previous
    .catch(() => {})
    .then(async () => {
      const path = `users/${userId}/config/${SITE_CONFIG_DOC_ID}`;
      const ref = doc(db, 'users', userId, 'config', SITE_CONFIG_DOC_ID);
      try {
        let existingCreatedAt: Timestamp | undefined = cachedConfigCreatedAt.get(userId);
        if (!(existingCreatedAt instanceof Timestamp)) {
          try {
            const serverSnap = await getDocFromServer(ref);
            const serverCreatedAt = serverSnap.exists() ? serverSnap.data()?.createdAt : undefined;
            if (serverCreatedAt instanceof Timestamp) {
              existingCreatedAt = serverCreatedAt;
              cachedConfigCreatedAt.set(userId, serverCreatedAt);
            }
          } catch {
            const existing = await getDoc(ref);
            const candidate = existing.exists() ? existing.data()?.createdAt : undefined;
            if (candidate instanceof Timestamp) {
              existingCreatedAt = candidate;
              cachedConfigCreatedAt.set(userId, candidate);
            }
          }
        }
        const payload = buildUserConfigPayload(config, userId, existingCreatedAt);
        await setDoc(ref, payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    });

  configWriteQueues.set(userId, runWrite);
  return runWrite;
}

export function subscribeUserDrafts(
  userId: string,
  onData: (drafts: BlogPost[]) => void,
): Unsubscribe {
  const colPath = `users/${userId}/drafts`;
  const authUid = auth.currentUser?.uid || userId;
  const q = query(collection(db, 'users', userId, 'drafts'), where('uid', '==', authUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => {
          const raw = d.data();
          const post = docToBlogPost(raw);
          if (raw.createdAt instanceof Timestamp && post.id) {
            cachedDraftCreatedAt.set(`users/${userId}/drafts/${sanitizeDraftId(post.id)}`, raw.createdAt);
          }
          return post;
        })
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    },
  );
}

export async function upsertUserDraftToFirestore(userId: string, post: BlogPost): Promise<void> {
  const safeId = sanitizeDraftId(post.id);
  const path = `users/${userId}/drafts/${safeId}`;
  const ref = doc(db, 'users', userId, 'drafts', safeId);
  try {
    let existingCreatedAt: Timestamp | undefined = cachedDraftCreatedAt.get(path);
    if (!(existingCreatedAt instanceof Timestamp)) {
      try {
        const serverSnap = await getDocFromServer(ref);
        const serverCreatedAt = serverSnap.exists() ? serverSnap.data()?.createdAt : undefined;
        if (serverCreatedAt instanceof Timestamp) {
          existingCreatedAt = serverCreatedAt;
          cachedDraftCreatedAt.set(path, serverCreatedAt);
        }
      } catch {
        const existing = await getDoc(ref);
        const candidate = existing.exists() ? existing.data()?.createdAt : undefined;
        if (candidate instanceof Timestamp) {
          existingCreatedAt = candidate;
          cachedDraftCreatedAt.set(path, candidate);
        }
      }
    }
    const payload = buildUserDraftPayload({ ...post, id: safeId }, userId, existingCreatedAt);
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserDraftFromFirestore(userId: string, draftId: string): Promise<void> {
  const safeId = sanitizeDraftId(draftId);
  const path = `users/${userId}/drafts/${safeId}`;
  const ref = doc(db, 'users', userId, 'drafts', safeId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchSeedUserDraftsToFirestore(
  userId: string,
  drafts: BlogPost[],
): Promise<void> {
  if (drafts.length === 0) return;
  const colPath = `users/${userId}/drafts`;
  try {
    const chunk = drafts.slice(0, 25);
    const batch = writeBatch(db);
    for (const post of chunk) {
      const safeId = sanitizeDraftId(post.id);
      const cacheKey = `users/${userId}/drafts/${safeId}`;
      const ref = doc(db, 'users', userId, 'drafts', safeId);
      let existingCreatedAt: Timestamp | undefined = cachedDraftCreatedAt.get(cacheKey);
      if (!(existingCreatedAt instanceof Timestamp)) {
        try {
          const serverSnap = await getDocFromServer(ref);
          const serverCreatedAt = serverSnap.exists() ? serverSnap.data()?.createdAt : undefined;
          if (serverCreatedAt instanceof Timestamp) {
            existingCreatedAt = serverCreatedAt;
            cachedDraftCreatedAt.set(cacheKey, serverCreatedAt);
          }
        } catch {
          const existing = await getDoc(ref);
          const candidate = existing.exists() ? existing.data()?.createdAt : undefined;
          if (candidate instanceof Timestamp) {
            existingCreatedAt = candidate;
            cachedDraftCreatedAt.set(cacheKey, candidate);
          }
        }
      }
      const payload = buildUserDraftPayload({ ...post, id: safeId }, userId, existingCreatedAt);
      batch.set(ref, payload);
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}
