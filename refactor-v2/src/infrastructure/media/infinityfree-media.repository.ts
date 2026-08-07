import { requireAdminToken } from '../admin/admin-session';

export type MediaScope = 'characters' | 'outfits' | 'scenes' | 'generations';

export type UploadedMedia = {
  objectPath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

function mediaApiUrl(): string {
  return 'api/media.php';
}

export async function uploadImageToInfinityFree(input: {
  file: File;
  scope: MediaScope;
  entityId: string;
  role: string;
}): Promise<UploadedMedia> {
  const token = requireAdminToken();
  const body = new FormData();
  body.set('file', input.file);
  body.set('scope', input.scope);
  body.set('entity_id', input.entityId);
  body.set('role', input.role);

  const response = await fetch(`${mediaApiUrl()}?action=upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const payload = (await response.json()) as Partial<UploadedMedia> & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Не удалось загрузить изображение на InfinityFree.');
  if (!payload.objectPath || !payload.publicUrl || !payload.fileName || !payload.mimeType || typeof payload.sizeBytes !== 'number') {
    throw new Error('InfinityFree вернул неполные метаданные файла.');
  }
  return {
    objectPath: payload.objectPath,
    publicUrl: payload.publicUrl,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
  };
}

export async function deleteImageFromInfinityFree(objectPath: string): Promise<void> {
  const token = requireAdminToken();
  const response = await fetch(`${mediaApiUrl()}?action=delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objectPath }),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Не удалось удалить изображение с InfinityFree.');
}
