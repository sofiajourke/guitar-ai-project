/**
 * Browser first, cloud second.
 *
 * Every save goes to the browser exactly as before, so practice never waits
 * for the network and works signed out. When a learner is signed in, a copy
 * goes to Supabase. Anything that could not be sent waits in a small queue
 * (localStorage) and is retried on start-up, on sign-in and when the browser
 * comes back online (FR-ST-03).
 */
import type { Storage } from "./Storage";
import { localStore } from "./localStore";
import { supabase } from "./supabaseClient";
import { deleteRemoteSession, downloadSessions, uploadSession } from "./cloudSessions";

const QUEUE_KEY = "guitar.syncQueue.v1";

interface Queue {
  uploads: string[];
  deletes: string[];
}

function loadQueue(): Queue {
  try {
    const data = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "{}");
    const ids = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);
    return { uploads: ids(data.uploads), deletes: ids(data.deletes) };
  } catch {
    return { uploads: [], deletes: [] };
  }
}

function saveQueue(queue: Queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or blocked: the next flush simply finds less to send.
  }
}

function queueUpload(id: string) {
  const queue = loadQueue();
  if (!queue.uploads.includes(id)) queue.uploads.push(id);
  queue.deletes = queue.deletes.filter((d) => d !== id);
  saveQueue(queue);
}

function queueDelete(id: string) {
  const queue = loadQueue();
  queue.uploads = queue.uploads.filter((u) => u !== id);
  if (!queue.deletes.includes(id)) queue.deletes.push(id);
  saveQueue(queue);
}

async function signedIn(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}

let flushing: Promise<void> | null = null;

/** Sends everything waiting in the queue. Safe to call often. */
export function flush(): Promise<void> {
  flushing ??= (async () => {
    try {
      if (!(await signedIn()) || !navigator.onLine) return;
      const queue = loadQueue();
      const local = await localStore.sessions.list(500);
      for (const id of [...queue.uploads]) {
        const record = local.find((r) => r.id === id);
        if (!record || (await uploadSession(record))) queue.uploads = queue.uploads.filter((u) => u !== id);
      }
      for (const id of [...queue.deletes]) {
        if (await deleteRemoteSession(id)) queue.deletes = queue.deletes.filter((d) => d !== id);
      }
      saveQueue(queue);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/**
 * After signing in: brings the learner's cloud sessions into this browser,
 * then sends every session this browser has that the cloud does not.
 * Returns how many sessions came down.
 */
export async function syncAll(): Promise<number> {
  if (!(await signedIn())) return 0;
  const remote = (await downloadSessions()) ?? [];
  const local = await localStore.sessions.list(500);
  const localIds = new Set(local.map((r) => r.id));
  const remoteIds = new Set(remote.map((r) => r.id));
  const pending = new Set(loadQueue().deletes);
  let added = 0;
  for (const record of remote) {
    if (!localIds.has(record.id) && !pending.has(record.id) && (await localStore.sessions.save(record))) added++;
  }
  for (const record of local) if (!remoteIds.has(record.id)) queueUpload(record.id);
  await flush();
  return added;
}

export const syncStore: Storage = {
  ...localStore,
  sessions: {
    list: (limit) => localStore.sessions.list(limit),
    async save(record) {
      const ok = await localStore.sessions.save(record);
      if (ok) {
        queueUpload(record.id);
        void flush();
      }
      return ok;
    },
    async remove(id) {
      const ok = await localStore.sessions.remove(id);
      if (ok) {
        queueDelete(id);
        void flush();
      }
      return ok;
    },
  },
};

if (typeof window !== "undefined") window.addEventListener("online", () => void flush());