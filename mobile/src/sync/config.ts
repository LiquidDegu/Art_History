// EXPO_PUBLIC_-prefixed env vars are inlined into the app bundle at build
// time by Expo — no extra config plumbing needed. Falls back to the
// Docker Compose default (backend/pocketbase/docker-compose.yml publishes
// :8090) for local dev against a same-machine server.
export const POCKETBASE_URL = process.env.EXPO_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';
