"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, BrainCircuit, Sparkles, Star, } from "lucide-react";
import { usePrototype } from "@/components/prototype-provider";
import { Avatar, ProfileEditor } from "@/components/profile-editor";
import { ActiveFocus, DiagnosticResults, LearningCounts, PageHeader, WeeklyTasks, } from "@/components/feature-parts";
import { Badge, Card, ProgressBar, ScoreRing } from "@/components/ui";
import { baseline, } from "@/lib/data";
import { ActivityAnalytics, History, ProgressionPanel, WorkspaceBackup } from "@/components/workspace-ui";
import { level, percentage, records, xpTotal } from "@/lib/workspace";
import { diagnosticPercent } from "@/lib/progress";
export function Dashboard() {
    const { state, workspace } = usePrototype();
    const skills = records(workspace, "skill").map(s => ({ id: s.id, name: s.title, selfReportedLabel: records(workspace, "rating").filter(r => r.skillIds.includes(s.id)).at(-1)?.rating || "Not rated" }));
    const progress = { lessonPercent: percentage(records(workspace, "activity").filter(e => e.roadmapId === "prompt-engineering-16" && e.activityKind !== "task")) };
    return (<div className="dashboard-page">
      <PageHeader title={`Welcome back, ${state.profile.displayName}!`} description="Learn. Build. Grow — one activity at a time." label="EVERY STEP BUILDS YOUR NEXT LEVEL" action={<ProfileEditor />}/>
      <div className="dashboard-top">
        <Card className="profile-hero">
          <div className="profile-avatar">
            <Avatar large/>
            <span className="level-pill">
              <Star size={13}/>
              Lv. {level(workspace)}
            </span>
            <small>Activity level</small>
          </div>
          <div className="profile-hero-content">
            <Badge tone="teal">
              <Sparkles size={11}/>
              Your learning journey
            </Badge>
            <h2>{state.profile.displayName}</h2>
            <p className="profile-headline">{state.profile.headline}</p>
            <p className="profile-bio">{state.profile.biography}</p>
            <div className="xp-line">
              <span>
                <Star size={12}/>
                {xpTotal(workspace)} XP
              </span>
              <small>Activity XP · no retroactive awards</small>
            </div>
            <p className="micro muted progression-note">
              XP progression is separate from diagnostic scores and verified
              proficiency. Rewards follow approved Phase 2 rules.
            </p>
          </div>
        </Card>
        <Card title="Learning progress" eyebrow="PROMPT ENGINEERING · 16-WEEK ROADMAP" className="dashboard-learning">
          <div className="overall-content">
            <ScoreRing value={progress.lessonPercent} label="Overall roadmap lesson completion" tone="teal"/>
          </div>
          <LearningCounts />
        </Card>
      </div>
      <DiagnosticResults />
      <WeeklyTasks />
      <div className="dashboard-middle">
        <Card title="Skill overview" eyebrow="DIAGNOSTIC & SELF-REPORTED INDICATORS" action={<Link href="/skills" className="text-link">
              View all
              <ArrowRight size={14}/>
            </Link>}>
          <div className="skill-overview">
            {skills.map((skill) => (<div className="overview-row" key={skill.id}>
                <span className="small-feature-icon">
                  {skill.id === "ai" ? (<BrainCircuit size={18}/>) : (<BookOpen size={18}/>)}
                </span>
                <div>
                  <strong>{skill.name}</strong>
                  <small>
                    {skill.id === "ai"
                ? `Informal overall diagnostic · ${baseline.overall.earned}/${baseline.overall.maximum} · not independently verified`
                : `Self-reported · ${skill.selfReportedLabel}`}
                  </small>
                  {skill.id === "ai" && (<ProgressBar value={diagnosticPercent(baseline.overall)} label="AI informal overall diagnostic indicator"/>)}
                </div>
                <Badge tone={skill.id === "ai" ? "gold" : "muted"}>
                  {skill.id === "ai"
                ? `${baseline.classification} — Provisional`
                : skill.selfReportedLabel}
                </Badge>
              </div>))}
          </div>
        </Card>
        <ActiveFocus />
      </div>
      <ProgressionPanel />
      <ActivityAnalytics />
      <History />
      <WorkspaceBackup />
    </div>);
}
