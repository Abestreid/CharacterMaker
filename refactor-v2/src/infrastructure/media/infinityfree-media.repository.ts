export type MediaScope = 'characters' | 'outfits' | 'scenes' | 'generations';

export type UploadedMedia = {
  objectPath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
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
  const body = new FormData();
  body.set('file', input.file);
  body.set('scope', input.scope);
  body.set('entity_id', input.entityId);
  body.set('role', input.role);

  const response = await fetch(`${mediaApiUrl()}?action=upload`, {
    method: 'POST',
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
    width: typeof payload.width === 'number' ? payload.width : null,
    height: typeof payload.height === 'number' ? payload.height : null,
  };
}

export async function deleteImageFromInfinityFree(objectPath: string): Promise<void> {
  const response = await fetch(`${mediaApiUrl()}?action=delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objectPath }),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Не удалось удалить изображение с InfinityFree.');
}
