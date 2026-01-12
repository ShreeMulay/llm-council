import { ProgressIndicator } from "../../components/examples/progress-indicator"
import { ExampleList } from "../../components/examples/example-list"
import type { Example } from "../../../shared/types/example"

interface TutorialMetadata {
  version: string
  level: string
  title: string
  description: string
  examples: Example[]
}

export default function TutorialPage() {
  const metadata: TutorialMetadata = {
    version: "1.0.0",
    level: "1",
    title: "LangGraph Basics",
    description: "Learn the fundamentals of LangGraph through 5 progressive examples",
    examples: [
      {
        id: "01-hello-state",
        level: 1,
        order: 1,
        title: "Hello State",
        description: "Your first LangGraph - learn state, nodes, and basic graph structure",
        concepts: ["state", "nodes", "edges", "compile", "invoke"],
        learningObjectives: [
          "Understand the StateGraph concept",
          "Learn to define state structure",
          "Create simple nodes",
          "Build and invoke a basic graph",
        ],
        prerequisites: [],
        estimatedReadTimeMinutes: 5,
        estimatedRunTimeSeconds: 5,
        difficulty: "beginner",
        complexity: {
          nodes: 1,
          edges: 1,
          hasConditionals: false,
          hasTools: false,
          hasHumanInLoop: false,
        },
        explanation: "",
        code: "",
        tags: ["basics", "getting-started"],
      },
      {
        id: "02-two-nodes",
        level: 1,
        order: 2,
        title: "Two Nodes",
        description: "Understand how data flows between multiple nodes in sequence",
        concepts: ["state accumulation", "partial updates", "sequential flow"],
        learningObjectives: [
          "Connect multiple nodes with edges",
          "Pass state between nodes",
          "Understand state accumulation",
        ],
        prerequisites: ["01-hello-state"],
        estimatedReadTimeMinutes: 7,
        estimatedRunTimeSeconds: 5,
        difficulty: "beginner",
        complexity: {
          nodes: 2,
          edges: 2,
          hasConditionals: false,
          hasTools: false,
          hasHumanInLoop: false,
        },
        explanation: "",
        code: "",
        tags: ["basics", "flow"],
      },
      {
        id: "03-llm-node",
        level: 1,
        order: 3,
        title: "LLM Node",
        description: "Use language models in your graphs to generate responses",
        concepts: ["LLM nodes", "API integration", "response generation"],
        learningObjectives: [
          "Integrate LLMs into nodes",
          "Handle LLM API calls",
          "Process LLM responses in graphs",
        ],
        prerequisites: ["02-two-nodes"],
        estimatedReadTimeMinutes: 10,
        estimatedRunTimeSeconds: 10,
        difficulty: "beginner",
        complexity: {
          nodes: 2,
          edges: 2,
          hasConditionals: false,
          hasTools: false,
          hasHumanInLoop: false,
        },
        explanation: "",
        code: "",
        tags: ["llm", "integration"],
      },
      {
        id: "04-conditional-edge",
        level: 1,
        order: 4,
        title: "Conditional Edge",
        description: "Use conditional routing to create dynamic, branching flows",
        concepts: ["conditional edges", "routing functions", "branching logic"],
        learningObjectives: [
          "Define conditional edges",
          "Create routing functions",
          "Build branching workflows",
        ],
        prerequisites: ["03-llm-node"],
        estimatedReadTimeMinutes: 12,
        estimatedRunTimeSeconds: 15,
        difficulty: "intermediate",
        complexity: {
          nodes: 3,
          edges: 3,
          hasConditionals: true,
          hasTools: false,
          hasHumanInLoop: false,
        },
        explanation: "",
        code: "",
        tags: ["routing", "conditionals"],
      },
      {
        id: "05-simple-agent",
        level: 1,
        order: 5,
        title: "Simple Agent",
        description: "Build a complete conversational agent combining all concepts",
        concepts: ["agent pattern", "intent analysis", "tool routing", "complete agents"],
        learningObjectives: [
          "Build a complete agent workflow",
          "Combine all LangGraph patterns",
          "Understand end-to-end agent design",
        ],
        prerequisites: ["04-conditional-edge"],
        estimatedReadTimeMinutes: 15,
        estimatedRunTimeSeconds: 20,
        difficulty: "intermediate",
        complexity: {
          nodes: 4,
          edges: 4,
          hasConditionals: true,
          hasTools: true,
          hasHumanInLoop: false,
        },
        explanation: "",
        code: "",
        tags: ["agent", "complete"],
      },
    ],
  }

  const completed = 0
  const total = metadata.examples.length

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{metadata.title}</h1>
          <p className="text-lg text-muted-foreground">{metadata.description}</p>
        </header>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-foreground">Your Progress</h2>
            <span className="text-sm text-muted-foreground">
              {completed} of {total} examples completed
            </span>
          </div>
          <ProgressIndicator completed={completed} total={total} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6">Examples</h2>
          <ExampleList
            examples={metadata.examples}
            completedExamples={new Set()}
            onExampleClick={(example) => {
              console.log("Selected example:", example.id)
            }}
          />
        </section>
      </div>
    </main>
  )
}