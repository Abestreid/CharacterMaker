export const CLOUDFLARE_ACCOUNT_ID = 'b42a877844f90e5af0c85866814e1ab4';
export const CLOUDFLARE_IMAGE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';

const API_URL = './api/cloudflare-ai.php';
let rememberedCloudflareToken = '';

export type CloudflareTokenStatus = {
  active: boolean;
  status: string;
  tokenId?: string;
  message?: string;
};

export type CloudflareGenerateInput = {
  token: string;
  prompt: string;
  width: number;
  height: number;
  references: File[];
  guidance?: number;
  seed?: number;
};

export type CloudflareGenerateResult = {
  imageBase64: string;
  mimeType: string;
  model: string;
  width: number;
  height: number;
};

export function rememberCloudflareToken(token: string): void {
  rememberedCloudflareToken = token.trim();
}

export function getRememberedCloudflareToken(): string {
  return rememberedCloudflareToken;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Cloudflare AI API вернул HTTP ${response.status}.`);
  }
  if (!payload) throw new Error('API вернул пустой ответ.');
  return payload;
}

export async function verifyCloudflareToken(token: string): Promise<CloudflareTokenStatus> {
  rememberCloudflareToken(token);
  const response = await fetch(`${API_URL}?action=verify`, {
    method: 'POST',
    headers: {
      'X-Cloudflare-Token': token,
    },
  });
  return readJson<CloudflareTokenStatus>(response);
}

export async function generateCloudflareImage(input: CloudflareGenerateInput): Promise<CloudflareGenerateResult> {
  rememberCloudflareToken(input.token);
  const body = new FormData();
  body.append('prompt', input.prompt);
  body.append('width', String(input.width));
  body.append('height', String(input.height));
  if (typeof input.guidance === 'number') body.append('guidance', String(input.guidance));
  if (typeof input.seed === 'number') body.append('seed', String(input.seed));
  input.references.slice(0, 4).forEach((file, index) => body.append(`input_image_${index}`, file, file.name));

  const response = await fetch(`${API_URL}?action=generate`, {
    method: 'POST',
    headers: {
      'X-Cloudflare-Token': input.token,
    },
    body,
  });
  return readJson<CloudflareGenerateResult>(response);
}

export async function prepareCloudflareReference(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name}: это не изображение.`);

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`${file.name}: изображение не удалось прочитать.`));
      element.src = sourceUrl;
    });

    const maxSide = 511;
    if (image.naturalWidth < 512 && image.naturalHeight < 512) return file;

    const scale = Math.min(maxSide / image.naturalWidth, maxSide / image.naturalHeight);
    const width = Math.max(1, Math.floor(image.naturalWidth * scale));
    const height = Math.max(1, Math.floor(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Браузер не поддерживает подготовку изображения.');
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Не удалось уменьшить референс.')), 'image/jpeg', 0.92);
    });
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'reference';
    return new File([blob], `${baseName}-cloudflare.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
