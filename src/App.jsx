import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'

// Each project is lazy-loaded so its code only downloads when visited.
const Home = lazy(() => import('./projects/home/HomePage.jsx'))
const Example = lazy(() => import('./projects/example/index.jsx'))

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="example/*" element={<Example />} />
          <Route path="*" element={<h1 className="text-3xl">Page not found</h1>} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
