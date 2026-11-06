"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Circle, Layers3, ShieldCheck } from "lucide-react";
import { competencies, competencyBaselines, baseline, } from "@/lib/data";
import { percentage, records } from "@/lib/workspace";
import { usePrototype } from "./prototype-provider";
import { diagnosticPercent, formatPercent, } from "@/lib/progress";
import { Badge, Card, ChecklistItem, ProgressBar, ScoreRing } from "./ui";
export function PageHeader({ title, description, action, label = "YOUR GROWTH WORKSPACE", }: {
    title: string;
    description: string;
    action?: ReactNode;
    label?: string;
}) {
    return (<header className="page-header">
      <div className="page-heading">
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </header>);
}
export function CompetencyBreakdown() {
    return (<div className="competency-list">
      {competencies.map((item, i) => (<div className="competency-row" key={item.id}>
          <span>{item.name}</span>
          <ProgressBar value={competencyBaselines[i].score} label={`${item.name} provisional sample knowledge`} tone={i < 3 || i === 5 ? "teal" : "purple"}/>
          <small>{competencyBaselines[i].score}%</small>
        </div>))}
      <p className="micro muted">
        Illustrative design samples only · not a breakdown of your informal
        diagnostic
      </p>
    </div>);
}
export function BaselineSummary({ compact = false }: {
    compact?: boolean;
}) {
    return (<div className={`baseline-summary ${compact ? "compact" : ""}`}>
      <ScoreRing value={diagnosticPercent(baseline.overall)} label="Overall informal diagnostic score"/>
      <div>
        <Badge tone="gold">{baseline.classification} — Provisional</Badge>
        <h3>Informal AI competency diagnostic</h3>
        <DiagnosticMetrics />
        <p>
          User-provided results · not independently verified proficiency or a
          professional qualification.
        </p>
      </div>
    </div>);
}
export function AssessmentStatus() {
    return (<div className="assessment-status">
      <div>
        <span className="status-icon">
          <ShieldCheck size={16}/>
        </span>
        <span>
          Independently verified proficiency<strong>Not verified</strong>
        </span>
      </div>
      <div>
        <span className="status-icon">
          <ShieldCheck size={16}/>
        </span>
        <span>
          Assessment status<strong>Informal · Provisional</strong>
        </span>
      </div>
    </div>);
}
export function DiagnosticMetrics() {
    return (<dl className="diagnostic-metrics">
      {([
            ["Knowledge Assessment", baseline.knowledge],
            ["Practical Assessment", baseline.practical],
            ["Overall Diagnostic Score", baseline.overall],
        ] as const).map(([label, score]) => (<div key={label}>
          <dt>{label}</dt>
          <dd>
            <strong>
              {score.earned}/{score.maximum}
            </strong>{" "}
            <span>({formatPercent(diagnosticPercent(score))})</span>
          </dd>
        </div>))}
    </dl>);
}
export function DiagnosticResults() {
    return (<section className="dashboard-diagnostic card" aria-label="Informal diagnostic results">
      <div className="card-heading">
        <h2>Informal AI competency diagnostic</h2>
        <Badge tone="gold">{baseline.classification} — Provisional</Badge>
      </div>
      <DiagnosticMetrics />
      <p className="micro muted">
        User-provided, provisional results. Independently verified proficiency:{" "}
        <strong>Not verified</strong>. XP is separate.
      </p>
    </section>);
}
export function RoadmapProgress() {
    const { workspace } = usePrototype();
    const list = records(workspace, "activity").filter(e => e.roadmapId === "prompt-engineering-16" && e.activityKind !== "task");
    const value = percentage(list);
    return <div className="roadmap-progress"><div><span>Roadmap completion</span><strong>{value}%</strong></div><ProgressBar value={value} label="Roadmap completion"/><small>{list.length ? list.filter(e => e.status === "done").length + "/" + list.length + " lessons and assignments complete" : "No activities"}</small></div>;
}
export function LearningCounts() {
    const { workspace } = usePrototype();
    const lessons = records(workspace, "activity").filter(e => e.roadmapId === "prompt-engineering-16" && e.activityKind === "lesson");
    const assignments = records(workspace, "activity").filter(e => e.roadmapId === "prompt-engineering-16" && e.activityKind === "assignment");
    const weeks = records(workspace, "week").filter(e => e.roadmapId === "prompt-engineering-16");
    const tasks = records(workspace, "activity").filter(e => e.activityKind === "task");
    const done = (items: typeof lessons) => items.filter(e => e.status === "done").length;
    const weekCount = weeks.filter(w => { const items = [...lessons, ...assignments].filter(e => e.weekId === w.id); return items.length && done(items) === items.length; }).length;
    return <><dl className="learning-counts"><div><dt>Weeks complete</dt><dd>{weekCount}/{weeks.length}</dd></div><div><dt>Lessons complete</dt><dd>{done(lessons)}/{lessons.length}</dd></div><div><dt>Weekly tasks</dt><dd>{done(tasks)}/{tasks.length}</dd></div><div><dt>Completed activities</dt><dd>{records(workspace, "activity").filter(e => e.status === "done").length}</dd></div></dl><p className="micro muted week-explanation">Weeks, lessons, assignments, and tasks are separate. A week is complete when all its assigned lessons and assignments are complete.</p></>;
}
export function WeeklyTasks() {
    const { workspace, state, toggle } = usePrototype();
    const tasks = records(workspace, "activity").filter(e => e.activityKind === "task" && !e.projectId);
    const value = percentage(tasks);
    return <Card title="Weekly tasks" eyebrow="SMALL STEPS, REAL MOMENTUM" action={<Badge tone="teal">{value}% complete</Badge>}><div className="weekly-tasks">{tasks.map(task => <div className="task-tile" key={task.id}><span className="task-kind">{task.priority} priority</span><ChecklistItem title={task.title} detail={task.description} checked={Boolean(state.taskCompletion[task.id]?.completed)} onChange={() => toggle("taskCompletion", task.id)}/></div>)}</div><p className="micro muted">{tasks.filter(e => e.status === "done").length}/{tasks.length} activities complete. Weekly tasks are not assigned to weeks unless explicitly linked. Manage them in Learning Center or Project Center.</p></Card>;
}
export function ActiveFocus() {
    const { workspace } = usePrototype();
    const next = records(workspace, "activity").find(e => e.roadmapId === "prompt-engineering-16" && e.activityKind !== "task" && e.status !== "done");
    return <Card title="Active focus" eyebrow="KEEP MOVING FORWARD"><div className="focus-content"><span className="feature-icon"><Layers3 size={25}/></span><div><h3>{next?.title || "A roadmap well explored"}</h3><p>{next ? (workspace.entities[next.weekId]?.title || "Unscheduled") + " · suggested next activity" : "All current learning activities marked complete"}</p></div></div><RoadmapProgress /><Link className="text-link" href="/learning">{next ? "Continue learning" : "Review roadmap"}<ArrowRight size={15}/></Link></Card>;
}
export function ReadinessRow({ title, ready, }: {
    title: string;
    ready: boolean;
}) {
    return (<div className="readiness-row">
      <span className={ready ? "ready-check" : "pending-check"}>
        {ready ? <Check size={13}/> : <Circle size={12}/>}
      </span>
      <span>{title}</span>
      <small>{ready ? "Sample ready" : "Sample missing"}</small>
    </div>);
}
