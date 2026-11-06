import { STORAGE_LOCK, type WriteCoordinator } from "./storage-transactions";
import { WORKSPACE_KEY } from "./workspace-storage";

// A tiny transactional revision fence catches stale per-renderer localStorage
// snapshots. Workspace records remain in localStorage, not in IndexedDB.
let database: Promise<IDBDatabase> | undefined;
let latestRevision = 0;
export const latestFenceRevision = () => latestRevision;
function openFence() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("skillforge-write-fence", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("revision");
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); database = undefined; }; resolve(request.result); };
    request.onerror = () => { database = undefined; reject(new Error("The local revision guard is unavailable. Saving is disabled to protect your records.")); };
    request.onblocked = () => { database = undefined; reject(new Error("Refresh all tabs to finish opening the local revision guard.")); };
  });
  return database;
}
function storedRevision(): number | null {
  const raw = localStorage.getItem(WORKSPACE_KEY);
  if (!raw) return null;
  try { const value = JSON.parse(raw); return value.schemaVersion === 2 && Number.isInteger(value.revision) ? value.revision : null; }
  catch { return null; }
}
export function assertFreshRevision(expected: number | null | undefined, observed: number | null) {
  if (expected !== undefined && expected !== observed) throw new Error("A stale browser storage snapshot was detected. No changes were written. Refresh all tabs and retry. If this persists, export recovery data and use reviewed JSON restore.");
}
async function fenced<T>(operation: () => T, recovery: boolean): Promise<T> {
  const db = await openFence();
  return new Promise<T>((resolve,reject) => {
    const transaction = db.transaction("revision", "readwrite");
    const store = transaction.objectStore("revision");
    let result: T; let failure: unknown;
    const read = store.get("head");
    read.onsuccess = () => {
      try {
        const expected = read.result as number | null | undefined;
        latestRevision = expected ?? 0;
        const observed = storedRevision();
        if (!recovery || observed !== null && expected !== undefined && expected !== null && observed < expected) assertFreshRevision(expected, observed);
        // No await between the fresh localStorage read and its write.
        result = operation();
        store.put(storedRevision(), "head");
      } catch (error) { failure = error; transaction.abort(); }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure || new Error("The revision guard failed. Export your data before reviewed recovery; no further writes will be attempted."));
    transaction.onerror = () => { failure ??= transaction.error; };
  });
}
export function coordinateBrowser(recovery = false): WriteCoordinator | undefined {
  return typeof navigator.locks?.request === "function" && typeof indexedDB !== "undefined"
    ? async operation => await navigator.locks.request(STORAGE_LOCK, async () => {
      for (let attempt = 0; ; attempt++) {
        try { return await fenced(operation, recovery); }
        catch (error) {
          if (attempt >= 2 || !(error instanceof Error) || !error.message.startsWith("A stale browser storage snapshot")) throw error;
          // Give renderer storage notifications a turn, then check the durable
          // fence again. Never proceed by timing alone or overwrite the fence.
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    })
    : undefined;
}
