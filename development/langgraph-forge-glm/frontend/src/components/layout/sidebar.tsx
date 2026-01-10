import { Link } from "react-router-dom"

export function Sidebar() {
  return (
    <aside className="border-r border-border w-64">
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link to="/playground" className="block text-foreground hover:text-primary">
              Playground
            </Link>
          </li>
          <li>
            <Link to="/tutorial" className="block text-foreground hover:text-primary">
              Tutorial
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export default Sidebar