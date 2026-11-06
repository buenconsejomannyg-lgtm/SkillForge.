"use client";
import {
  ArrowUpRight,
  FileText,
  Globe,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { portfolio } from "@/lib/data";
import { PageHeader, ReadinessRow } from "@/components/feature-parts";
import { Avatar, ProfileEditor } from "@/components/profile-editor";
import { usePrototype } from "@/components/prototype-provider";
import {
  Badge,
  Card,
  EmptyState,
  FeatureStatus,
  PlannedButton,
  Tabs,
} from "@/components/ui";

function DocumentOptions() {
  return (
    <Card title="Generate documents" eyebrow="PLANNED FOR PHASE 5">
      <div className="document-options">
        <PlannedButton phase={5}>
          <FileText size={18} />
          Professional portfolio PDF
        </PlannedButton>
        <PlannedButton phase={5}>
          <FileText size={18} />
          Resume / CV
        </PlannedButton>
      </div>
      <p className="micro muted">Export is unavailable in this prototype.</p>
    </Card>
  );
}
export function Portfolio() {
  const { state } = usePrototype();
  const website = (
    <div className="portfolio-grid">
      <Card
        className="portfolio-preview-card"
        title="Website preview"
        action={<Badge tone="muted">Private sample</Badge>}
      >
        <div className="portfolio-preview">
          <div className="portfolio-preview-nav">
            <span>
              <Globe size={17} />
              {state.profile.displayName}
            </span>
            <span>ABOUT · SKILLS · PROJECTS</span>
          </div>
          <div className="portfolio-preview-body">
            <Badge tone="teal">LEARNER. BUILDER. EXPLORER.</Badge>
            <h2>
              Hi, I’m
              <br />
              <span>{state.profile.displayName}.</span>
            </h2>
            <p className="portfolio-headline">{state.profile.headline}</p>
            {state.profile.biography !== "" && (
              <p className="portfolio-biography">{state.profile.biography}</p>
            )}
            <div className="portfolio-avatar">
              <Avatar large />
            </div>
            <span className="preview-decoration">
              BUILD
              <br />
              WHAT’S
              <br />
              NEXT.
            </span>
          </div>
          <div className="private-preview">
            <LockKeyhole size={13} />
            Local preview · not published
          </div>
        </div>
        <p className="micro muted">
          Profile edits are reflected here. Showcase content is a sample.
        </p>
      </Card>
      <Card title="Portfolio builder" eyebrow="SECTION READINESS PREVIEW">
        <div className="readiness-list">
          {portfolio.sections.map((item) => (
            <ReadinessRow key={item.title} {...item} />
          ))}
        </div>
        <FeatureStatus phase={5}>Content management · Phase 5</FeatureStatus>
      </Card>
      <div className="portfolio-actions">
        <DocumentOptions />
        <Card title="Sync & publish">
          <div className="focus-content">
            <span className="feature-icon teal">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h3>Private by default</h3>
              <p>No public URL exists.</p>
            </div>
          </div>
          <PlannedButton phase={5}>
            <Globe size={15} />
            Publish portfolio
          </PlannedButton>
          <p className="micro muted">
            Future publishing requires explicit approval of selected content.
          </p>
        </Card>
      </div>
    </div>
  );
  return (
    <>
      <PageHeader
        title="Portfolio Studio"
        description="Shape your story. Showcase what you’re learning and building."
        action={
          <PlannedButton phase={5}>
            View public portfolio
            <ArrowUpRight size={14} />
          </PlannedButton>
        }
      />
      <Tabs
        items={[
          { id: "website", title: "Website", content: website },
          {
            id: "documents",
            title: "Documents (PDF)",
            content: <DocumentOptions />,
          },
          {
            id: "content",
            title: "Content Manager",
            content: (
              <EmptyState
                title="Build a story backed by your work"
                description="Portfolio content, project showcases, and certificate records will be managed here in Phase 5. Uploading a certificate will not independently verify it."
                phase={5}
              />
            ),
          },
          {
            id: "settings",
            title: "Settings",
            content: (
              <Card title="Profile & privacy">
                <p className="muted">
                  Basic profile editing works locally. The portfolio remains a
                  private sample preview.
                </p>
                <ProfileEditor />
                <div className="section-divider" />
                <FeatureStatus phase={5}>
                  Publishing and privacy controls · Phase 5
                </FeatureStatus>
              </Card>
            ),
          },
        ]}
      />
    </>
  );
}
