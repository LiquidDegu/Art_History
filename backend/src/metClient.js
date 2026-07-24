import { MET_API_BASE } from "./config.js";

async function getJson(path) {
  const res = await fetch(`${MET_API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Met API request failed (${res.status}): ${path}`);
  }
  return res.json();
}

export async function listObjectIdsByDepartment(departmentId) {
  const data = await getJson(`/objects?departmentIds=${departmentId}`);
  return data.objectIDs || [];
}

export async function getObject(objectId) {
  return getJson(`/objects/${objectId}`);
}

export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function runNext() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
}
