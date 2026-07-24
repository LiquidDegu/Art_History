// Thin REST wrapper around the PocketBase collections created in
// backend/pocketbase/pb_migrations/ (player / player_progress / events /
// the built-in users auth collection). No PocketBase SDK dependency — the
// REST surface used here (create, update, list, password auth) is small
// enough that a hand-rolled fetch wrapper is less surface area than
// pulling in the `pocketbase` npm package for it.
import { getSession } from '../auth/session';
import { POCKETBASE_URL } from './config';

const REQUEST_TIMEOUT_MS = 8000;

interface PbFieldError {
  code: string;
  message: string;
}

interface PbErrorBody {
  message?: string;
  data?: Record<string, PbFieldError>;
}

export class PocketBaseRequestError extends Error {
  status: number;
  body: PbErrorBody | null;

  constructor(status: number, body: PbErrorBody | null) {
    super(body?.message ?? `PocketBase request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const session = getSession();
    if (session) headers.Authorization = session.token;

    const res = await fetch(`${POCKETBASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new PocketBaseRequestError(res.status, json);
    }
    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function createRecord<T>(collection: string, body: unknown): Promise<T> {
  return request<T>('POST', `/api/collections/${collection}/records`, body);
}

export function updateRecord<T>(collection: string, id: string, body: unknown): Promise<T> {
  return request<T>('PATCH', `/api/collections/${collection}/records/${id}`, body);
}

export function listRecords<T>(collection: string, filter: string): Promise<{ items: T[]; totalItems: number }> {
  return request('GET', `/api/collections/${collection}/records?filter=${encodeURIComponent(filter)}&perPage=200`);
}

export function viewRecord<T>(collection: string, id: string): Promise<T> {
  return request<T>('GET', `/api/collections/${collection}/records/${id}`);
}

export function authWithPassword<T>(collection: string, identity: string, password: string): Promise<T> {
  return request<T>('POST', `/api/collections/${collection}/auth-with-password`, { identity, password });
}

export function authRefresh<T>(collection: string): Promise<T> {
  return request<T>('POST', `/api/collections/${collection}/auth-refresh`);
}

/** True if `err` is a PocketBase validation error on `field` with `code` (e.g. "validation_not_unique"). */
export function hasFieldError(err: unknown, field: string, code: string): boolean {
  return err instanceof PocketBaseRequestError && err.body?.data?.[field]?.code === code;
}
