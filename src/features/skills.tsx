"use client";
import { useState } from "react";
import { skills as samples } from "@/lib/data";
import { active, newEntity, records } from "@/lib/workspace";
import { usePrototype } from "@/components/prototype-provider";
import { AssessmentStatus, BaselineSummary, CompetencyBreakdown, PageHeader } from "@/components/feature-parts";
import { Badge, Card, Tabs } from "@/components/ui";
import { ArchiveTrash, EntityEditor, EntityManager, EntityRow, History } from "@/components/workspace-ui";
export function Skills() {
    const { workspace, command } = usePrototype();
    const [selected, setSelected] = useState("ai");
    const [notice, setNotice] = useState("");
    const list = records(workspace, "skill");
    const skill = list.find(s => s.id === selected) || list[0];
    return <><PageHeader title="Skill Profile" description="Build skills, record evidence, and track your development." action={<EntityEditor kind="skill" onSaved={e => setSelected(e.id)}/>}/>
 <div className="skills-layout"><Card title="My skills" className="skill-picker"><div className="skill-buttons" role="group" aria-label="Select a skill">{list.map(s => <button key={s.id} className={`skill-select ${skill?.id === s.id ? "selected" : ""}`} aria-pressed={skill?.id === s.id} onClick={() => setSelected(s.id)}><span><strong>{s.title}</strong><small>{s.id === "ai" ? "Informal diagnostic · Provisional" : "Personal development · self-reported"}</small></span></button>)}</div><EntityEditor kind="skill" onSaved={e => setSelected(e.id)}/></Card>
 <div className="skill-detail">{skill ? <><Card><EntityRow entity={skill}/></Card><Tabs key={skill.id} items={[
                { id: "overview", title: "Overview", content: <><div className="skill-metrics"><Card title={skill.id === "ai" ? "Informal diagnostic results" : "Self-reported proficiency"}>{skill.id === "ai" ? <><BaselineSummary compact/><AssessmentStatus /></> : <><Badge tone="muted">No assessed qualification</Badge><p>Self-ratings are personal estimates. Advanced or Expert self-ratings do not establish verified proficiency.</p></>}</Card><Card title="Competency indicators" eyebrow="ILLUSTRATIVE DESIGN SAMPLES">{skill.id === "ai" ? <CompetencyBreakdown /> : <p>No assessed competency scores recorded.</p>}</Card></div><EntityManager kind="goal" title="Development goals" filter={e => e.skillIds.includes(skill.id)} seed={{ skillIds: [skill.id] }}/></> },
                { id: "competencies", title: "Competencies", content: <EntityManager kind="competency" title="Competencies & subskills" filter={e => e.skillIds.includes(skill.id)} seed={{ skillIds: [skill.id] }}/> },
                { id: "ratings", title: "Self-ratings", content: <EntityManager kind="rating" title="Self-reported rating history" filter={e => e.skillIds.includes(skill.id)} seed={{ skillIds: [skill.id] }}/> },
                { id: "evidence", title: "Evidence", content: <EntityManager kind="evidence" title="Supporting evidence · unverified" filter={e => e.skillIds.includes(skill.id)} seed={{ skillIds: [skill.id] }}/> },
                { id: "progress", title: "Progress", content: <History skillId={skill.id}/> },
            ]}/></> : <Card title="Start your skill collection"><p>Add a skill or restore one from the archive.</p></Card>}</div></div>
 <Tabs items={[{ id: "categories", title: "Categories", content: <EntityManager kind="category" title="Skill & task categories"/> }, { id: "samples", title: "Starter samples", content: <Card title="Optional starter skills"><p className="muted">Adopting a sample creates an unrated draft. Sample ratings and progress are not imported.</p>{samples.filter(s => !["ai", "prompting"].includes(s.id)).map(s => <article className="workspace-record" key={s.id}><h3>{s.name}</h3><p>{s.description}</p><button className="button secondary small" disabled={Object.values(workspace.entities).some(e => e.kind === "skill" && active(e) && e.title === s.name)} onClick={async () => { const e = newEntity("skill", { title: s.name, description: s.description }); const r = await command({ type: "put", entity: e, base: null }); setNotice(r.status === "saved" ? "Sample adopted as an unrated draft." : r.message || "Not saved."); if (r.status === "saved")
                setSelected(e.id); }}>Use sample</button></article>)}<p role="status">{notice}</p></Card> }, { id: "archive", title: "Archive & trash", content: <ArchiveTrash /> }]}/>
 </>;
}
