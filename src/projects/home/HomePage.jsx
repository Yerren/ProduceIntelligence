import { useEffect } from 'react'
import { useLocation } from 'react-router'
import profileImg from './assets/profile_wide.jpg'
import docxedoLogo from './assets/docxedo_logo.png'
import freshWdlLogo from './assets/FreshWDL.png'

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris eget molestie augue, a commodo ipsum. Nam et nunc commodo, rhoncus elit vel, maximus tellus. Pellentesque et velit fringilla odio scelerisque convallis. Sed vel ante ac risus malesuada pulvinar iaculis at eros. Donec ullamcorper augue id placerat suscipit.'

const freshWDLDescription = 'FreshWDL is a lightweight, pure JavaScript alternative to WDL (which ran on Flash). This allows for users to access it from nearly any device and platform.'

// Projects alternate image right / image left, in this order.
const PROJECTS = [
  { name: 'Docxedo', url: 'https://www.docxedo.ai/', description: LOREM, icon: docxedoLogo, contain: true },
  { name: 'Produce Intelligence', url: 'https://pearlsort.com/a.d.a.m', description: LOREM },
  { name: 'FreshWDL', url: 'https://github.com/Yerren/FreshWDL', description: freshWDLDescription, icon: freshWdlLogo },
]

// Trims the space above the capital letters, so a heading's box top is its letters' top and circles align with it.
const capTrim = '[text-box:trim-start_cap_alphabetic]'

const circleClasses =
  'flex h-[clamp(4rem,100vw-15rem,10rem)] w-[clamp(4rem,100vw-15rem,10rem)] shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-center text-[clamp(0.6rem,(100vw-15rem)*0.11,1.125rem)] text-white max-[300px]:h-40 max-[300px]:w-40 max-[300px]:text-lg lg:h-48 lg:w-48 dark:bg-white dark:text-black'

function displayUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

// Circle + text rows: the circle floats and text wraps under its square box. Below 400px the circle
// shrinks with the viewport (100vw - 15rem) so the room left for headings stays roughly constant.
// Below 300px they stack instead (full-size circle, no float).
const rowClasses = 'flow-root max-[300px]:flex max-[300px]:items-start max-[300px]:gap-6'
const floatLeft = 'float-left mr-[min(8vw,2rem)] mb-4 max-[300px]:m-0! lg:mr-12'
const floatRight = 'float-right ml-[min(8vw,2rem)] mb-4 max-[300px]:m-0! lg:ml-12'

// Project links shrink to fit the room beside the circle (same maths as above), so they never drop below it.
// --chars is the link's length; 0.56em is Quicksand's widest average character width (measured), and the
// extra 1rem of slack covers a desktop scrollbar, which 100vw includes.
// Project headings likewise shrink so their longest word (--word) fits beside the circle.
const headingSize =
  'text-[clamp(1.25rem,max(100vw-16rem,11rem-8vw)/(var(--word)*0.6),1.875rem)] max-[300px]:text-3xl lg:text-3xl'

const linkSize =
  'text-[clamp(0.5rem,max(100vw-16rem,11rem-8vw)/(var(--chars)*0.56),0.875rem)] max-[300px]:text-sm lg:text-sm'

function Project({ name, url, description, icon, contain, imageLeft }) {
  // Image circles drop the black fill: it bled through the anti-aliased edge as a thin dark ring.
  const circleFill = !icon ? 'p-6' : contain ? 'bg-neutral-100! p-5' : 'bg-transparent!'
  return (
    // Below 300px: stacked, text above the circle.
    <article className={`${rowClasses} max-[300px]:flex-col-reverse`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${name}`}
        className={`${circleClasses} ${circleFill} ${imageLeft ? floatLeft : floatRight}`}
      >
        {icon ? (
          <img src={icon} alt="" className={`h-full w-full ${contain ? 'object-contain' : 'object-cover'}`} />
        ) : (
          `${name} icon`
        )}
      </a>
      <div>
        <h3
          style={{ '--word': Math.max(...name.split(' ').map((w) => w.length)) }}
          className={`${headingSize} ${capTrim}`}
        >
          {name}
        </h3>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ '--chars': displayUrl(url).length }} className={`trim-left inline-block whitespace-nowrap underline underline-offset-2 ${linkSize}`}>
          {displayUrl(url)}
        </a>
        <p className="mt-3 leading-relaxed">{description}</p>
      </div>
    </article>
  )
}

function HomePage() {
  const { hash } = useLocation()

  // React Router doesn't scroll to hash targets, so do it ourselves (also covers direct loads of /#my-work).
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [hash])

  return (
    <div className="max-w-4xl">
      <header>
        <h1 className="text-5xl lg:text-6xl">Hi, I'm Yerren</h1>
        <p className="mt-2 text-xl lg:text-2xl">It's nice to meet you</p>
      </header>

      <section className={`mt-12 ${rowClasses} max-[300px]:flex-col`}>
        <img src={profileImg} alt="Yerren" className={`${circleClasses} ${floatLeft} bg-transparent! object-cover`} />
        <div>
          <h2 className={`text-3xl ${capTrim}`}>About me</h2>
          <p className="mt-3 leading-relaxed">I have over half a decade of professional experience leading the development of bespoke AI and deep learning solutions. One of my joys in life is creating things that solve real problems - making people's lives easier, businesses run smoother and, most of all, the world a better place. I believe that effective collaboration lies at the heart of this: working together to uncover and deeply understand the challenges you are facing, developing plans to overcome them, and ultimately building the solutions you really need. <br /> <br /> Outside of work, you will likely find me at a table tennis table, on a bouldering wall, or playing one of an ever-growing collection of board games</p>
        </div>
      </section>

      <section id="my-work" className="mt-20 scroll-mt-10">
        <h2 className="text-5xl">My Work</h2>
        <div className="mt-10 flex flex-col gap-16 lg:gap-20">
          {PROJECTS.map((project, i) => (
            <Project key={project.name} {...project} imageLeft={i % 2 === 1} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
