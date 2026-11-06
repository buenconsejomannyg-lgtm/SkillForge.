"use client";
import { Children, cloneElement, isValidElement, useId, useState, type ReactElement, type ReactNode } from "react";
import { usePrototype } from "./prototype-provider";
import { Badge, Card, Dialog, ProgressBar } from "./ui";
import { active, entitySchema, goalProgress, kinds, level, newEntity, percentage, records, workspaceSchema, xpTotal, type Entity, type Kind } from "@/lib/workspace";
import { BACKUP_KEY, WORKSPACE_KEY } from "@/lib/workspace-storage";
import { STORAGE_KEY } from "@/lib/persistence";
const labels: Record<Kind, string> = { category: "Category", skill: "Skill", competency: "Competency", rating: "Self-rating", goal: "Goal", evidence: "Evidence", roadmap: "Roadmap", phase: "Phase", week: "Week", activity: "Activity", resource: "Resource", project: "Project", milestone: "Milestone" };
export function Field({ label, children }: {
    label: string;
    children: ReactNode;
}) { const id = useId(); return <div className="form-field workspace-field"><label htmlFor={id}>{label}</label>{Children.map(children, child => isValidElement(child) && ["input", "select", "textarea"].includes(child.type as string) ? cloneElement(child as ReactElement<{
    id: string;
}>, { id }) : child)}</div>; }
export function EntityEditor({ kind, entity, seed = {}, onSaved }: {
    kind: Kind;
    entity?: Entity;
    seed?: Partial<Entity>;
    onSaved?: (e: Entity) => void;
}) {
    const { workspace, command } = usePrototype();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(() => entity || newEntity(kind, seed));
    const [base, setBase] = useState<Entity | null>(null);
    const [notice, setNotice] = useState("");
    const [saving, setSaving] = useState(false);
    const set = <K extends keyof Entity>(key: K, value: Entity[K]) => { setDraft(d => ({ ...d, [key]: value })); setNotice(""); };
    const options = (k: Kind) => records(workspace, k);
    const select = (label: string, key: "roadmapId" | "phaseId" | "weekId" | "projectId" | "milestoneId" | "parentId" | "activityId", k: Kind, required = false) => <Field label={label}><select value={draft[key]} required={required} onChange={ev => { const value = ev.target.value; setDraft(d => { const next = { ...d, [key]: value }; if (key === "roadmapId") {
        next.phaseId = "";
        next.weekId = "";
    } if (key === "phaseId")
        next.weekId = ""; if (key === "projectId")
        next.milestoneId = ""; return next; }); }}><option value="">None</option>{options(k).filter(e => e.id !== draft.id && (k !== "phase" || e.roadmapId === draft.roadmapId) && (k !== "week" || e.phaseId === draft.phaseId) && (k !== "milestone" || e.projectId === draft.projectId) && (k !== "competency" || e.skillIds[0] === draft.skillIds[0])).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></Field>;
    const multi = (label: string, key: "skillIds" | "categoryIds", k: Kind) => <Field label={label}><select multiple value={draft[key]} onChange={e => set(key, Array.from(e.target.selectedOptions, o => o.value))}>{options(k).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select><small>Use Ctrl/Command to select multiple; Ctrl/Command-click to clear.</small></Field>;
    return <><button className="button secondary small" onClick={() => { setDraft(entity || newEntity(kind, { ...seed, order: Math.max(-1, ...options(kind).map(e => e.order)) + 1 })); setBase(entity || null); setNotice(""); setOpen(true); }}>{entity ? `Edit ${labels[kind].toLowerCase()}` : `Add ${labels[kind].toLowerCase()}`}</button>
 <Dialog open={open} onOpenChange={value => { if (!saving)
        setOpen(value); }} title={`${entity ? "Edit" : "Add"} ${labels[kind].toLowerCase()}`} description="Saved locally. Use non-confidential information only. Evidence and ratings remain self-reported.">
 <form onSubmit={async (e) => { e.preventDefault(); setNotice(""); const parsed = entitySchema.safeParse(draft); if (!parsed.success) {
        setNotice(parsed.error.issues.map(i => i.message).join(" "));
        return;
    } setSaving(true); const r = await command({ type: "put", entity: parsed.data, base }); setSaving(false); if (r.status === "saved") {
        setOpen(false);
        onSaved?.(parsed.data);
    }
    else
        setNotice(r.message || "Not saved. Your draft remains here."); }}>
 <fieldset disabled={saving} className="workspace-fieldset">
 <Field label="Title"><input required maxLength={160} value={draft.title} onChange={e => set("title", e.target.value)}/></Field>
 <Field label="Description / notes"><textarea rows={3} maxLength={4000} value={draft.description} onChange={e => set("description", e.target.value)}/></Field>
 {["competency", "rating"].includes(kind) ? <Field label="Skill"><select required value={draft.skillIds[0] || ""} onChange={e => { set("skillIds", e.target.value ? [e.target.value] : []); set("parentId", ""); }}><option value="">Select skill</option>{options("skill").map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></Field> : !["category", "skill", "phase", "week", "milestone"].includes(kind) && multi("Linked skills", "skillIds", "skill")}
 {["skill", "activity"].includes(kind) && multi("Categories", "categoryIds", "category")}
 {kind === "competency" && select("Parent competency", "parentId", "competency")}
 {kind === "rating" && <Field label="Self-reported proficiency"><select value={draft.rating} onChange={e => set("rating", e.target.value as Entity["rating"])}>{["Beginner", "Developing", "Intermediate", "Advanced", "Expert"].map(x => <option key={x}>{x}</option>)}</select><small>This does not establish assessed proficiency.</small></Field>}
 {["phase", "week", "activity", "resource", "goal", "evidence"].includes(kind) && select("Roadmap", "roadmapId", "roadmap", ["phase", "week"].includes(kind))}
 {["week", "activity"].includes(kind) && select("Phase", "phaseId", "phase", kind === "week")}
 {kind === "activity" && select("Week", "weekId", "week")}
 {["milestone", "activity", "evidence", "goal", "resource"].includes(kind) && select("Project", "projectId", "project", kind === "milestone")}
 {kind === "activity" && select("Milestone", "milestoneId", "milestone")}
 {kind === "evidence" && select("Supporting activity", "activityId", "activity")}
 {kind === "activity" && <><Field label="Activity type"><select value={draft.activityKind} onChange={e => set("activityKind", e.target.value as Entity["activityKind"])}>{["lesson", "assignment", "task"].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Priority"><select value={draft.priority} onChange={e => set("priority", e.target.value as Entity["priority"])}>{["low", "medium", "high"].map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Learning / practice task"><input type="checkbox" checked={draft.learning} onChange={e => set("learning", e.target.checked)}/></Field></>}
 {["activity", "project"].includes(kind) && !["done", "completed"].includes(draft.status) && <Field label="Status"><select value={draft.status} onChange={e => set("status", e.target.value as Entity["status"])}>{(kind === "project" ? ["planned", "active", "on-hold"] : ["todo", "in-progress"]).map(s => <option key={s} value={s}>{s.replaceAll("-", " ")}</option>)}</select></Field>}
 {["roadmap", "phase", "week"].includes(kind) && <Field label="Learning objectives"><textarea value={draft.objectives} onChange={e => set("objectives", e.target.value)}/></Field>}
 {["roadmap", "activity", "goal", "project", "milestone"].includes(kind) && <Field label="Target / due date"><input type="date" value={draft.dueDate} onChange={e => set("dueDate", e.target.value)}/></Field>}
 {["evidence", "resource", "activity", "project"].includes(kind) && <Field label="Reference / evidence URL"><input type="url" placeholder="https://" value={draft.url} onChange={e => set("url", e.target.value)}/><small>HTTP/HTTPS links only; no files are uploaded.</small></Field>}
 {["activity", "project"].includes(kind) && <Field label="Completion note"><textarea value={draft.completionNote} onChange={e => set("completionNote", e.target.value)}/></Field>}
 {kind === "goal" && <><Field label="Goal metric"><select value={draft.metric} onChange={e => set("metric", e.target.value as Entity["metric"])}>{["manual", "lesson", "assignment", "task", "project"].map(x => <option key={x}>{x}</option>)}</select></Field>{draft.metric !== "manual" && <Field label="Target count"><input type="number" min={1} max={100000} required value={draft.target} onChange={e => set("target", Number(e.target.value))}/></Field>}</>}
 </fieldset><div className="dialog-actions"><button className="button" disabled={saving}>{saving ? "Saving…" : "Save record"}</button><button type="button" className="button secondary" disabled={saving} onClick={() => setOpen(false)}>Cancel</button></div>
 {notice && <p role="alert" className="form-notice">{notice}</p>}
 {notice && entity && <button type="button" className="button secondary small" onClick={() => { const latest = workspace.entities[entity.id]; if (latest) {
        setDraft(latest);
        setBase(latest);
        setNotice("Loaded saved record. Your previous draft was discarded.");
    } }}>Discard draft & load saved record</button>}
 </form></Dialog></>;
}
export function EntityRow({ entity: e, siblings = [] }: {
    entity: Entity;
    siblings?: Entity[];
}) {
    const { workspace, command } = usePrototype();
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<"archive" | "trash" | null>(null);
    const run = async (c: Parameters<typeof command>[0]) => { setBusy(true); const r = await command(c); setBusy(false); setNotice(r.status === "saved" ? "Saved in this browser." : r.message || "Not saved."); };
    const done = ["done", "completed"].includes(e.status);
    const index = siblings.findIndex(s => s.id === e.id);
    const linked = [...e.skillIds, ...e.categoryIds, e.roadmapId, e.phaseId, e.weekId, e.projectId, e.milestoneId, e.parentId, e.activityId].filter(Boolean);
    const children = Object.values(workspace.entities).filter(t => !t.deletedAt && t.kind === "activity" && (e.kind === "project" ? t.projectId === e.id && t.activityKind === "task" : e.kind === "milestone" ? t.milestoneId === e.id && t.activityKind === "task" : t.roadmapId === e.id && t.activityKind !== "task"));
    return <article className="workspace-record" aria-label={e.title}>
 <div className="workspace-record-main"><div><h3>{e.title}</h3><p>{e.description}</p><div className="record-tags"><Badge tone="muted">{labels[e.kind]}{e.kind === "activity" ? ` · ${e.activityKind} · ${e.priority}` : ""}</Badge>{e.kind === "rating" ? <Badge>Self-reported · {e.rating}</Badge> : (e.deletedAt || e.archivedAt || ["activity","project","goal"].includes(e.kind)) && <Badge tone={done ? "teal" : "muted"}>{e.deletedAt ? "In trash" : e.archivedAt ? "Archived" : e.status.replaceAll("-", " ")}</Badge>}{e.dueDate && <span>Target: {e.dueDate}</span>}</div>
 {linked.length > 0 && <p className="micro muted">Linked: {Array.from(new Set(linked)).map(id => { const r = workspace.entities[id]; return `${r?.title || id}${r?.deletedAt ? " (in trash)" : r?.archivedAt ? " (archived)" : ""}`; }).join(" · ")}</p>}
 {e.objectives && <p>Objectives: {e.objectives}</p>}{e.url && <a className="text-link" href={e.url} target="_blank" rel="noreferrer">Open reference (new tab)</a>}{e.completionNote && <p className="micro">Completion note: {e.completionNote}</p>}
 {e.kind === "evidence" && <small>Supporting evidence · user supplied · unverified</small>}
 {e.kind === "project" && done && <p className="micro">Eligible for future portfolio selection. Publishing remains unavailable until Phase 5.</p>}
 {e.legacyCompleted && <p className="micro muted">Preserved Phase 1 completion · no retroactive XP</p>}
 {e.kind === "goal" && (() => { const g = goalProgress(workspace, e); return <p>Goal: {g.completed}/{g.target} · {Math.min(100, Math.round(g.completed / g.target * 100))}%</p>; })()}
 {["project", "milestone", "roadmap"].includes(e.kind) && <><ProgressBar label={`${e.title} progress`} value={percentage(children)}/><small>{children.length ? `${children.filter(t => t.status === "done").length}/${children.length} activities · ${percentage(children)}%` : "No activities"}</small></>}
 </div></div>
 <div className="workspace-actions"><fieldset disabled={busy} className="workspace-actionset">
 {active(e) ? <>
 {(e.kind === "activity" || e.kind === "project" || e.kind === "goal" && e.metric === "manual") && <button className="button small" aria-pressed={done} onClick={() => void run({ type: "complete", id: e.id, completed: !done })}>{done ? "Reopen" : "Complete"}</button>}
 {e.kind !== "rating" && <EntityEditor kind={e.kind} entity={e}/>}
 {index > 0 && <button className="button secondary small" aria-label={`Move ${e.title} up`} onClick={() => void run({ type: "reorder", id: e.id, revision: e.revision, otherId: siblings[index - 1].id, otherRevision: siblings[index - 1].revision })}>↑ Move up</button>}
 {index >= 0 && index < siblings.length - 1 && <button className="button secondary small" aria-label={`Move ${e.title} down`} onClick={() => void run({ type: "reorder", id: e.id, revision: e.revision, otherId: siblings[index + 1].id, otherRevision: siblings[index + 1].revision })}>↓ Move down</button>}
 <button className="button secondary small" onClick={() => setConfirm("archive")}>Archive</button><button className="button secondary small" onClick={() => setConfirm("trash")}>Move to trash</button>
 </> : <button className="button secondary small" onClick={() => void run({ type: "lifecycle", id: e.id, revision: e.revision, action: "restore" })}>Restore</button>}
 </fieldset></div>{notice && <p role="status" className="form-notice">{notice}</p>}
 <Dialog open={Boolean(confirm)} onOpenChange={v => { if (!v)
        setConfirm(null); }} title={confirm === "trash" ? "Move to recoverable trash?" : "Archive this record?"} description="History, linked records, and earned XP are retained. You can restore this record later."><div className="dialog-actions"><button className="button" disabled={busy} onClick={async () => { if (confirm)
        await run({ type: "lifecycle", id: e.id, revision: e.revision, action: confirm }); setConfirm(null); }}>Confirm</button><button className="button secondary" onClick={() => setConfirm(null)}>Cancel</button></div></Dialog>
 </article>;
}
export function EntityManager({ kind, title, filter, seed = {}, reorder = false }: {
    kind: Kind;
    title?: string;
    filter?: (e: Entity) => boolean;
    seed?: Partial<Entity>;
    reorder?: boolean;
}) {
    const { workspace } = usePrototype();
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const items = records(workspace, kind).filter(e => !filter || filter(e));
    const visible = items.filter(e => e.title.toLowerCase().includes(query.toLowerCase()) && (!status || e.status === status) && (!priority || e.priority === priority));
    return <Card title={title || `${labels[kind]} management`} action={<EntityEditor kind={kind} seed={seed}/>}><div className="workspace-filters"><Field label={`Search ${labels[kind].toLowerCase()}`}><input type="search" value={query} onChange={e => setQuery(e.target.value)}/></Field>{kind === "activity" && <><Field label="Filter status"><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Done</option></select></Field><Field label="Filter priority"><select value={priority} onChange={e => setPriority(e.target.value)}><option value="">All</option>{["low", "medium", "high"].map(p => <option key={p}>{p}</option>)}</select></Field></>}</div>
 {visible.length ? visible.map(e => <EntityRow key={e.id} entity={e} siblings={reorder ? items : []}/>) : <p className="muted">No matching records. Add a record to get started.</p>}</Card>;
}
export function ArchiveTrash() { const { workspace } = usePrototype(); const [kind, setKind] = useState(""); const [view, setView] = useState("all"); const items = Object.values(workspace.entities).filter(e => (e.archivedAt || e.deletedAt) && (!kind || e.kind === kind) && (view === "all" || view === "trash" ? view === "all" || Boolean(e.deletedAt) : !e.deletedAt)); return <Card title="Archive & recoverable trash"><p className="muted">Linked records and reward history are retained. Permanent deletion is unavailable.</p><div className="workspace-filters"><Field label="Record type"><select value={kind} onChange={e => setKind(e.target.value)}><option value="">All types</option>{kinds.map(k => <option key={k} value={k}>{labels[k]}</option>)}</select></Field><Field label="Hidden records"><select value={view} onChange={e => setView(e.target.value)}><option value="all">All hidden records</option><option value="archive">Archive</option><option value="trash">Trash</option></select></Field></div>{items.map(e => <EntityRow key={e.id} entity={e}/>)}{!items.length && <p>No hidden records.</p>}</Card>; }
export function History({ skillId }: {
    skillId?: string;
}) { const { workspace } = usePrototype(); const events = workspace.events.filter(e => !skillId || e.sourceId === skillId || workspace.entities[e.sourceId]?.skillIds.includes(skillId)); return <Card title="Development history"><p className="micro muted">Recorded actions from Phase 2 activation. Earlier completion timestamps remain on the original activities; missing historical actions are not invented.</p>{events.slice().reverse().map(e => <div className="history-row" key={e.id}><strong>{workspace.entities[e.sourceId]?.title || "Profile"}</strong><span>{e.action} · {new Date(e.at).toLocaleString()}</span></div>)}{!events.length && <p>No new actions recorded.</p>}</Card>; }
function download(value: string, name: string) { const url = URL.createObjectURL(new Blob([value], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function WorkspaceBackup() {
    const { workspace, command } = usePrototype();
    const [candidate, setCandidate] = useState<ReturnType<typeof workspaceSchema.parse> | null>(null);
    const [expected, setExpected] = useState(0);
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    return <Card title="Local backup & recovery"><p className="muted">JSON backups contain your local records. Keep them safe. Restore replaces the workspace after validation and creates a backup of current data.</p><div className="workspace-actions"><button className="button secondary small" onClick={() => download(JSON.stringify(workspace, null, 2), "skillforge-workspace-v2.json")}>Export workspace JSON</button><button className="button secondary small" onClick={() => { try {
        download(JSON.stringify({ workspace: localStorage.getItem(WORKSPACE_KEY), legacy: localStorage.getItem(STORAGE_KEY), phase1Backup: localStorage.getItem(BACKUP_KEY), recoveryBackups: Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith("skillforge:reset-backup:") || k.startsWith("skillforge:restore-backup:")).map(k => [k, localStorage.getItem(k)])) }, null, 2), "skillforge-recovery.json");
    }
    catch {
        setNotice("Browser storage could not be read.");
    } }}>Export raw recovery data</button></div><Field label="Choose workspace JSON to restore"><input type="file" accept="application/json,.json" onChange={async (e) => { const file = e.target.files?.[0]; if (!file)
        return; try {
        if (file.size > 5 * 1024 * 1024)
            throw new Error("Backup exceeds the 5 MB prototype import limit.");
        const parsed = workspaceSchema.parse(JSON.parse(await file.text()));
        if (parsed.migration !== "active")
            throw new Error("Only a completed workspace backup can be restored.");
        setCandidate(parsed);
        setExpected(workspace.revision);
        setNotice("");
    }
    catch (err) {
        setNotice(err instanceof Error ? err.message : "Invalid backup.");
    } e.target.value = ""; }}/></Field><p className="micro muted">Approximate workspace size: {Math.ceil(new Blob([JSON.stringify(workspace)]).size / 1024)} KB. Browser storage capacity varies; exports are your backup.</p>{notice && <p role="alert">{notice}</p>}
 <Dialog open={Boolean(candidate)} onOpenChange={v => { if (!v && !busy)
        setCandidate(null); }} title="Replace this workspace?" description="Review this backup before restoring. Current records are backed up first; no merge occurs.">{candidate && <><p>Profile: {candidate.profile.displayName}</p><p>{Object.keys(candidate.entities).length} records · {candidate.events.length} actions · {xpTotal(candidate)} XP</p><div className="dialog-actions"><button className="button" disabled={busy} onClick={async () => { setBusy(true); const r = await command({ type: "replace", workspace: candidate, expectedRevision: expected }); setBusy(false); setNotice(r.status === "saved" ? "Workspace restored and previous data backed up." : r.message || "Restore failed."); if (r.status === "saved")
        setCandidate(null); }}>Confirm restore</button><button className="button secondary" disabled={busy} onClick={() => setCandidate(null)}>Cancel</button></div></>}</Dialog></Card>;
}
export function ProgressionPanel() {
    const { workspace: w } = usePrototype();
    const xp = xpTotal(w);
    const latest = Array.from(new Set(w.achievements.map(a => a.key))).map(key => w.achievements.findLast(a => a.key === key)!);
    return <Card title="XP & achievements" eyebrow={`LEVEL ${level(w)} · ACTIVITY PROGRESSION`}><div className="record-tags"><Badge>{xp} XP</Badge><Badge tone="teal">Level {level(w)}</Badge></div><ProgressBar label="XP toward next level" value={xp % 250 / 250 * 100}/><p className="micro muted">{250 - xp % 250} XP to next level. Learning activity is self-reported; XP does not measure proficiency.</p><p className="micro muted">Rule v1: lesson 25 · practical assignment 50 · linked practice task 10 · eligible project 150. No retroactive awards. Reopening reverses XP; recompletion restores its original reward.</p><div className="record-tags">{latest.map(a => <Badge key={a.key} tone={a.active ? "gold" : "muted"}>{a.title} · {a.active ? "Earned" : "Withdrawn"}</Badge>)}{!latest.length && <p>No achievements earned yet.</p>}</div><details><summary>Reward and achievement history</summary>{w.rewards.slice().reverse().map(r => <p key={r.id}>{r.points > 0 ? "+" : ""}{r.points} XP · {w.entities[r.sourceId]?.title} · {r.action} · rule {r.ruleVersion} · {new Date(r.at).toLocaleString()}</p>)}{w.achievements.slice().reverse().map(a => <p key={a.id}>{a.title} · {a.active ? "unlocked/restored" : "withdrawn"} · content revision {a.contentRevision} · {new Date(a.at).toLocaleString()}</p>)}</details></Card>;
}
export function ActivityAnalytics() {
    const { workspace: w } = usePrototype();
    const [scope, setScope] = useState("active");
    const all = Object.values(w.entities).filter(e => !e.deletedAt && (scope === "all" || !e.archivedAt));
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const activities = all.filter(e => e.kind === "activity");
    const upcoming = activities.filter(e => e.status !== "done").sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")).slice(0, 6);
    return <Card title="Activity analytics"><Field label="Analytics scope"><select value={scope} onChange={e => setScope(e.target.value)}><option value="active">Active records</option><option value="all">Include archived records</option></select></Field><dl className="learning-counts">{(["lesson", "assignment", "task"] as const).map(k => { const group = activities.filter(e => e.activityKind === k); return <div key={k}><dt>{k}s completed</dt><dd>{group.filter(e => e.status === "done").length}/{group.length}</dd></div>; })}<div><dt>Unique completed activities</dt><dd>{activities.filter(e => e.status === "done").length}</dd></div></dl><h3>Roadmaps and projects</h3>{all.filter(e => e.kind === "roadmap" || e.kind === "project").map(e => { const list = activities.filter(a => e.kind === "roadmap" ? a.roadmapId === e.id && a.activityKind !== "task" : a.projectId === e.id && a.activityKind === "task"); return <p key={e.id}>{e.title}: {list.length ? `${percentage(list)}% (${list.filter(a => a.status === "done").length}/${list.length})` : "No activities"}</p>; })}<h3>Development goals</h3>{all.filter(e=>e.kind==="goal").map(g=>{const progress=goalProgress(w,g);return <p key={g.id}>{g.title}: {progress.completed}/{progress.target} · {Math.min(100,Math.round(progress.completed/progress.target*100))}%</p>;})}<h3>Active learning tasks</h3>{upcoming.map(e => <p key={e.id}>{e.title} · {e.priority}{e.dueDate ? ` · ${e.dueDate}${e.dueDate < date ? " · Overdue" : ""}` : " · No due date"}</p>)}{!upcoming.length && <p>No open activities.</p>}<p className="micro muted">Due dates use the browser’s local calendar. Completion timestamps preserve their original instant. These are activity metrics, not assessed proficiency.</p></Card>;
}
