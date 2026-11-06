import type {
  AssessmentBaseline,
  CompetencyBaseline,
  CompetencyDefinition,
  PortfolioPreview,
  ProjectPreview,
  PrototypeState,
  Roadmap,
  SkillSummary,
} from "./models";

export const competencies: CompetencyDefinition[] = [
  ["fundamentals", "AI Fundamentals"],
  ["prompting", "Prompt Engineering"],
  ["context", "Context Engineering"],
  ["evaluation", "AI Evaluation"],
  ["workflow", "Workflow Design"],
  ["responsible", "Responsible AI"],
].map(([id, name]) => ({
  id,
  name,
  skillId: "ai",
  description: `Understanding of ${name.toLowerCase()}.`,
  referenceIds: [],
}));
export const competencyBaselines: CompetencyBaseline[] = [
  90, 85, 78, 53, 47, 80,
].map((score, i) => ({
  competencyId: competencies[i].id,
  score,
  provenanceLabel: "Approved design · provisional knowledge sample",
}));
export const skills: SkillSummary[] = [
  {
    id: "ai",
    name: "Artificial Intelligence",
    description: "Knowledge, skills, and application of AI tools and concepts.",
    reportingBasis: "informal-diagnostic",
    competencyIds: competencies.map((c) => c.id),
  },
  {
    id: "prompting",
    name: "Prompt Engineering",
    description:
      "Design clear instructions, supply context, and evaluate useful responses.",
    reportingBasis: "self-reported-sample",
    competencyIds: [],
    selfReportedLabel: "Intermediate",
  },
  {
    id: "writing",
    name: "Research & Academic Writing",
    description:
      "Develop clear, well-supported research and academic communication.",
    reportingBasis: "self-reported-sample",
    competencyIds: [],
    selfReportedLabel: "Developing",
  },
  {
    id: "video",
    name: "Video Editing",
    description:
      "Shape stories through editing, sound, pacing, and visual composition.",
    reportingBasis: "self-reported-sample",
    competencyIds: [],
    selfReportedLabel: "Developing",
  },
  {
    id: "programming",
    name: "Programming",
    description:
      "Build reliable software through practice and thoughtful problem solving.",
    reportingBasis: "self-reported-sample",
    competencyIds: [],
    selfReportedLabel: "Planned",
  },
];
export const baseline: AssessmentBaseline = {
  id: "informal-ai-diagnostic",
  skillId: "ai",
  knowledge: { earned: 36, maximum: 40 },
  practical: { earned: 32, maximum: 60 },
  overall: { earned: 68, maximum: 100 },
  classification: "Intermediate",
  nature: "informal",
  status: "provisional",
  independentlyVerified: false,
  sourceLabel: "User's informal AI competency diagnostic",
  assessmentVersion: null,
  rubricReference: null,
  recordedAt: null,
};
// Starting progression only. No retroactive awards or level thresholds are defined.
export const initialProgression = { level: 1, xp: 0 } as const;
const phaseTitles = [
  "Foundations",
  "Intermediate Prompting and Context Engineering",
  "Advanced Evaluation, Safety, and Workflows",
  "AI Application and Expert-Level Practice",
];
const lessons = [
  "AI Basics and Capabilities",
  "Prompt Engineering Fundamentals",
  "Context, Tokens, and Limitations",
  "Responsible and Effective Use",
  "Structured Prompts and Output Formats",
  "Few-Shot Examples and Iteration",
  "Context Selection and Grounding",
  "Multi-Turn Context and Memory",
  "Evaluation Criteria and Test Cases",
  "Safety, Bias, and Failure Analysis",
  "Workflow Design and Human Review",
  "Comparing and Improving Workflows",
  "Define an AI Application",
  "Build and Test a Practical Prototype",
  "Evaluate Evidence and Document Limits",
  "Present a Capstone and Reflect",
];
export const roadmap: Roadmap = {
  id: "prompt-engineering-16",
  title: "Prompt Engineering Roadmap",
  targetSkillId: "prompting",
  templateVersion: 1,
  description:
    "A flexible, 16-week learning path. Follow the sequence or explore at your own pace.",
  phases: phaseTitles.map((title, i) => ({
    id: `phase-${i + 1}`,
    title,
    startWeek: i * 4 + 1,
    endWeek: i * 4 + 4,
    lessons: lessons.slice(i * 4, i * 4 + 4).map((title, j) => ({
      id: `lesson-${i * 4 + j + 1}`,
      title,
      week: i * 4 + j + 1,
      resourceReferences: [],
    })),
  })),
};
export const weeklyTasks = [
  {
    id: "watch-context",
    title: "Explore context windows",
    detail: "20 min · suggested activity",
    kind: "Watch",
  },
  {
    id: "practice-prompts",
    title: "Try three prompt variations",
    detail: "3 variations · suggested activity",
    kind: "Practice",
  },
  {
    id: "read-guide",
    title: "Read a prompting guide",
    detail: "15 min · suggested activity",
    kind: "Read",
  },
  {
    id: "context-exercise",
    title: "Design a context brief",
    detail: "1 exercise · suggested activity",
    kind: "Build",
  },
];
export function createInitialState(): PrototypeState {
  return {
    schemaVersion: 1,
    profile: {
      id: "local-profile",
      displayName: "Manny",
      headline: "AI Learner & EdTech Builder",
      biography:
        "I explore AI-powered learning tools, educational technology, and thoughtful ways to turn ideas into practical projects.",
    },
    lessonCompletion: {},
    taskCompletion: {},
  };
}
export const project: ProjectPreview = {
  id: "sciprompt",
  title: "SciPrompt — AI-Enhanced Science Learning Assistant",
  description:
    "A web-based AI assistant that helps students learn science through guided prompts and interactive explanations.",
  status: "In progress",
  tags: ["AI", "Education", "Web app"],
  dates: { started: "Oct 20, 2026", target: "Nov 15, 2026" },
  previewProgress: 67,
  tasks: [
    "Finalize application design",
    "Implement AI integration",
    "Develop learning modules",
    "Test and fix issues",
    "Prepare documentation",
    "Add to portfolio",
  ].map((title, i) => ({ id: `project-task-${i}`, title, completed: i < 4 })),
};
export const portfolio: PortfolioPreview = {
  biography:
    "A personal space for learning, building, and sharing thoughtful work.",
  selectedProjectIds: [project.id],
  sections: [
    { title: "Personal information", ready: true },
    { title: "About / Bio", ready: true },
    { title: "Skills & competencies", ready: true },
    { title: "Projects", ready: true },
    { title: "Certifications", ready: false },
    { title: "Achievements", ready: false },
  ],
};
