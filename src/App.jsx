import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'

// Each project is lazy-loaded so its code only downloads when visited.
const Home = lazy(() => import('./projects/home/HomePage.jsx'))
const FunZone = lazy(() => import('./projects/FunZone/index.jsx'))
const RateThatHog = lazy(() => import('./projects/RateThatHog/index.jsx'))

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Full-screen, outside the shared Layout so there's no nav bar. */}
        <Route path="FunZone/RateThatHog" element={<RateThatHog />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="FunZone/*" element={<FunZone />} />
          <Route path="*" element={<h1 className="text-3xl">Page not found</h1>} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
