"use client";
import { useState } from "react";
import { project as sample } from "@/lib/data";
import { newEntity, records } from "@/lib/workspace";
import { usePrototype } from "@/components/prototype-provider";
import { PageHeader } from "@/components/feature-parts";
import { Card, Tabs } from "@/components/ui";
import { ArchiveTrash, EntityEditor, EntityManager, EntityRow, Field } from "@/components/workspace-ui";
export function Projects() {
    const { workspace, command } = usePrototype();
    const [selected, setSelected] = useState("");
    const [notice, setNotice] = useState("");
    const projects = records(workspace, "project");
    const project = projects.find(p => p.id === selected) || projects[0];
    return <><PageHeader title="Project Center" description="Turn learning into practical work and record what you build." action={<EntityEditor kind="project" onSaved={e => setSelected(e.id)}/>}/><Tabs items={[
            { id: "projects", title: "My Projects", content: <><Field label="Choose project"><select value={project?.id || ""} onChange={e => setSelected(e.target.value)}>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></Field>{project ? <><Card title={project.title}><EntityRow entity={project}/></Card><EntityManager kind="milestone" title="Project milestones" filter={e => e.projectId === project.id} seed={{ projectId: project.id }} reorder/><EntityManager kind="activity" title="Project tasks" filter={e => e.projectId === project.id && e.activityKind === "task"} seed={{ projectId: project.id, skillIds: project.skillIds, activityKind: "task" }}/><EntityManager kind="evidence" title="Project references & evidence" filter={e => e.projectId === project.id} seed={{ projectId: project.id, skillIds: project.skillIds }}/></> : <Card title="Build your first project"><p>Create a project or adopt the sample as a fresh draft. Completed projects can be selected for a future portfolio; publishing remains Phase 5.</p></Card>}</> },
            { id: "tasks", title: "Tasks & Timeline", content: <EntityManager kind="activity" title="Shared tasks & learning activities"/> },
            { id: "manage", title: "Manage projects", content: <EntityManager kind="project" title="Projects"/> },
            { id: "samples", title: "Starter sample", content: <Card title={sample.title}><p>{sample.description}</p><p className="micro muted">Demonstration only. Adoption creates incomplete tasks without sample dates, progress, XP, or achievements.</p><button className="button secondary" onClick={async () => { const id = crypto.randomUUID(); const entities = [newEntity("project", { id, title: sample.title, description: sample.description }), ...sample.tasks.map(t => newEntity("activity", { title: t.title, projectId: id, activityKind: "task" }))]; const r = await command({ type: "create-many", entities }); if (r.status !== "saved") {
                    setNotice(r.message || "Not saved.");
                    return;
                } setSelected(id); setNotice("Sample adopted as an incomplete draft."); }}>Use sample</button><p role="status">{notice}</p></Card> },
            { id: "archive", title: "Archive & trash", content: <ArchiveTrash /> },
        ]}/></>;
}
