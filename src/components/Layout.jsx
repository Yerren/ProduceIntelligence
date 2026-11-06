import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'

const MY_WORK_ID = 'my-work'

// A nav link whose hover/focus state wipes an inverted copy of the text in from the left.
function NavItem({ to, active, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative -mx-2 inline-block whitespace-nowrap px-2 py-1 outline-none ${active ? 'font-bold' : ''}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute inset-0 whitespace-nowrap bg-black px-2 py-1 text-white transition-[clip-path] duration-300 ease-out [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0)] group-focus-visible:[clip-path:inset(0)] motion-reduce:transition-none dark:bg-white dark:text-black"
      >
        {children}
      </span>
    </Link>
  )
}

// Shared shell (sidebar nav) wrapped around every project.
function Layout() {
  const { pathname, hash } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Start each new page at the top (the home page handles its own hash scrolling).
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])

  const onHome = pathname === '/'
  const onMyWork = onHome && hash === `#${MY_WORK_ID}`

  const closeMenu = () => setMenuOpen(false)

  const goToMyWork = () => {
    closeMenu()
    // Re-clicking when the hash is already set doesn't change the location, so scroll manually.
    if (onMyWork) {
      document.getElementById(MY_WORK_ID)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const items = [
    { label: 'Home', to: '/', active: onHome && !onMyWork, onClick: closeMenu },
    { label: 'My Work', to: { pathname: '/', hash: MY_WORK_ID }, active: onMyWork, onClick: goToMyWork },
    { label: 'Slides', to: '/Slides', active: pathname.startsWith('/Slides'), onClick: closeMenu },
    { label: 'The Fun Zone', to: '/FunZone', active: pathname.startsWith('/FunZone'), onClick: closeMenu },
  ]

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      {/* Desktop divider is a pseudo-element inset ~1cm from the top and bottom of the page. */}
      <aside className="relative border-b-2 border-current md:w-80 md:shrink-0 md:border-b-0 md:after:absolute md:after:inset-y-10 md:after:right-0 md:after:w-0.5 md:after:bg-current">
        <div className="flex items-center px-6 py-4 md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="-ml-2 p-2"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        <nav
          id="site-nav"
          className={`${menuOpen ? 'flex' : 'hidden'} flex-col items-start gap-5 px-6 pb-8 text-3xl md:flex md:gap-8 md:px-10 md:py-16 md:text-4xl`}
        >
          {items.map((item) => (
            <NavItem key={item.label} to={item.to} active={item.active} onClick={item.onClick}>
              {item.label}
            </NavItem>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-10 md:px-16 md:py-16">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
