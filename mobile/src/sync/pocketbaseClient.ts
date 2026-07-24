// Thin REST wrapper around the PocketBase collections created in
// backend/pocketbase/pb_migrations/ (player / player_progress / events).
// No PocketBase SDK dependency — the REST surface is tiny enough (create +
// update, on three collections) that a hand-rolled fetch wrapper is less
// surface area than pulling in `pocketbase` the npm package for it, and
// this is deliberately anonymous/unauthenticated (Step 5 adds auth) so
// there's no token/session handling to reuse from the SDK anyway.
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
    const res = await fetch(`${POCKETBASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
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

/** True if `err` is a PocketBase validation error on `field` with `code` (e.g. "validation_not_unique"). */
export function hasFieldError(err: unknown, field: string, code: string): boolean {
  return err instanceof PocketBaseRequestError && err.body?.data?.[field]?.code === code;
}
