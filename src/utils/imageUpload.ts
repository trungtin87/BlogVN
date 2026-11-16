export type ImageBatchFormat = 'webp' | 'jpeg' | 'original';

export interface ImageCompressOptions {
  maxWidth?: number;
  quality?: number;
  format?: ImageBatchFormat;
}

export interface PreparedImageFile {
  filename: string;
  base64Data: string;
  localDataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export interface UploadedImageResult {
  repoPath: string;
  publicPath: string;
  previewUrl: string;
  localDataUrl: string;
  originalFilename?: string;
}

function estimateBase64Bytes(dataUrl: string): number {
  const b64 = dataUrl.split(',')[1] || '';
  return Math.round((b64.length * 3) / 4);
}

export async function prepareImageForUpload(
  file: File,
  options: ImageCompressOptions = {}
): Promise<PreparedImageFile> {
  const { maxWidth = 1600, quality = 0.84, format = 'webp' } = options;
  const isSvgOrGif = file.type === 'image/svg+xml' || file.type === 'image/gif';

  if (isSvgOrGif || format === 'original' || (maxWidth === 1600 && format !== 'webp' && file.size < 350 * 1024)) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return {
      base64Data: dataUrl,
      filename: file.name || 'image.png',
      localDataUrl: dataUrl,
      originalSize: file.size,
      compressedSize: file.size,
      width: 0,
      height: 0,
    };
  }

  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imgUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (maxWidth > 0 && (width > maxWidth || height > maxWidth)) {
      if (width >= height) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      } else {
        width = Math.round((width * maxWidth) / height);
        height = maxWidth;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Không thể khởi tạo bộ xử lý ảnh.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    let outputMime =
      format === 'webp'
        ? 'image/webp'
        : file.type === 'image/png'
        ? 'image/png'
        : 'image/jpeg';

    let dataUrl = canvas.toDataURL(outputMime, outputMime === 'image/png' ? undefined : quality);
    // Fallback if browser doesn't support WebP canvas encoding
    if (outputMime === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
      outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      dataUrl = canvas.toDataURL(outputMime, outputMime === 'image/png' ? undefined : quality);
    }

    const ext = outputMime === 'image/webp' ? 'webp' : outputMime === 'image/png' ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    const compressedSize = estimateBase64Bytes(dataUrl);

    return {
      base64Data: dataUrl,
      filename: `${baseName}.${ext}`,
      localDataUrl: dataUrl,
      originalSize: file.size,
      compressedSize,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

import { ghUploadImagesBatch, ghUploadSingleImage } from './githubClient';

export async function uploadImageToGitHub(params: {
  file: File;
  owner: string;
  repo: string;
  branch?: string;
  isAstroRepo?: boolean;
  uploadDir?: string;
  publicUploadPrefix?: string;
}): Promise<UploadedImageResult> {
  const { base64Data, filename, localDataUrl } = await prepareImageForUpload(params.file, {
    maxWidth: 1600,
    quality: 0.84,
    format: 'webp',
  });

  const data = await ghUploadSingleImage({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch || 'main',
    filename,
    base64Data,
    isAstroRepo: Boolean(params.isAstroRepo),
    uploadDir: params.uploadDir,
    publicUploadPrefix: params.publicUploadPrefix,
  });

  return {
    repoPath: data.repoPath,
    publicPath: data.publicPath,
    previewUrl: data.previewUrl,
    localDataUrl,
  };
}

export async function uploadImagesBatchToGitHub(params: {
  items: Array<{ filename: string; base64Data: string; localDataUrl: string }>;
  owner: string;
  repo: string;
  branch?: string;
  isAstroRepo?: boolean;
  uploadDir?: string;
  publicUploadPrefix?: string;
  commitMessage?: string;
}): Promise<{ commitUrl?: string; results: UploadedImageResult[] }> {
  const data = await ghUploadImagesBatch({
    owner: params.owner,
    repo: params.repo,
    branch: params.branch || 'main',
    isAstroRepo: Boolean(params.isAstroRepo),
    uploadDir: params.uploadDir,
    publicUploadPrefix: params.publicUploadPrefix,
    commitMessage: params.commitMessage,
    images: params.items.map((item) => ({
      filename: item.filename,
      base64Data: item.base64Data,
    })),
  });

  const results: UploadedImageResult[] = (data.results || []).map((r, idx) => ({
    repoPath: r.repoPath,
    publicPath: r.publicPath,
    previewUrl: r.previewUrl,
    localDataUrl: params.items[idx]?.localDataUrl || r.previewUrl,
    originalFilename: params.items[idx]?.filename,
  }));

  return {
    commitUrl: data.commitUrl,
    results,
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function resolveGitHubAssetPreviewUrl(
  src: string,
  owner: string,
  repo: string,
  assetsPrefixOrIsAstro: string | boolean = 'public',
  branch = 'main'
): string {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;

  const pagesPrefix = repo.endsWith('.github.io')
    ? `https://${repo}`
    : `https://${owner}.github.io/${repo}`;

  let relativePath = src;
  if (src.startsWith(pagesPrefix)) {
    relativePath = src.slice(pagesPrefix.length);
  }

  if (relativePath.startsWith('/')) {
    const prefix =
      typeof assetsPrefixOrIsAstro === 'boolean'
        ? assetsPrefixOrIsAstro
          ? 'public'
          : ''
        : assetsPrefixOrIsAstro;
    const repoFile = prefix ? `${prefix}${relativePath}` : relativePath.slice(1);
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoFile}`;
  }

  return src;
}
