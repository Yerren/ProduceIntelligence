import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { capTrim, wipeUnderline } from './styles.js'
import SocialIcons from './SocialIcons.jsx'
import profileImg from './assets/profile.jpg'
import docxedoLogo from './assets/docxedo_logo.png'
import adamLogo from './assets/adam-logo.png'
import freshWdlLogo from './assets/FreshWDL.png'
import adamPaper from './assets/PID6693039.pdf'

const docxedoDescription = 'Docxedo is a Microsoft Word add-in that applies a law firm’s complete house style to any document in one click. It turns unformatted or off-brand documents into finished, on-brand documents in seconds. To make such a deceptively complex task possible, Docxedo first performs very fine-grained classification across the entire document (possibly 100s of pages long) to determine the purpose of every single section, paragraph, and even individual word. It then deterministically cleans up the document, applies the firm’s specific styles, converts all manual numbering, replaces and restructures sections, adds comments for review, and far, far more.'

const freshWDLDescription = 'FreshWDL is an open-source, lightweight alternative to Weather Display Live (which ran on Flash) - allowing users to access it from nearly any device and platform. It is being used on 500+ websites around the globe and has been translated into 17+ different languages by the community. FreshWDL is primarily written in pure JavaScript, HTML, and CSS, and makes use of Chart.js, EaselJS, and TweenJS to display the information graphically using fully custom built-gauges.'

const adamDescription = (
  <>
    A.D.A.M. is a bespoke deep learning system for the grading of fresh produce primarily focused on cherries but also expanded into blueberries. A.D.A.M. reduced error rates by over 90%, saving customers an estimated $200+ per tonne of fruit packed (with individual customers packing 100s to 1000s of tonnes per season), and has resulted in 100,000kgs+ of reduced food waste. A.D.A.M. consists of multiple custom deep learning models built in TensorFlow/Keras. These were iteratively improved upon using active learning, synthetic data, targeted data collection, semi-supervised learning, image pre-processing, and complex augmentation. I was the sole engineer, responsible for research and development, project management, the entire data pipeline, monitoring, and more. I was also customers’ point of contact for software, dealing with sales, feedback, operator training, and technical support.
    <br />
    A portion of this work won the Best Paper Award at IVCNZ 2020 - read the paper{' '}
    <a href={adamPaper} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      here
    </a>
    .
  </>
)

// Projects alternate image right / image left, in this order.
const PROJECTS = [
  { name: 'Docxedo', role: 'Lead Developer', url: 'https://www.docxedo.ai/', description: docxedoDescription, icon: docxedoLogo, contain: true },
  { name: 'A.D.A.M.', role: 'Sole Developer', url: 'https://pearlsort.com/a.d.a.m', description: adamDescription, icon:adamLogo},
  { name: 'FreshWDL', role: 'Creator', url: 'https://github.com/Yerren/FreshWDL', description: freshWDLDescription, icon: freshWdlLogo },
]

const circleClasses =
  'flex h-[clamp(4rem,100vw-15rem,10rem)] w-[clamp(4rem,100vw-15rem,10rem)] shrink-0 items-center justify-center overflow-hidden rounded-full bg-black text-center text-[clamp(0.6rem,(100vw-15rem)*0.11,1.125rem)] text-white max-[300px]:h-40 max-[300px]:w-40 max-[300px]:text-lg lg:h-48 lg:w-48 dark:bg-white dark:text-black'

// Circle + text rows: the circle floats and text wraps under its square box. Below 400px the circle
// shrinks with the viewport (100vw - 15rem) so the room left for headings stays roughly constant.
// Below 300px they stack instead (full-size circle, no float).
const rowClasses = 'flow-root max-[300px]:flex max-[300px]:items-start max-[300px]:gap-6'
const floatLeft = 'float-left mr-[min(8vw,2rem)] mb-4 max-[300px]:m-0! lg:mr-12'
const floatRight = 'float-right ml-[min(8vw,2rem)] mb-4 max-[300px]:m-0! lg:ml-12'

// Project headings shrink so their longest word (--word) fits beside the circle.
const headingSize =
  'text-[clamp(1.25rem,max(100vw-16rem,11rem-8vw)/(var(--word)*0.6),1.875rem)] max-[300px]:text-3xl lg:text-3xl'

function Project({ name, role, url, description, icon, contain, imageLeft }) {
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
          <a href={url} target="_blank" rel="noopener noreferrer" className="group outline-none">
            <span className={wipeUnderline}>{name}</span>
          </a>
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{role}</p>
        <p className="mt-2 leading-relaxed">{description}</p>
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
      <header className="flex items-start justify-between gap-6">
        <div>
          {/* capTrim makes the h1's box top its letters' top, so the icons line up with "Hi". */}
          <h1 className={`text-5xl lg:text-6xl ${capTrim}`}>Hi, I'm Yerren</h1>
          <p className="mt-2 text-xl lg:text-2xl">It's nice to meet you</p>
        </div>
        {/* Below lg the icons live in the top menu bar instead (see Layout). */}
        <SocialIcons className="hidden lg:flex" />
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
