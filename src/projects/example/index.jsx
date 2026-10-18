import { Link, Route, Routes } from 'react-router'

// Example project: defines its own sub-routes under /example.
function ExampleProject() {
  return (
    <Routes>
      <Route index element={<ExampleHome />} />
      <Route path="details" element={<ExampleDetails />} />
    </Routes>
  )
}

function ExampleHome() {
  return (
    <>
      <h1 className="text-3xl">Example project</h1>
      <Link to="details" className="underline">Details</Link>
    </>
  )
}

function ExampleDetails() {
  return <h1 className="text-3xl">Example details</h1>
}

export default ExampleProject
