import { useEffect } from 'react'
import { useLocation } from 'react-router'

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris eget molestie augue, a commodo ipsum. Nam et nunc commodo, rhoncus elit vel, maximus tellus. Pellentesque et velit fringilla odio scelerisque convallis. Sed vel ante ac risus malesuada pulvinar iaculis at eros. Donec ullamcorper augue id placerat suscipit.'

// Projects alternate image right / image left, in this order.
const PROJECTS = [
  { name: 'Docxedo', url: 'https://link.to.website.com', description: LOREM },
  { name: 'Produce Intelligence', url: 'https://link.to.website.com', description: LOREM },
  { name: 'FreshWDL', url: 'https://link.to.website.com', description: LOREM },
]

const circleClasses =
  'flex h-40 w-40 shrink-0 items-center justify-center rounded-full bg-black p-6 text-center text-lg text-white md:h-48 md:w-48 dark:bg-white dark:text-black'

function displayUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function Project({ name, url, description, imageLeft }) {
  return (
    <article
      className={`flex flex-col-reverse items-start gap-6 md:items-center md:gap-12 ${imageLeft ? 'md:flex-row-reverse' : 'md:flex-row'}`}
    >
      <div className="flex-1">
        <h3 className="text-3xl">{name}</h3>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-2">
          {displayUrl(url)}
        </a>
        <p className="mt-3 leading-relaxed">{description}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${name}`}
        className={circleClasses}
      >
        {name} icon
      </a>
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
        <h1 className="text-5xl md:text-6xl">Hi, I'm Yerren</h1>
        <p className="mt-2 text-xl md:text-2xl">It's nice to meet you</p>
      </header>

      <section className="mt-12 flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-12">
        <div className={circleClasses}>Profile picture</div>
        <div className="flex-1">
          <h2 className="text-3xl">About me</h2>
          <p className="mt-3 leading-relaxed">{LOREM}</p>
        </div>
      </section>

      <section id="my-work" className="mt-20 scroll-mt-10">
        <h2 className="text-5xl">My Work</h2>
        <div className="mt-10 flex flex-col gap-16 md:gap-20">
          {PROJECTS.map((project, i) => (
            <Project key={project.name} {...project} imageLeft={i % 2 === 1} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
