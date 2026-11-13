import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import Layout from './site/Layout.jsx'

// Every page is lazy-loaded so its code only downloads when visited.
// The main site (src/site) shares the Layout's sidebar nav.
const Home = lazy(() => import('./site/HomePage.jsx'))
const Slides = lazy(() => import('./site/SlidesPage.jsx'))
const FunZone = lazy(() => import('./site/FunZonePage.jsx'))
// The Fun Zone projects (src/projects) are standalone, full-screen pages.
const RateThatHog = lazy(() => import('./projects/RateThatHog/index.jsx'))
const HotOrCold = lazy(() => import('./projects/HotOrCold/index.jsx'))

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Full-screen, outside the shared Layout so there's no nav bar. */}
        <Route path="FunZone/RateThatHog" element={<RateThatHog />} />
        <Route path="FunZone/HotOrCold" element={<HotOrCold />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="Slides" element={<Slides />} />
          <Route path="FunZone/*" element={<FunZone />} />
          <Route path="*" element={<h1 className="text-3xl">Page not found</h1>} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
