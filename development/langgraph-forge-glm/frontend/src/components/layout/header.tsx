import { Link } from "react-router-dom"

export function Header() {
  return (
    <header className="border-b border-border p-4">
      <Link to="/" className="text-2xl font-bold">
        LangGraph Forge
      </Link>
    </header>
  )
}

export default Header