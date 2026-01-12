// Example Content Types
// Defines the structure of tutorial examples and metadata

// ============================================================
// Example Metadata
// ============================================================

export type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert"
export type ExampleLevel = 1 | 2 | 3 | 4

export interface ExampleComplexity {
  nodes: number
  edges: number
  hasConditionals: boolean
  hasTools: boolean
  hasHumanInLoop: boolean
}

export interface Example {
  id: string // Unique identifier: "l1-01-hello-state"
  level: ExampleLevel
  order: number

  // Display info
  title: string
  description: string

  // Learning objectives
  concepts: string[]
  learningObjectives: string[]

  // Prerequisites
  prerequisites: string[] // IDs of examples that should be done first

  // Time estimates
  estimatedReadTimeMinutes: number
  estimatedRunTimeSeconds: number

  // Difficulty indicators
  difficulty: DifficultyLevel
  complexity: ExampleComplexity

  // The actual content
  explanation: string // MDX content
  code: string // Python code

  // Expected results (for testing)
  expectedOutput?: {
    contains?: string[]
    graphStructure?: {
      nodeCount: number
      edgeCount: number
    }
  }

  // Tags for filtering/search
  tags: string[]
}

// ============================================================
// Level Metadata
// ============================================================

export interface LevelInfo {
  level: ExampleLevel
  name: string
  description: string
  examples: Example[]
}

export interface ExamplesMetadata {
  levels: LevelInfo[]
  totalExamples: number
  lastUpdated: string
}

// ============================================================
// Progress Tracking
// ============================================================

export type ExampleStatus = "not_started" | "in_progress" | "completed"

export interface ExampleProgress {
  exampleId: string
  status: ExampleStatus
  completedAt?: string // ISO timestamp
  runCount: number
  lastRunAt?: string // ISO timestamp
}

export interface UserProgress {
  examples: Record<string, ExampleProgress>
  lastActiveAt: string
  totalCompleted: number
}
