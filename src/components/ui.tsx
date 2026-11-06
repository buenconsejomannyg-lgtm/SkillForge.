"use client";
import type { ReactNode } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUpRight, Clock3, X } from "lucide-react";

export function Card({
  children,
  className = "",
  title,
  eyebrow,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || eyebrow || action) && (
        <div className="card-heading">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: "purple" | "teal" | "gold" | "muted";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function FeatureStatus({
  phase,
  children,
}: {
  phase: number;
  children?: ReactNode;
}) {
  return (
    <span className="feature-status">
      <Clock3 size={12} />
      {children || `Planned · Phase ${phase}`}
    </span>
  );
}
export function ProgressBar({
  value,
  label,
  tone = "purple",
}: {
  value: number;
  label: string;
  tone?: "purple" | "teal";
}) {
  return (
    <div
      className={`progress-track ${tone}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function ScoreRing({
  value,
  label,
  tone = "purple",
}: {
  value: number;
  label: string;
  tone?: "purple" | "teal";
}) {
  const circumference = 2 * Math.PI * 48;
  return (
    <div
      className={`score-ring ${tone}`}
      role="img"
      aria-label={`${label}: ${value}%`}
    >
      <svg viewBox="0 0 116 116" aria-hidden="true">
        <circle className="ring-track" cx="58" cy="58" r="48" />
        <circle
          className="ring-fill"
          cx="58"
          cy="58"
          r="48"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <strong>
        {value}
        <small>%</small>
      </strong>
    </div>
  );
}
export function ChecklistItem({
  title,
  detail,
  checked,
  onChange,
}: {
  title: string;
  detail?: string;
  checked: boolean;
  onChange(): void;
}) {
  return (
    <label className={`checklist-item ${checked ? "complete" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>
        <span>{title}</span>
        {detail && <small>{detail}</small>}
      </span>
    </label>
  );
}
export function Tabs({
  items,
  defaultValue,
}: {
  items: { id: string; title: string; content: ReactNode }[];
  defaultValue?: string;
}) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue || items[0].id}
      className="tabs-root"
    >
      <TabsPrimitive.List className="tabs" aria-label="Section views">
        {items.map((item) => (
          <TabsPrimitive.Trigger className="tab" key={item.id} value={item.id}>
            {item.title}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          key={item.id}
          value={item.id}
          className="tab-content"
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className="dialog-content" onOpenAutoFocus={(event) => {
          const firstField = (event.target as HTMLElement).querySelector<HTMLElement>('input:not([type="file"]), textarea');
          if (firstField) { event.preventDefault(); firstField.focus(); }
        }}>
          <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description>
            {description}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            className="icon-button dialog-close"
            aria-label="Close dialog"
          >
            <X size={18} />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function EmptyState({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <Card className="empty-state">
      <span className="empty-symbol">
        <ArrowUpRight size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <FeatureStatus phase={phase} />
    </Card>
  );
}
export function PlannedButton({
  children,
  phase,
}: {
  children: ReactNode;
  phase: number;
}) {
  return (
    <button className="button secondary" disabled>
      {children}
      <small>Phase {phase}</small>
    </button>
  );
}
