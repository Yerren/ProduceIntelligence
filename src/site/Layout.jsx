import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import SocialIcons from './SocialIcons.jsx'

const MY_WORK_ID = 'my-work'

// A nav link whose hover/focus state wipes an inverted copy of the text in from the left.
function NavItem({ to, active, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`group relative -mr-2 ml-[calc(-0.5rem-var(--lsb))] inline-block whitespace-nowrap px-2 py-1 outline-none ${active ? 'font-bold' : ''}`}
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

// Shared shell (sidebar nav) wrapped around every page of the main site.
function Layout() {
  const { pathname, hash } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Start each new page at the top (the home page handles its own hash scrolling).
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])

  // Optical left alignment: pull each text block left by its first glyph's actual side bearing
  // (varies per letter and font size), so ink edges line up exactly with images.
  useEffect(() => {
    let cancelled = false
    const ctx = document.createElement('canvas').getContext('2d')
    const align = () => {
      if (cancelled) return
      document.querySelectorAll('main :is(h1, h2, h3, h4, p, .trim-left)').forEach((el) => {
        const text = el.textContent.trimStart()
        if (!text) return
        const cs = getComputedStyle(el)
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
        const bearing = -ctx.measureText(text[0]).actualBoundingBoxLeft
        el.style.marginLeft = `${-bearing}px`
      })
    }
    document.fonts.ready.then(align)
    const observer = new ResizeObserver(() => requestAnimationFrame(align))
    observer.observe(document.querySelector('main'))
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [pathname])

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
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
      {/* Desktop divider is a pseudo-element inset ~1cm from the top and bottom of the page. */}
      <aside className="relative border-b-2 border-current lg:w-80 lg:shrink-0 lg:border-b-0 lg:after:absolute lg:after:inset-y-10 lg:after:right-0 lg:after:w-0.5 lg:after:bg-current">
        <div className="flex items-center justify-between px-6 py-4 lg:hidden">
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
          {/* On the home page the social icons sit in the top bar below lg (in the page header above it). */}
          {onHome && <SocialIcons />}
        </div>

        <nav
          id="site-nav"
          className={`${menuOpen ? 'flex' : 'hidden'} flex-col items-start gap-5 px-6 pb-8 text-3xl lg:flex lg:gap-8 lg:px-10 lg:py-16 lg:text-4xl`}
        >
          {items.map((item) => (
            <NavItem key={item.label} to={item.to} active={item.active} onClick={item.onClick}>
              {item.label}
            </NavItem>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-10 lg:px-16 lg:py-16">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
