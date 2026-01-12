import { Link } from "react-router-dom"

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">LangGraph Forge</h1>
        </div>
      </header>
      <main className="container mx-auto max-w-6xl p-4">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Welcome to LangGraph Forge</h2>
            <p className="text-muted-foreground">
              Your interactive learning platform for mastering LangGraph through hands-on tutorials and a live playground with real-time graph visualization.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              to="/tutorial"
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Start Tutorial
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
