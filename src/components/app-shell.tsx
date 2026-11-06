"use client";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  FolderKanban,
  House,
  Menu,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { usePrototype } from "./prototype-provider";
import { Avatar, ProfileEditor } from "./profile-editor";
import { Dialog } from "./ui";
import { WorkspaceBackup } from "./workspace-ui";
import { DiagnosticMetrics } from "./feature-parts";

export const navigation = [
  { href: "/dashboard", title: "Dashboard", icon: House },
  { href: "/skills", title: "Skill Profile", icon: UserRound },
  { href: "/learning", title: "Learning Center", icon: BookOpen },
  { href: "/assessments", title: "Assessment Center", icon: ShieldCheck },
  { href: "/projects", title: "Project Center", icon: FolderKanban },
  { href: "/portfolio", title: "Portfolio Studio", icon: BriefcaseBusiness },
];
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <LayersLogo />
      </span>
      <span>
        SkillForge<small>BUILD YOUR NEXT LEVEL</small>
      </span>
    </span>
  );
}
function LayersLogo() {
  return (
    <svg viewBox="0 0 36 40" fill="none" aria-hidden="true">
      <path
        d="m18 2 15 8v20l-15 8L3 30V10L18 2Z"
        stroke="#ac71ff"
        strokeWidth="3"
      />
      <path
        d="m26 14-8-4-9 5 18 10-9 5-8-4M9 15v7m18-4v7"
        stroke="#5ae4d5"
        strokeWidth="3"
      />
    </svg>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const { ready, error, retry, reset, captureReset, recovered } =
    usePrototype();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetNotice, setResetNotice] = useState("");
  const [resetBase, setResetBase] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const mobileMenuRef = useRef<HTMLButtonElement>(null);
  const helpFromMobileRef = useRef(false);
  function openReset() {
    setResetBase(captureReset());
    setResetOpen(true);
  }
  const title =
    navigation.find((n) => pathname.startsWith(n.href))?.title || "Dashboard";
  function links(close?: () => void) {
    return (
      <nav aria-label="Main navigation">
        {navigation.map(({ href, title, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            onClick={close}
            className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
            aria-current={pathname.startsWith(href) ? "page" : undefined}
          >
            <Icon size={18} />
            {title}
            {pathname.startsWith(href) && (
              <ChevronRight size={14} className="nav-arrow" />
            )}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href="/dashboard" aria-label="SkillForge dashboard">
          <Brand />
        </Link>
        <p className="nav-caption">YOUR WORKSPACE</p>
        {links()}
        <div className="sidebar-bottom">
          <span className="sidebar-divider" />
          <button className="nav-link" onClick={() => setSettingsOpen(true)}>
            <Settings size={17} />
            Settings
          </button>
          <button className="nav-link" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={17} />
            Help & prototype info
          </button>
          <div className="sidebar-mountains" />
          <div className="sidebar-version">
            <span className="status-dot" />
            Phase 2 · Local workspace
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <DialogPrimitive.Root
              open={mobileOpen}
              onOpenChange={setMobileOpen}
            >
              <DialogPrimitive.Trigger
                ref={mobileMenuRef}
                className="icon-button mobile-menu"
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </DialogPrimitive.Trigger>
              <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="dialog-overlay" />
                <DialogPrimitive.Content
                  className="mobile-drawer"
                  onCloseAutoFocus={(event) => {
                    if (helpFromMobileRef.current) event.preventDefault();
                  }}
                >
                  <DialogPrimitive.Title className="sr-only">
                    Navigation
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    Choose a SkillForge page.
                  </DialogPrimitive.Description>
                  <Brand />
                  <DialogPrimitive.Close
                    className="icon-button dialog-close"
                    aria-label="Close navigation"
                  >
                    <X size={20} />
                  </DialogPrimitive.Close>
                  {links(() => setMobileOpen(false))}
                  <div className="section-divider" />
                  <button
                    className="nav-link"
                    onClick={() => {
                      helpFromMobileRef.current = true;
                      setMobileOpen(false);
                      setHelpOpen(true);
                    }}
                  >
                    <CircleHelp size={17} />
                    Help & prototype info
                  </button>
                </DialogPrimitive.Content>
              </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
            <span className="breadcrumb">
              Workspace <ChevronRight size={14} /> <strong>{title}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="prototype-chip">
              <span className="status-dot" />
              LOCAL PROTOTYPE
            </span>
            {ready && <Avatar />}
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="prototype-notice">
            <FlaskConical size={16} />
            <p>
              <strong>Phase 2 workspace.</strong> Temporary local persistence for
              non-confidential prototype data only. No accounts, secure storage,
              automatic backup, or device sync.
            </p>
            <button onClick={() => setHelpOpen(true)}>Details</button>
          </div>
          {error && (
            <div role="alert" className="storage-error">
              <div>
                <strong>Storage needs attention</strong>
                <p>{error}</p>
              </div>
              <button className="button secondary small" onClick={retry}>
                {recovered ? "Retry loading" : "Retry saving"}
              </button>
              <button className="button secondary small" onClick={openReset}>
                Reset prototype
              </button>
            </div>
          )}
          {resetNotice && (
            <p role="status" className="reset-notice">
              {resetNotice}
            </p>
          )}
          {ready ? (
            children
          ) : (
            <div className="loading-state" role="status">
              <Sparkles size={28} />
              <p>Preparing your workspace…</p>
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            SkillForge <span className="muted">/</span> Learn. Build. Grow.
          </span>
          <button onClick={openReset}>
            <RotateCcw size={13} />
            Reset prototype
          </button>
        </footer>
      </div>
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset this prototype?"
        description="This clears your local workspace, profile edits, learning progress, and session avatar. All Phase 2 records and rewards are reset. A recovery backup is created first."
      >
        <div className="dialog-actions">
          <button
            className="button danger"
            disabled={resetting}
            onClick={async () => {
              setResetting(true);
              const result = await reset(resetBase);
              setResetting(false);
              setResetOpen(false);
              setResetNotice(
                result.status === "saved"
                  ? "Prototype reset and saved in this browser."
                  : result.status === "conflict"
                    ? result.message ||
                      "Reset canceled because saved data changed."
                    : "Reset was not saved. Existing records have not been discarded.",
              );
            }}
          >
            {resetting ? "Resetting…" : "Reset prototype"}
          </button>
          <button
            className="button secondary"
            disabled={resetting}
            onClick={() => setResetOpen(false)}
          >
            Keep my changes
          </button>
        </div>
      </Dialog>
      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (!open && helpFromMobileRef.current) {
            helpFromMobileRef.current = false;
            requestAnimationFrame(() => mobileMenuRef.current?.focus());
          }
        }}
        title="About this prototype"
        description="A local, interactive preview of the approved SkillForge design."
      >
        <div className="prose">
          <p>
            <strong>Working:</strong> navigation, tabs, profile editing, session
            image preview, roadmap browsing, lesson and weekly-task checklists,
            skills, custom roadmaps, tasks, projects, goals, links/notes, XP, achievements, analytics, and recoverable trash.
          </p>
          <p>
            <strong>Sample preview:</strong> illustrative competency bars,
            optional starter projects, and portfolio content. Progression starts at Level 1 and 0
            XP. Approved Phase 2 rewards apply only to newly recorded eligible work.
          </p>
          <p>
            <strong>Planned:</strong> Phase 2 core management works locally; Phase 3 adds
            cloud accounts; Phase 4 adds evidence-based assessment; Phase 5 adds
            publishing and documents.
          </p>
          <p>
            Local storage is temporary and browser-specific. Do not enter
            confidential information. Clearing browser data may remove your
            edits.
          </p>
          <p>
            Your informal AI competency diagnostic is Intermediate —
            Provisional. It is not independently verified proficiency or a
            professional qualification. XP does not measure proficiency.
          </p>
          <DiagnosticMetrics />
          <WorkspaceBackup />
        </div>
      </Dialog>
      <Dialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Workspace settings"
        description="Basic profile editing works locally. Cloud account settings are planned for Phase 3."
      >
        <div className="prose">
          <p>Dark theme · English · browser-local prototype</p>
          <ProfileEditor />
          <p>
            Profile changes remain on this device. Avatar previews last only for
            this session.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
