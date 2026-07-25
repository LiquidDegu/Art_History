// In-memory only — no persistence here on purpose. authClient.ts owns
// reading/writing the durable copy (expo-secure-store); this module just
// holds the current token where sync/pocketbaseClient.ts can read it
// without importing authClient.ts (which itself imports pocketbaseClient
// for its HTTP calls — this file breaks that cycle).
export interface Session {
  token: string;
  userId: string;
  email: string;
}

let current: Session | null = null;

export function getSession(): Session | null {
  return current;
}

export function setSession(session: Session): void {
  current = session;
}

export function clearSession(): void {
  current = null;
}
