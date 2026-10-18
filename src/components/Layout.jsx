import { Link, Outlet } from 'react-router'

// Shared shell (header/nav) wrapped around every project.
function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-6 py-4 flex gap-6">
        <Link to="/" className="font-bold">Produce Intelligence</Link>
        <nav className="flex gap-4">
          <Link to="/FunZone">The Fun Zone</Link>
        </nav>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
