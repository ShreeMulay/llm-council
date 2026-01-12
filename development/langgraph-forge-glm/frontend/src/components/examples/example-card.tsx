export function ExampleCard({ example, completed, onClick }) {
  const { title, description, difficulty, estimatedReadTimeMinutes, concepts } = example

  const difficultyColors = {
    beginner: "bg-green-500/20 text-green-700 dark:text-green-400",
    intermediate: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    advanced: "bg-red-500/20 text-red-700 dark:text-red-400",
    expert: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-all bg-card"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {completed && <span className="text-2xl">✓</span>}
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="flex flex-wrap gap-2 mb-2">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${difficultyColors[difficulty] || difficultyColors.beginner}`}
        >
          {difficulty}
        </span>
        <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-medium">
          {estimatedReadTimeMinutes} min read
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {concepts.map((concept) => (
          <span
            key={concept}
            className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground"
          >
            {concept}
          </span>
        ))}
      </div>
    </button>
  )
}