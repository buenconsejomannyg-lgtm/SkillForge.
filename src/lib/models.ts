import { z } from "zod";

export const profileSchema = z
  .object({
    id: z.literal("local-profile"),
    displayName: z
      .string()
      .trim()
      .min(1, "Enter a display name.")
      .max(60, "Use 60 characters or fewer."),
    headline: z
      .string()
      .trim()
      .min(1, "Enter a headline.")
      .max(100, "Use 100 characters or fewer."),
    biography: z.string().trim().max(600, "Use 600 characters or fewer."),
  })
  .strict();
export type PrototypeProfile = z.infer<typeof profileSchema>;
export const checklistSchema = z
  .object({
    itemId: z.string(),
    completed: z.boolean(),
    completedAt: z.iso.datetime().nullable(),
  })
  .strict()
  .refine(
    (v) => v.completed === (v.completedAt !== null),
    "Completion and timestamp must agree.",
  );
export type ChecklistState = z.infer<typeof checklistSchema>;
export const prototypeSchema = z
  .object({
    schemaVersion: z.literal(1),
    profile: profileSchema,
    lessonCompletion: z.record(z.string(), checklistSchema),
    taskCompletion: z.record(z.string(), checklistSchema),
  })
  .strict();
export type PrototypeState = z.infer<typeof prototypeSchema>;
export type SkillSummary = {
  id: string;
  name: string;
  description: string;
  reportingBasis: "informal-diagnostic" | "self-reported-sample";
  competencyIds: string[];
  selfReportedLabel?: string;
};
export type CompetencyDefinition = {
  id: string;
  skillId: string;
  name: string;
  description: string;
  referenceIds: string[];
};
export type AssessmentBaseline = {
  id: string;
  skillId: string;
  knowledge: { earned: number; maximum: number };
  practical: { earned: number; maximum: number };
  overall: { earned: number; maximum: number };
  classification: "Intermediate";
  nature: "informal";
  status: "provisional";
  independentlyVerified: false;
  sourceLabel: string;
  assessmentVersion: string | null;
  rubricReference: string | null;
  recordedAt: string | null;
};
export type CompetencyBaseline = {
  competencyId: string;
  score: number;
  provenanceLabel: string;
};
export type Lesson = {
  id: string;
  title: string;
  week: number;
  resourceReferences: string[];
};
export type RoadmapPhase = {
  id: string;
  title: string;
  startWeek: number;
  endWeek: number;
  lessons: Lesson[];
};
export type Roadmap = {
  id: string;
  title: string;
  targetSkillId: string;
  templateVersion: number;
  description: string;
  phases: RoadmapPhase[];
};
export type ProjectPreview = {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  tasks: { id: string; title: string; completed: boolean }[];
  dates: { started: string; target: string };
  previewProgress: number;
};
export type PortfolioPreview = {
  biography: string;
  selectedProjectIds: string[];
  sections: { title: string; ready: boolean }[];
};
