import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../supabase/client';

export type AdminAction = 'validate' | 'upsert_preset' | 'delete_preset' | 'attach_asset' | 'delete_asset' | 'set_character_outfit';

type AdminResponse<T> = {
  data?: T;
  valid?: boolean;
  error?: string;
  code?: string;
};

export async function callAdminApi<T>(token: string, action: AdminAction, args: Record<string, unknown> = {}): Promise<AdminResponse<T>> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-presets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action, args }),
  });

  const payload = await response.json().catch(() => ({})) as AdminResponse<T>;
  if (!response.ok) throw new Error(payload.error ?? `Admin API error ${response.status}`);
  return payload;
}
