import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import Layout from './site/Layout.jsx'

// Every page is lazy-loaded so its code only downloads when visited.
// The main site (src/site) shares the Layout's sidebar nav.
const Home = lazy(() => import('./site/HomePage.jsx'))
const Slides = lazy(() => import('./site/SlidesPage.jsx'))
const JustForFun = lazy(() => import('./site/JustForFunPage.jsx'))
// Just For Fun projects (src/projects) are standalone, full-screen pages.
const RateThatHog = lazy(() => import('./projects/RateThatHog/index.jsx'))
const DrawTheThing = lazy(() => import('./projects/DrawTheThing/index.jsx'))

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Full-screen, outside the shared Layout so there's no nav bar. */}
        <Route path="JustForFun/RateThatHog" element={<RateThatHog />} />
        <Route path="JustForFun/DrawTheThing" element={<DrawTheThing />} />
        {/* The section used to be called The Fun Zone; keep its old links working. */}
        <Route path="FunZone/*" element={<OldFunZoneRedirect />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="Slides" element={<Slides />} />
          <Route path="JustForFun/*" element={<JustForFun />} />
          <Route path="*" element={<h1 className="text-3xl">Page not found</h1>} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function OldFunZoneRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate replace to={pathname.replace(/^\/FunZone/, '/JustForFun') + search + hash} />
}

export default App
