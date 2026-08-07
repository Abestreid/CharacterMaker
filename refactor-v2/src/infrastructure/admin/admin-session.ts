import { callAdminApi } from './admin-api';

const SESSION_KEY = 'charmaker.admin.token';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  const normalized = token.trim();
  if (!normalized) throw new Error('Служебный ключ редактирования не может быть пустым.');
  window.sessionStorage.setItem(SESSION_KEY, normalized);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
}

export async function validateAdminToken(token: string): Promise<boolean> {
  try {
    const response = await callAdminApi<never>(token.trim(), 'validate');
    return response.valid === true;
  } catch {
    return false;
  }
}

export function requireAdminToken(): string {
  const token = getAdminToken();
  if (!token) throw new Error('Для сохранения изменений нужен служебный ключ редактирования.');
  return token;
}
