import { z } from "zod";
import { createInitialState, roadmap, skills, competencies, weeklyTasks } from "./data";
import { profileSchema, type PrototypeState } from "./models";
export const kinds = ["category", "skill", "competency", "rating", "goal", "evidence", "roadmap", "phase", "week", "activity", "resource", "project", "milestone"] as const;
export type Kind = typeof kinds[number];
const date = z.string().refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, "Use a valid date.");
export const entitySchema = z.object({
    id: z.string().min(1), kind: z.enum(kinds), title: z.string().trim().min(1).max(160), description: z.string().max(4000).default(""),
    revision: z.number().int().nonnegative(), createdAt: z.iso.datetime().nullable(), updatedAt: z.iso.datetime().nullable(), archivedAt: z.iso.datetime().nullable(), deletedAt: z.iso.datetime().nullable(),
    skillIds: z.array(z.string()).default([]), categoryIds: z.array(z.string()).default([]), parentId: z.string().default(""), roadmapId: z.string().default(""), phaseId: z.string().default(""), weekId: z.string().default(""), projectId: z.string().default(""), milestoneId: z.string().default(""), activityId: z.string().default(""),
    order: z.number().int().default(0), objectives: z.string().max(4000).default(""), dueDate: date.default(""),
    status: z.enum(["todo", "in-progress", "done", "planned", "active", "on-hold", "completed"]).default("todo"),
    activityKind: z.enum(["lesson", "assignment", "task"]).default("task"), priority: z.enum(["low", "medium", "high"]).default("medium"), learning: z.boolean().default(false),
    completedAt: z.iso.datetime().nullable().default(null), completionNote: z.string().max(4000).default(""), url: z.string().refine(v => !v || /^https?:\/\//i.test(v) && URL.canParse(v), "Use an HTTP or HTTPS URL.").default(""),
    metric: z.enum(["manual", "lesson", "assignment", "task", "project"]).default("manual"), target: z.number().int().min(1).max(100000).default(1), rating: z.enum(["Beginner", "Developing", "Intermediate", "Advanced", "Expert"]).default("Beginner"),
    legacyCompleted: z.boolean().default(false), templateVersion: z.number().int().nonnegative().default(0),
}).strict();
export type Entity = z.infer<typeof entitySchema>;
export const eventSchema = z.object({ id: z.string(), sourceId: z.string(), action: z.string(), at: z.iso.datetime(), revision: z.number().int(), note: z.string() }).strict();
const rewardSchema = z.object({ id: z.string(), sourceId: z.string(), eventId: z.string(), points: z.number().int(), ruleVersion: z.literal(1), originalId: z.string(), action: z.enum(["award", "reverse", "restore"]), at: z.iso.datetime() }).strict();
const achievementSchema = z.object({ id: z.string(), key: z.string(), title: z.string(), sourceIds: z.array(z.string()), eventId: z.string(), contentRevision: z.number().int(), active: z.boolean(), at: z.iso.datetime() }).strict();
export const workspaceSchema = z.object({ schemaVersion: z.literal(2), revision: z.number().int().nonnegative(), profile: profileSchema, entities: z.record(z.string(), entitySchema), events: z.array(eventSchema), rewards: z.array(rewardSchema), achievements: z.array(achievementSchema), activatedAt: z.iso.datetime(), ruleVersion: z.literal(1), migration: z.enum(["prepared", "active"]) }).strict().superRefine((w, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    const ref = (id: string, kind: Kind, source: Entity) => { if (id && w.entities[id]?.kind !== kind)
        issue(`${source.title}: missing ${kind} reference.`); };
    for (const [key, e] of Object.entries(w.entities)) {
        if (key !== e.id)
            issue("Record identifier mismatch.");
        e.skillIds.forEach(id => ref(id, "skill", e));
        e.categoryIds.forEach(id => ref(id, "category", e));
        ref(e.activityId, "activity", e);
        for (const [field, kind] of [["roadmapId", "roadmap"], ["phaseId", "phase"], ["weekId", "week"], ["projectId", "project"], ["milestoneId", "milestone"]] as const)
            ref(e[field], kind, e);
        if (e.parentId)
            ref(e.parentId, "competency", e);
        if (e.kind === "competency" || e.kind === "rating") {
            if (e.skillIds.length !== 1)
                issue("A competency or rating requires one skill.");
        }
        if (e.kind === "phase" && !e.roadmapId || e.kind === "week" && (!e.phaseId || !e.roadmapId) || e.kind === "milestone" && !e.projectId)
            issue("Missing structural parent.");
        if (e.phaseId && w.entities[e.phaseId]?.roadmapId !== e.roadmapId)
            issue("Phase belongs to another roadmap.");
        if (e.weekId && (w.entities[e.weekId]?.roadmapId !== e.roadmapId || w.entities[e.weekId]?.phaseId !== e.phaseId))
            issue("Week belongs to another phase.");
        if (e.milestoneId && w.entities[e.milestoneId]?.projectId !== e.projectId)
            issue("Milestone belongs to another project.");
        const seen = new Set([e.id]);
        let parent = e.parentId;
        while (parent) {
            if (seen.has(parent)) {
                issue("Competency hierarchy cannot contain cycles.");
                break;
            }
            seen.add(parent);
            const p = w.entities[parent];
            if (p && p.skillIds[0] !== e.skillIds[0])
                issue("Parent competency belongs to another skill.");
            parent = p?.parentId || "";
        }
        if (e.kind === "activity" && (e.status === "done") !== Boolean(e.completedAt))
            issue("Completion and timestamp must agree.");
    }
    const ids = new Set<string>();
    for (const event of w.events) {
        if (ids.has(event.id) || !w.entities[event.sourceId] && event.sourceId !== "local-profile")
            issue("Invalid event reference.");
        ids.add(event.id);
    }
    const rewardIds = new Set<string>();
    const awarded = new Map<string, number>();
    const balance = new Map<string, number>();
    for (const reward of w.rewards) {
        if (rewardIds.has(reward.id) || !ids.has(reward.eventId) || !w.entities[reward.sourceId])
            issue("Invalid reward reference.");
        rewardIds.add(reward.id);
        if (reward.action === "award") {
            if (awarded.has(reward.sourceId) || ![10, 25, 50, 150].includes(reward.points) || reward.originalId !== reward.id)
                issue("Invalid initial reward.");
            awarded.set(reward.sourceId, reward.points);
        }
        else {
            const original = w.rewards.find(r => r.id === reward.originalId);
            if (!original || original.action !== "award" || original.sourceId !== reward.sourceId || reward.points !== (reward.action === "reverse" ? -original.points : original.points))
                issue("Invalid reward adjustment.");
        }
        const next = (balance.get(reward.sourceId) || 0) + reward.points;
        if (next !== 0 && next !== awarded.get(reward.sourceId))
            issue("Duplicate or invalid reward balance.");
        balance.set(reward.sourceId, next);
    }
    for (const a of w.achievements)
        if (!ids.has(a.eventId) || a.sourceIds.some(id => !w.entities[id]))
            issue("Invalid achievement reference.");
});
export type Workspace = z.infer<typeof workspaceSchema>;
export function newEntity(kind: Kind, values: Partial<Entity> = {}, now = new Date().toISOString()): Entity {
    return entitySchema.parse({ id: crypto.randomUUID(), kind, title: "Untitled", revision: 0, createdAt: now, updatedAt: now, archivedAt: null, deletedAt: null, ...values });
}
export function createWorkspace(old: PrototypeState = createInitialState(), now = new Date().toISOString()): Workspace {
    const entities: Record<string, Entity> = {};
    const add = (kind: Kind, values: Partial<Entity>) => { const e = newEntity(kind, { createdAt: null, updatedAt: null, ...values }, now); entities[e.id] = e; };
    skills.filter(s => ["ai", "prompting"].includes(s.id)).forEach(s => add("skill", { id: s.id, title: s.name, description: s.description }));
    competencies.forEach(c => add("competency", { id: `competency-${c.id}`, title: c.name, description: c.description, skillIds: ["ai"] }));
    add("roadmap", { id: roadmap.id, title: roadmap.title, description: roadmap.description, skillIds: ["prompting"], templateVersion: 1 });
    roadmap.phases.forEach((p, order) => {
        add("phase", { id: p.id, title: p.title, roadmapId: roadmap.id, order });
        for (let week = p.startWeek; week <= p.endWeek; week++)
            add("week", { id: `week-${week}`, title: `Week ${week}`, roadmapId: roadmap.id, phaseId: p.id, order: week });
        p.lessons.forEach((l, order) => { const c = old.lessonCompletion[l.id]; add("activity", { id: l.id, title: l.title, activityKind: "lesson", roadmapId: roadmap.id, phaseId: p.id, weekId: `week-${l.week}`, skillIds: ["prompting"], order, status: c?.completed ? "done" : "todo", completedAt: c?.completedAt || null, legacyCompleted: Boolean(c?.completed), learning: true }); });
    });
    weeklyTasks.forEach((t, order) => { const c = old.taskCompletion[t.id]; add("activity", { id: t.id, title: t.title, description: t.detail, activityKind: "task", skillIds: ["prompting"], learning: true, order, status: c?.completed ? "done" : "todo", completedAt: c?.completedAt || null, legacyCompleted: Boolean(c?.completed) }); });
    return workspaceSchema.parse({ schemaVersion: 2, revision: 0, profile: old.profile, entities, events: [], rewards: [], achievements: [], activatedAt: now, ruleVersion: 1, migration: "prepared" });
}
export const alive = (e: Entity) => !e.deletedAt;
export const active = (e: Entity) => alive(e) && !e.archivedAt;
export function records(w: Workspace, kind: Kind, includeHidden = false) { return Object.values(w.entities).filter(e => e.kind === kind && (includeHidden || active(e))).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)); }
export function percentage(items: Entity[]) { return items.length ? Math.round(items.filter(e => e.status === "done").length / items.length * 100) : 0; }
export function xpTotal(w: Workspace) { return w.rewards.reduce((sum, r) => sum + r.points, 0); }
export function level(w: Workspace) { return 1 + Math.floor(xpTotal(w) / 250); }
export function goalProgress(w: Workspace, goal: Entity) {
    if (goal.metric === "manual")
        return { completed: goal.status === "done" ? 1 : 0, target: 1 };
    const items = Object.values(w.entities).filter(e => alive(e) && (goal.metric === "project" ? e.kind === "project" && e.status === "completed" : e.kind === "activity" && e.activityKind === goal.metric && e.status === "done") && (!goal.skillIds.length || e.skillIds.some(id => goal.skillIds.includes(id))) && (!goal.roadmapId || e.roadmapId === goal.roadmapId) && (!goal.projectId || (e.kind === "project" ? e.id === goal.projectId : e.projectId === goal.projectId)));
    return { completed: items.length, target: goal.target };
}
/** Compatibility projection for the existing profile and Phase 1 interface. */
export function prototypeView(w: Workspace): PrototypeState {
    const state: PrototypeState = { schemaVersion: 1, profile: w.profile, lessonCompletion: {}, taskCompletion: {} };
    for (const e of Object.values(w.entities))
        if (e.kind === "activity" && alive(e))
            state[e.activityKind === "lesson" ? "lessonCompletion" : "taskCompletion"][e.id] = { itemId: e.id, completed: e.status === "done", completedAt: e.completedAt };
    return state;
}
