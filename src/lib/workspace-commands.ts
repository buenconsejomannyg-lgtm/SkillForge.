import { profileSchema, type PrototypeProfile } from "./models";
import { active, alive, newEntity, workspaceSchema, type Entity, type Workspace } from "./workspace";
export type WorkspaceCommand = {
    type: "create-many";
    entities: Entity[];
} | {
    type: "put";
    entity: Entity;
    base: Entity | null;
} | {
    type: "lifecycle";
    id: string;
    revision: number;
    action: "archive" | "trash" | "restore";
} | {
    type: "complete";
    id: string;
    completed: boolean;
    note?: string;
} | {
    type: "profile";
    profile: PrototypeProfile;
    base: PrototypeProfile;
} | {
    type: "reorder";
    id: string;
    revision: number;
    otherId: string;
    otherRevision: number;
} | {
    type: "replace";
    workspace: Workspace;
    expectedRevision: number;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function applyCommand(current: Workspace, command: WorkspaceCommand, now = new Date().toISOString()): Workspace {
    if (command.type === "create-many") {
        let next = current;
        for (const entity of command.entities)
            next = applyCommand(next, { type: "put", entity, base: null }, now);
        return next;
    }
    let w = structuredClone(current);
    let sourceId = "local-profile";
    let action: string = command.type;
    const fail = (message = "Another tab changed this record. Your draft was not saved. Reload the saved record before retrying.") => { throw new Error(message); };
    if (command.type === "replace") {
        if (current.revision !== command.expectedRevision)
            fail("Restore canceled because the workspace changed. Review it again.");
        w = workspaceSchema.parse(command.workspace);
        w.migration = "active";
        w.revision = current.revision + 1;
        return workspaceSchema.parse(w);
    }
    if (command.type === "profile") {
        const next = profileSchema.parse(command.profile);
        for (const field of ["displayName", "headline", "biography"] as const)
            if (next[field] !== command.base[field]) {
                if (w.profile[field] !== command.base[field] && w.profile[field] !== next[field])
                    fail(`Another tab changed your ${field === "displayName" ? "display name" : field}. Your draft remains here.`);
                w.profile[field] = next[field];
            }
    }
    else if (command.type === "put") {
        const proposed = command.entity;
        sourceId = proposed.id;
        const existing = w.entities[sourceId];
        if (!command.base) {
            if (existing)
                fail("This identifier already exists.");
            const initialStatus = proposed.kind === "project" ? (["planned", "active", "on-hold"].includes(proposed.status) ? proposed.status : "planned") : proposed.kind === "activity" && proposed.status === "in-progress" ? "in-progress" : "todo";
            const e = newEntity(proposed.kind, { ...proposed, revision: 0, createdAt: now, updatedAt: now, archivedAt: null, deletedAt: null, status: initialStatus, completedAt: null, legacyCompleted: false }, now);
            w.entities[sourceId] = e;
        }
        else {
            if (!existing || existing.deletedAt || command.base.deletedAt || existing.kind !== proposed.kind || existing.kind === "rating")
                fail("This record cannot be edited. Self-ratings are append-only; add a new rating.");
            const next = { ...existing };
            const locked = new Set(["id", "kind", "revision", "createdAt", "updatedAt", "deletedAt", "archivedAt", "completedAt", "legacyCompleted", "status"]);
            for (const key of Object.keys(proposed) as (keyof Entity)[])
                if (!locked.has(key) && !same(proposed[key], command.base[key])) {
                    if (!same(existing[key], command.base[key]) && !same(existing[key], proposed[key]))
                        fail();
                    Object.assign(next, { [key]: proposed[key] });
                }
            if (["weekId","phaseId","roadmapId","projectId","milestoneId","parentId","order"].some(key => proposed[key as keyof Entity] !== command.base![key as keyof Entity]) && existing.revision !== command.base.revision)
                fail();
            if (existing.status !== "done" && existing.status !== "completed" && proposed.status !== command.base.status) {
                if (existing.status !== command.base.status && existing.status !== proposed.status)
                    fail();
                if (["done", "completed"].includes(proposed.status))
                    fail("Use the completion control to record completion.");
                next.status = proposed.status;
            }
            next.revision++;
            next.updatedAt = now;
            w.entities[sourceId] = next;
        }
        const e = w.entities[sourceId];
        for (const id of [...e.skillIds, ...e.categoryIds, e.parentId, e.roadmapId, e.phaseId, e.weekId, e.projectId, e.milestoneId, e.activityId].filter(Boolean))
            if (w.entities[id] && !active(w.entities[id]))
                fail("A linked record was archived or removed. Choose an active record.");
    }
    else {
        sourceId = command.id;
        const e = w.entities[sourceId];
        if (!e)
            fail("Record no longer exists.");
        if (command.type === "lifecycle") {
            if (e.revision !== command.revision)
                fail();
            if (command.action === "restore") {
                e.deletedAt = null;
                e.archivedAt = null;
            }
            else if (command.action === "trash")
                e.deletedAt = now;
            else
                e.archivedAt = now;
            action = command.action;
        }
        else if (command.type === "reorder") {
            const other = w.entities[command.otherId];
            if (!other || !active(e) || !active(other) || e.revision !== command.revision || other.revision !== command.otherRevision || e.kind !== other.kind || e.roadmapId !== other.roadmapId || e.phaseId !== other.phaseId || e.weekId !== other.weekId || e.projectId !== other.projectId || e.parentId !== other.parentId)
                fail();
            const order = e.order;
            e.order = other.order;
            other.order = order;
            other.revision++;
            other.updatedAt = now;
        }
        else {
            if (!active(e))
                fail("Restore this record before updating it.");
            if (!["activity", "project", "goal"].includes(e.kind) || e.kind === "goal" && e.metric !== "manual")
                fail("This record does not support manual completion.");
            const done = e.kind === "project" ? "completed" : "done";
            if ((e.status === done) === command.completed)
                return current;
            if (command.note !== undefined)
                e.completionNote = command.note;
            if (command.completed && e.kind === "activity" && e.activityKind === "assignment" && !e.completionNote.trim() && !e.url)
                fail("Add a completion note or evidence link before completing a practical assignment.");
            if (command.completed && e.kind === "project") {
                const tasks = Object.values(w.entities).filter(t => alive(t) && t.kind === "activity" && t.activityKind === "task" && t.projectId === e.id);
                if (!e.completionNote.trim() || !tasks.length || tasks.some(t => t.status !== "done"))
                    fail("Complete every project task and add a completion note first. At least one task is required.");
            }
            e.status = command.completed ? done : "todo";
            e.completedAt = command.completed ? now : null;
            action = command.completed ? "complete" : "reopen";
        }
        e.revision++;
        e.updatedAt = now;
    }
    const event = { id: crypto.randomUUID(), sourceId, action, at: now, revision: w.entities[sourceId]?.revision || 0, note: action === "complete" ? w.entities[sourceId]?.completionNote || "" : "" };
    w.events.push(event);
    w.revision++;
    if (command.type === "complete") {
        const e = w.entities[sourceId];
        const original = w.rewards.find(r => r.sourceId === sourceId && r.action === "award");
        const balance = w.rewards.filter(r => r.sourceId === sourceId).reduce((sum, r) => sum + r.points, 0);
        if (!command.completed && balance && original)
            w.rewards.push({ id: crypto.randomUUID(), sourceId, eventId: event.id, points: -balance, ruleVersion: 1, originalId: original.id, action: "reverse", at: now });
        if (command.completed && !balance && original)
            w.rewards.push({ id: crypto.randomUUID(), sourceId, eventId: event.id, points: original.points, ruleVersion: 1, originalId: original.id, action: "restore", at: now });
        if (command.completed && !original && !e.legacyCompleted) {
            const first = w.events.find(v => v.sourceId === sourceId && v.action === "complete");
            const points = e.kind === "project" ? 150 : e.kind === "activity" ? e.activityKind === "lesson" ? 25 : e.activityKind === "assignment" ? 50 : e.learning && e.skillIds.length ? 10 : 0 : 0;
            if (first?.id === event.id && points) {
                const id = crypto.randomUUID();
                w.rewards.push({ id, sourceId, eventId: event.id, points, ruleVersion: 1, originalId: id, action: "award", at: now });
            }
        }
        if (!command.completed && e.kind === "activity" && e.projectId) {
            const project = w.entities[e.projectId];
            if (project?.status === "completed") {
                project.status = "active";
                project.completedAt = null;
                project.revision++;
                project.updatedAt = now;
                const projectEvent = { id: crypto.randomUUID(), sourceId: project.id, action: "reopen-after-task-correction", at: now, revision: project.revision, note: "A supporting task was reopened." };
                w.events.push(projectEvent);
                const award = w.rewards.find(r => r.sourceId === project.id && r.action === "award");
                const total = w.rewards.filter(r => r.sourceId === project.id).reduce((sum, r) => sum + r.points, 0);
                if (award && total)
                    w.rewards.push({ id: crypto.randomUUID(), sourceId: project.id, eventId: projectEvent.id, points: -total, ruleVersion: 1, originalId: award.id, action: "reverse", at: now });
            }
        }
        updateAchievements(w, event);
    }
    return workspaceSchema.parse(w);
}
function updateAchievements(w: Workspace, event: Workspace["events"][number]) {
    const done = (id: string) => ["done", "completed"].includes(w.entities[id]?.status);
    const net = (id: string) => w.rewards.filter(r => r.sourceId === id).reduce((n, r) => n + r.points, 0);
    const eligible = Object.values(w.entities).filter(e => e.kind === "activity" && net(e.id) > 0 && done(e.id));
    const transition = (key: string, title: string, sourceIds: string[], revision = 0) => {
        const old = w.achievements.findLast(a => a.key === key);
        if (!old)
            w.achievements.push({ id: crypto.randomUUID(), key, title, sourceIds, eventId: event.id, contentRevision: revision, active: true, at: event.at });
    };
    const e = w.entities[event.sourceId];
    if (event.action === "complete" && net(e.id) > 0) {
        if (e.kind === "project")
            transition("first-project", "First Project", [e.id], e.revision);
        if (e.kind === "activity" && e.activityKind === "lesson")
            transition("first-lesson", "First Step", [e.id], e.revision);
        if (e.kind === "activity" && e.activityKind === "assignment")
            transition("first-assignment", "Applied Practice", [e.id], e.revision);
        for (const [kind, id, title] of [["phase", e.phaseId, "Phase Complete"], ["milestone", e.milestoneId, "Milestone Complete"]] as const)
            if (id) {
                const children = Object.values(w.entities).filter(t => alive(t) && t.kind === "activity" && (kind === "phase" ? t.phaseId === id && t.activityKind !== "task" : t.milestoneId === id && t.activityKind === "task"));
                if (children.length && children.every(t => done(t.id)))
                    transition(`first-${kind}`, title, children.map(t => t.id), w.entities[id].revision);
            }
        for (const count of [10, 25, 50])
            if (eligible.length >= count)
                transition(`activities-${count}`, `${count} Activities`, eligible.slice(0, count).map(t => t.id));
    }
    for (const key of new Set(w.achievements.map(a => a.key))) {
        const latest = w.achievements.findLast(a => a.key === key)!;
        const valid = latest.sourceIds.every(done);
        if (valid !== latest.active)
            w.achievements.push({ ...latest, id: crypto.randomUUID(), eventId: event.id, active: valid, at: event.at });
    }
}
