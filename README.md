# Produce Intelligence

Personal website: a React + Vite single-page app served by a Cloudflare Worker.

## Layout

```
src/
  main.jsx, App.jsx, index.css   entry point, routes, global styles
  site/                          the main website (everything inside the sidebar Layout)
    Layout.jsx, SocialIcons.jsx, styles.js
    HomePage.jsx, SlidesPage.jsx, FunZonePage.jsx
    assets/                      images and papers used by the pages
    presentations/               every PDF here is listed on /Slides automatically
  projects/                      the Fun Zone projects: standalone, full-screen pages
    shared/                      drawing canvas, cursors, score graph and API helper they share
    HotOrCold/
    RateThatHog/
worker/                          Cloudflare Worker: /api/* for the Fun Zone projects, static assets otherwise
vite-plugins/                    build-time PDF thumbnails for /Slides
scripts/word-list/               builds worker/words.json for Hot or Cold
```

## Scripts

- `npm run dev` – local dev server (the `/api/*` routes need the Worker, so the games can't score drawings here)
- `npm run build` / `npm run lint`
- `npm run deploy:dev` – deploy to dev.produceintelligence.co.nz
- `npm run deploy` – deploy to produceintelligence.co.nz
