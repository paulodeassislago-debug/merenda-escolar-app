// src/api.ts — cliente HTTP centralizado
// Base URL vem de frontend/.env (VITE_API_URL). Anexa o JWT do localStorage.

import { TOKEN_KEY } from './auth-context';

const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** fetch com o JWT anexado no header Authorization (quando houver token salvo). */
export async function fetchWithAuth(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

/** fetchWithAuth que já desserializa o JSON e lança ApiError com o detail do backend. */
export async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resposta = await fetchWithAuth(path, options);
  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiError(resposta.status, corpo?.detail ?? `Erro ${resposta.status} ao acessar ${path}`);
  }
  return (await resposta.json()) as T;
}

export { API_BASE_URL };
