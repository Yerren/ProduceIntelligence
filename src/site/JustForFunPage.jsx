import { useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router'
import Gauge from '../projects/DrawTheThing/Gauge.jsx'
import gaugeUrl from '../projects/DrawTheThing/assets/guage.svg'
import arrowUrl from '../projects/DrawTheThing/assets/arrow.svg'
import dttTitleUrl from '../projects/DrawTheThing/assets/DTT_Title.svg'
import hogTitleUrl from '../projects/RateThatHog/assets/Title.svg'
import meterUrl from '../projects/RateThatHog/assets/Meter.svg'

function JustForFunPage() {
  return (
    <Routes>
      <Route index element={<JustForFunHome />} />
      <Route path="details" element={<JustForFunDetails />} />
    </Routes>
  )
}

function JustForFunHome() {
  return (
    <>
      <h1 className="text-3xl">WARNING: Things are about to get a bit silly</h1>
      <p>All that you will see beyond this point are personal projects which I made <em>just for fun</em>. Likely hosted here just to share with a friend or two. The antithesis of a professional portfolio. Continue at your own risk. <Link to="details" className="underline">Enter</Link></p>
      
    </>
  )
}

const PROJECTS = [
  {
    name: 'Draw The Thing',
    path: '/JustForFun/DrawTheThing',
    title: dttTitleUrl,
    icon: <Gauge score={0.5} width="100%" label="" />,
  },
  {
    name: 'Rate That Hog',
    path: '/JustForFun/RateThatHog',
    title: hogTitleUrl,
    icon: <img src={meterUrl} alt="" className="h-full w-auto" />,
  },
]

// Every image on the cards, fetched and decoded as soon as this page's code loads (so usually while
// the warning is being read), so the cards can show them all at once rather than drawing in pieces.
const CARD_IMAGES = [dttTitleUrl, hogTitleUrl, meterUrl, gaugeUrl, arrowUrl]
const cardImagesReady = Promise.all(
  CARD_IMAGES.map(url => {
    const image = new Image()
    image.src = url
    return image.decode().catch(() => {})
  }),
)
let cardImagesLoaded = false
cardImagesReady.then(() => (cardImagesLoaded = true))

function useCardImagesLoaded() {
  const [loaded, setLoaded] = useState(cardImagesLoaded)
  useEffect(() => {
    if (loaded) return
    let current = true
    cardImagesReady.then(() => current && setLoaded(true))
    return () => (current = false)
  }, [loaded])
  return loaded
}

// One playing card (2.5 x 3.5) per project: one column on small screens, two across once they fit,
// shrinking only when even one doesn't fit.
function JustForFunDetails() {
  const loaded = useCardImagesLoaded()
  return (
    <div className="grid grid-cols-[minmax(0,16rem)] justify-center sm:justify-start sm:grid-cols-[repeat(2,minmax(0,16rem))] gap-4 sm:gap-8">
      {PROJECTS.map(project => (
        <Link
          key={project.path}
          to={project.path}
          aria-label={project.name}
          className="aspect-[5/7] flex p-[8%] border-4 bg-white transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:transition-none"
        >
          {/* The card's outline shows straight away; its pictures fade in together once loaded. */}
          <div className={`flex size-full flex-col items-center gap-[6%] transition-opacity duration-300 motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}>
            <img src={project.title} alt="" className="w-full" />
            <div className="flex-1 min-h-0 w-full flex items-center justify-center">{project.icon}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default JustForFunPage
