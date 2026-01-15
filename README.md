# Portfolio

My personal portfolio website showcasing 
## Tech Stack

- Vanilla HTML, CSS, JavaScript
- Markdown content
- GitHub Pages hosting

## Development

```bash
# Serve locally
python -m http.server 8000 -d docs/
```

## Structure

- `docs/index.html` - Main page
- `docs/*.md` - Content (about, work, resume)
- `docs/styles.css` - Styling
- `docs/script.js` - Functionality
- `docs/service-worker.js` - Service worker for caching
- `docs/_headers` - HTTP headers for caching (Netlify/Cloudflare)

## Caching

The site uses a Service Worker for offline caching and faster load times:

- **Static Assets**: CSS, JS, images are cached aggressively
- **Content**: HTML and Markdown use network-first strategy for freshness
- **Offline Support**: Site works offline with cached assets
- **Auto Updates**: Service worker checks for updates hourly

To update the cache version, increment `CACHE_VERSION` in `service-worker.js`.

The `_headers` file provides additional HTTP caching for platforms that support it (Netlify, Cloudflare Pages).

Inspired by [astro-theme-cactus](https://astro-cactus.chriswilliams.dev/) :)
