import { createInitialState } from "./data";
import { loadPrototype, STORAGE_KEY, type LocalStore } from "./persistence";
import { createWorkspace, workspaceSchema, type Workspace } from "./workspace";
import { applyCommand, type WorkspaceCommand } from "./workspace-commands";
import type { WriteCoordinator } from "./storage-transactions";
export const WORKSPACE_KEY = "skillforge:workspace:v2";
export const BACKUP_KEY = "skillforge:prototype:v1:backup";
export const GUARD = JSON.stringify({ schemaVersion: 2, movedTo: WORKSPACE_KEY });
export type WorkspaceResult = {
    status: "saved" | "conflict" | "unavailable";
    workspace: Workspace | null;
    message: string | null;
};
export function readWorkspace(store: LocalStore): Workspace {
    const raw = store.getItem(WORKSPACE_KEY);
    if (!raw)
        throw new Error("Workspace migration has not finished. Retry loading.");
    const w = workspaceSchema.parse(JSON.parse(raw));
    if (w.migration !== "active" || store.getItem(STORAGE_KEY) !== GUARD)
        throw new Error("An older tab or interrupted upgrade needs attention. Refresh all SkillForge tabs, export your records, and review recovery before continuing.");
    return w;
}
function verifiedWrite(store: LocalStore, key: string, raw: string) { store.setItem(key, raw); if (store.getItem(key) !== raw)
    throw new Error("Storage verification failed. Existing data was preserved."); }
export async function initializeWorkspace(store: LocalStore, coordinate?: WriteCoordinator): Promise<WorkspaceResult> {
    if (!coordinate)
        return { status: "unavailable", workspace: null, message: "This browser cannot coordinate safe multi-tab writes. Use a current browser with Web Locks support. Saving is disabled." };
    try {
        return await coordinate(() => {
            const existing = store.getItem(WORKSPACE_KEY);
            if (existing) {
                const w = workspaceSchema.parse(JSON.parse(existing));
                if (w.migration === "active")
                    return { status: "saved", workspace: readWorkspace(store), message: null };
                const original = store.getItem(BACKUP_KEY);
                if (original === null)
                    throw new Error("Migration backup is missing. Stored data has not been overwritten.");
                const legacy = store.getItem(STORAGE_KEY);
                if (legacy !== GUARD && legacy !== original && !(legacy === null && original === "null"))
                    throw new Error("Phase 1 data changed during migration. Both versions have been retained; export them for recovery.");
                verifiedWrite(store, STORAGE_KEY, GUARD);
                w.migration = "active";
                verifiedWrite(store, WORKSPACE_KEY, JSON.stringify(w));
                return { status: "saved", workspace: w, message: null };
            }
            const raw = store.getItem(STORAGE_KEY);
            const loaded = loadPrototype(store);
            if (loaded.error)
                throw new Error(loaded.error);
            if (store.getItem(BACKUP_KEY) !== null && store.getItem(BACKUP_KEY) !== (raw ?? "null"))
                throw new Error("A previous migration backup exists. Export it before recovery; it will not be overwritten.");
            verifiedWrite(store, BACKUP_KEY, raw ?? "null");
            const w = createWorkspace(raw ? loaded.state : createInitialState());
            verifiedWrite(store, WORKSPACE_KEY, JSON.stringify(w));
            verifiedWrite(store, STORAGE_KEY, GUARD);
            w.migration = "active";
            verifiedWrite(store, WORKSPACE_KEY, JSON.stringify(w));
            return { status: "saved", workspace: w, message: null };
        });
    }
    catch (error) {
        // A valid workspace remains visible read-only when its upgrade marker
        // was changed. This also makes reviewed restore possible without reset.
        let workspace: Workspace | null = null;
        try { const parsed = workspaceSchema.parse(JSON.parse(store.getItem(WORKSPACE_KEY) || "null")); if (parsed.migration === "active") workspace = parsed; } catch { /* Preserve malformed raw records for export. */ }
        return { status: "unavailable", workspace, message: error instanceof Error ? error.message : "Storage is unavailable. No changes were saved." };
    }
}
export async function commitWorkspace(store: LocalStore, commands: WorkspaceCommand[], coordinate?: WriteCoordinator): Promise<WorkspaceResult> {
    if (!coordinate)
        return { status: "unavailable", workspace: null, message: "Safe cross-tab locking is unavailable. Changes were not saved." };
    try {
        return await coordinate(() => {
            const replacing = commands.length === 1 && commands[0].type === "replace";
            const current = replacing ? workspaceSchema.parse(JSON.parse(store.getItem(WORKSPACE_KEY) || "null")) : readWorkspace(store);
            let next = current;
            try {
                for (const command of commands)
                    next = applyCommand(next, command);
            }
            catch (e) {
                return { status: "conflict", workspace: current, message: e instanceof Error ? e.message : "Invalid change. Your draft was retained." };
            }
            if (replacing)
                verifiedWrite(store, `skillforge:restore-backup:${crypto.randomUUID()}`, JSON.stringify({ workspace: store.getItem(WORKSPACE_KEY), legacy: store.getItem(STORAGE_KEY) }));
            verifiedWrite(store, WORKSPACE_KEY, JSON.stringify(next));
            if (replacing) verifiedWrite(store, STORAGE_KEY, GUARD);
            return { status: "saved", workspace: next, message: null };
        });
    }
    catch (e) {
        return { status: "unavailable", workspace: null, message: `Changes were not saved. ${e instanceof Error ? e.message : "Browser storage is unavailable."}` };
    }
}
