import type { Example } from "../../shared/types/example"

interface ExampleListProps {
  examples: Example[]
  completedExamples: Set<string>
  onExampleClick: (example: Example) => void
  filterByDifficulty?: "beginner" | "intermediate" | "advanced" | "all"
}

export function ExampleList({
  examples,
  completedExamples,
  onExampleClick,
  filterByDifficulty = "all",
}: ExampleListProps) {
  const sortedExamples = [...examples].sort((a, b) => a.order - b.order)

  const filteredExamples =
    filterByDifficulty === "all"
      ? sortedExamples
      : sortedExamples.filter((example) => example.difficulty === filterByDifficulty)

  if (filteredExamples.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No examples found</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {filteredExamples.map((example) => (
        <ExampleCard
          key={example.id}
          example={example}
          completed={completedExamples.has(example.id)}
          onClick={() => onExampleClick(example)}
        />
      ))}
    </div>
  )
}

import { ExampleCard } from "./example-card"