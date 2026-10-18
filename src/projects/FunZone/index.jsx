import { Link, Route, Routes } from 'react-router'

function FunZoneProject() {
  return (
    <Routes>
      <Route index element={<FunZoneHome />} />
      <Route path="details" element={<FunZoneDetails />} />
    </Routes>
  )
}

function FunZoneHome() {
  return (
    <>
      <h1 className="text-3xl">WARNING: You are on the precipice of The Fun Zone</h1>
      <p>Everything you will see beyond this point are silly personal projects. The antithesis of a professional portfolio. Continue at your own risk.</p>
      <Link to="details" className="underline">Enter</Link>
    </>
  )
}

function FunZoneDetails() {
  return <div><h1 className="text-3xl">Okay. So. I lied.</h1><p>There's nothing here yet either.</p><p>Sorry.</p></div>
}

export default FunZoneProject
