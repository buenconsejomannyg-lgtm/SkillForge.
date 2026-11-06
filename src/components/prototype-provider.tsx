"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createInitialState } from "@/lib/data";
import type { PrototypeProfile, PrototypeState } from "@/lib/models";
import { toggleCompletion, STORAGE_KEY } from "@/lib/persistence";
import { type CommitResult } from "@/lib/storage-transactions";
import { coordinateBrowser, latestFenceRevision } from "@/lib/browser-coordinator";
import { createWorkspace, prototypeView, type Workspace } from "@/lib/workspace";
import type { WorkspaceCommand } from "@/lib/workspace-commands";
import { commitWorkspace, GUARD, initializeWorkspace, readWorkspace, WORKSPACE_KEY, type WorkspaceResult } from "@/lib/workspace-storage";
type ContextValue = {
    state: PrototypeState;
    workspace: Workspace;
    ready: boolean;
    error: string | null;
    recovered: boolean;
    avatar: string | null;
    command(command: WorkspaceCommand): Promise<WorkspaceResult>;
    updateProfile(profile: PrototypeProfile, base: PrototypeProfile): Promise<CommitResult>;
    discardProfileDraft(): PrototypeProfile | null;
    profileBase(): PrototypeProfile;
    toggle(kind: "lessonCompletion" | "taskCompletion", id: string): void;
    setAvatar(file: File): Promise<string | null>;
    captureReset(): string | null;
    reset(expectedRaw?: string | null): Promise<CommitResult>;
    retry(): void;
};
const Context = createContext<ContextValue | null>(null);
const coordinate = coordinateBrowser;
export function PrototypeProvider({ children }: {
    children: ReactNode;
}) {
    const [workspace, setWorkspace] = useState(() => createWorkspace());
    const [state, setState] = useState(createInitialState);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [avatar, setAvatarUrl] = useState<string | null>(null);
    const avatarRef = useRef<string | null>(null);
    const ref = useRef(workspace);
    const stateRef = useRef(state);
    const failed = useRef<WorkspaceCommand[]>([]);
    const pending = useRef(0);
    const tail = useRef<Promise<unknown>>(Promise.resolve());
    function display(w: Workspace) { ref.current = w; setWorkspace(w); const p = prototypeView(w); stateRef.current = p; setState(p); }
    useEffect(() => {
        let disposed = false;
        const load = async () => { try {
            const result = await initializeWorkspace(window.localStorage, coordinate());
            if (disposed)
                return;
            if (result.workspace)
                display(result.workspace);
            setError(result.message);
        }
        catch {
            if (!disposed)
                setError("Browser storage is unavailable. Existing records have not been overwritten.");
        } if (!disposed)
            setReady(true); };
        void load();
        const sync = () => { if (pending.current || failed.current.length)
            return; try {
            display(readWorkspace(window.localStorage));
            setError(null);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Storage is unavailable.");
        } };
        const onStorage = (event: StorageEvent) => { if ([WORKSPACE_KEY, STORAGE_KEY, null].includes(event.key))
            sync(); };
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", sync);
        return () => { disposed = true; window.removeEventListener("storage", onStorage); window.removeEventListener("focus", sync); if (avatarRef.current)
            URL.revokeObjectURL(avatarRef.current); };
    }, []);
    function enqueue(command?: WorkspaceCommand): Promise<WorkspaceResult> {
        pending.current++;
        const job = tail.current.then(async () => {
            const earlier = command?.type === "replace" ? [] : command?.type === "profile" ? failed.current.filter(c => c.type !== "profile") : failed.current;
            const batch = [...earlier, ...(command ? [command] : [])];
            let result: WorkspaceResult;
            try {
                result = await commitWorkspace(window.localStorage, batch, coordinate(command?.type === "replace"));
            }
            catch (error) {
                result = { status: "unavailable", workspace: null, message: error instanceof Error ? error.message : "Browser storage is unavailable. Your draft remains in this tab." };
            }
            if (result.status === "saved") {
                failed.current = [];
                setError(null);
            }
            else {
                failed.current = result.status === "unavailable" || earlier.length ? batch : [];
                setError(result.message);
            }
            if (result.workspace && pending.current === 1) {
                display(result.workspace);
                const unsaved = failed.current.find(c => c.type === "profile");
                if (unsaved?.type === "profile") {
                    const profile = { ...result.workspace.profile };
                    for (const field of ["displayName", "headline", "biography"] as const)
                        if (unsaved.profile[field] !== unsaved.base[field])
                            profile[field] = unsaved.profile[field];
                    const p = { ...stateRef.current, profile };
                    stateRef.current = p;
                    setState(p);
                }
            }
            if (result.status === "unavailable" && command?.type === "profile") {
                const profile = { ...stateRef.current.profile };
                for (const field of ["displayName", "headline", "biography"] as const)
                    if (command.profile[field] !== command.base[field])
                        profile[field] = command.profile[field];
                const p = { ...stateRef.current, profile };
                stateRef.current = p;
                setState(p);
            }
            pending.current--;
            return result;
        });
        tail.current = job;
        return job;
    }
    function retry() { if (pending.current)
        return; if (failed.current.length) {
        void enqueue();
        return;
    } void initializeWorkspace(window.localStorage, coordinate()).then(result => { if (result.workspace)
        display(result.workspace); setError(result.message); }); }
    function captureReset() { try {
        return JSON.stringify([window.localStorage.getItem(WORKSPACE_KEY), window.localStorage.getItem(STORAGE_KEY)]);
    }
    catch {
        return null;
    } }
    async function reset(expectedRaw = captureReset()): Promise<CommitResult> {
        const lock = coordinate(true);
        if (!lock)
            return { status: "unavailable", state: null, message: "Safe locking is unavailable. Reset was not saved." };
        try {
            return await lock(() => {
                if (captureReset() !== expectedRaw)
                    return { status: "conflict", state: stateRef.current, message: "Reset canceled because saved data changed. Review and confirm again." };
                const store = window.localStorage;
                const raw = captureReset()!;
                const key = `skillforge:reset-backup:${crypto.randomUUID()}`;
                store.setItem(key, raw);
                if (store.getItem(key) !== raw)
                    throw new Error("Backup failed.");
                const next = createWorkspace();
                next.revision = Math.max(ref.current.revision, latestFenceRevision()) + 1;
                next.migration = "active";
                store.setItem(STORAGE_KEY, GUARD);
                store.setItem(WORKSPACE_KEY, JSON.stringify(next));
                readWorkspace(store);
                failed.current = [];
                display(next);
                setError(null);
                if (avatarRef.current)
                    URL.revokeObjectURL(avatarRef.current);
                avatarRef.current = null;
                setAvatarUrl(null);
                return { status: "saved", state: prototypeView(next), message: null };
            });
        }
        catch {
            setError("Reset could not be saved. A recovery backup may be available; existing records were not discarded.");
            return { status: "unavailable", state: null, message: "Reset was not saved." };
        }
    }
    async function setAvatar(file: File) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
            return "Choose a PNG, JPEG, or WebP image.";
        if (file.size > 3 * 1024 * 1024)
            return "Choose an image smaller than 3 MB.";
        const url = URL.createObjectURL(file);
        try {
            const image = new Image();
            image.src = url;
            await image.decode();
            if (avatarRef.current)
                URL.revokeObjectURL(avatarRef.current);
            avatarRef.current = url;
            setAvatarUrl(url);
            return null;
        }
        catch {
            URL.revokeObjectURL(url);
            return "This image could not be read. Choose another image.";
        }
    }
    return <Context.Provider value={{ workspace, state, ready, error, recovered: Boolean(error && workspace.migration !== "active"), avatar, command: enqueue,
            updateProfile: async (profile, base) => { const r = await enqueue({ type: "profile", profile, base }); return { status: r.status, state: r.workspace ? prototypeView(r.workspace) : null, message: r.message }; },
            discardProfileDraft: () => { try {
                const w = readWorkspace(window.localStorage);
                failed.current = failed.current.filter(c => c.type !== "profile");
                display(w);
                setError(failed.current.length ? "Unsaved changes remain. Retry saving." : null);
                return w.profile;
            }
            catch {
                return null;
            } },
            profileBase: () => { const p = failed.current.find(c => c.type === "profile"); return p?.type === "profile" ? p.base : ref.current.profile; },
            toggle: (kind, id) => { const e = ref.current.entities[id]; if (e) {
                const records = toggleCompletion(stateRef.current[kind], id);
                const p = { ...stateRef.current, [kind]: records };
                stateRef.current = p;
                setState(p);
                void enqueue({ type: "complete", id, completed: records[id].completed });
            } }, setAvatar, captureReset, reset, retry,
        }}>{children}</Context.Provider>;
}
export function usePrototype() { const value = useContext(Context); if (!value)
    throw new Error("PrototypeProvider is required"); return value; }
