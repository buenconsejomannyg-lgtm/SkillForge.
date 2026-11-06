"use client";
import {
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { baseline } from "@/lib/data";
import {
  AssessmentStatus,
  BaselineSummary,
  CompetencyBreakdown,
  PageHeader,
} from "@/components/feature-parts";
import {
  Badge,
  Card,
  EmptyState,
  FeatureStatus,
  PlannedButton,
  Tabs,
} from "@/components/ui";

function SourceStatus() {
  return (
    <Card title="Reference & basis" eyebrow="TRANSPARENT PROVENANCE">
      <dl className="source-details">
        <div>
          <dt>Source</dt>
          <dd>{baseline.sourceLabel}</dd>
        </div>
        <div>
          <dt>Assessment version</dt>
          <dd>Unavailable</dd>
        </div>
        <div>
          <dt>Rubric / framework</dt>
          <dd>Not supplied or approved</dd>
        </div>
        <div>
          <dt>Assessment date</dt>
          <dd>Unavailable</dd>
        </div>
        <div>
          <dt>Verification</dt>
          <dd>Not independently verified · informal diagnostic</dd>
        </div>
      </dl>
      <p className="micro muted">
        No external accreditation or AI-generated certification is claimed.
      </p>
    </Card>
  );
}
export function Assessments() {
  const overview = (
    <>
      <div className="assessment-top">
        <Card title="Assessment overview" eyebrow="KNOWLEDGE ≠ OVERALL ABILITY">
          <BaselineSummary />
          <AssessmentStatus />
        </Card>
        <Card title="Assessment modes" eyebrow="ENGINE PLANNED FOR PHASE 4">
          <div className="assessment-modes">
            {[
              {
                title: "Practice mode",
                icon: BookOpen,
                text: "Explore concepts and learn from explanations.",
                button: "Start practice",
                tone: "teal",
              },
              {
                title: "Knowledge diagnostic",
                icon: FlaskConical,
                text: "Measure understanding with reviewed questions.",
                button: "Take diagnostic",
                tone: "purple",
              },
              {
                title: "Practical assessment",
                icon: Trophy,
                text: "Demonstrate ability through evidence and rubrics.",
                button: "Submit evidence",
                tone: "gold",
              },
            ].map(({ title, icon: Icon, text, button, tone }) => (
              <div className={`mode-card ${tone}`} key={title}>
                <Icon size={26} />
                <h3>{title}</h3>
                <p>{text}</p>
                <PlannedButton phase={4}>{button}</PlannedButton>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="assessment-bottom">
        <Card
          title="Illustrative competency indicators"
          eyebrow="DESIGN SAMPLES · NOT DIAGNOSTIC SUBSCORES"
        >
          <CompetencyBreakdown />
        </Card>
        <SourceStatus />
      </div>
      <div className="evidence-callout">
        <ShieldCheck size={23} />
        <p>
          <strong>Evidence before expertise.</strong> Advanced and Expert
          proficiency will require appropriate practical evidence. XP and
          knowledge scores alone cannot establish overall skill proficiency.
        </p>
      </div>
    </>
  );
  return (
    <>
      <PageHeader
        title="Assessment Center"
        description="Understand what you know. Build evidence of what you can do."
        action={<Badge tone="gold">Interface preview · Phase 1</Badge>}
      />
      <Tabs
        items={[
          { id: "overview", title: "Overview", content: overview },
          {
            id: "take",
            title: "Take Assessment",
            content: (
              <EmptyState
                title="Assessments are not running yet"
                description="Knowledge assessments, practical rubrics, and provisional evaluations will be implemented in Phase 4 after frameworks and scoring rules are reviewed."
                phase={4}
              />
            ),
          },
          {
            id: "history",
            title: "Assessment History",
            content: (
              <EmptyState
                title="Diagnostic history"
                description="Your informal diagnostic results appear in Overview. No in-app assessment attempts have been recorded. Versioned results and evidence history arrive in Phase 4."
                phase={4}
              />
            ),
          },
          {
            id: "sources",
            title: "Standards & Sources",
            content: (
              <>
                <SourceStatus />
                <Card title="Future assessment records">
                  <div className="focus-content">
                    <ClipboardCheck size={25} />
                    <p className="muted">
                      Reviewed frameworks, blueprints, sources, question
                      versions, rubric versions, evidence, and evaluation
                      provenance will be recorded separately from XP.
                    </p>
                  </div>
                  <FeatureStatus phase={4} />
                </Card>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
