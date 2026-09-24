# Aura — public website

The public, search-engine-facing half of Aura. It shows the same directory as the mobile
app, but server-rendered so every creator profile is a real page a search engine can read.

- **App** (`app/` at the repo root) — the creator's own tool: register, manage a profile,
  add packages.
- **Admin** (`admin/`) — the review queue. Built into the backend and served at `/`.
- **This site** — the directory as the public sees it, plus sign-in for creators who
  prefer a browser.

All three talk to the same Express API in `backend/`.

## Running it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The backend must be running (`cd backend && npm run dev`).

### Environment

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_API_URL` | The Express API. `http://localhost:5050` locally. |
| `NEXT_PUBLIC_SITE_URL` | This site's own public origin. |

`NEXT_PUBLIC_SITE_URL` is worth getting right: canonical tags, Open Graph URLs and every
sitemap entry are built from it, so a wrong value does not break the site — it quietly
points all of them at the wrong host, which is harder to notice.

## Pages

| Route | Indexed | Notes |
|---|---|---|
| `/` | yes | Hero search, stats, spotlight, niches |
| `/creators` | yes | Full directory, filters, pagination |
| `/creators?q=…` | **no** | Filtered views are noindex, canonical to `/creators` |
| `/creators/[id]` | yes | Profile, channels, packages |
| `/category/[slug]` | yes | One page per niche — the indexable version of a filter |
| `/about` | yes | What Aura is and how approval works |
| `/register` | yes | Creators search for this |
| `/login`, `/profile`, `/forgot-password`, `/reset-password` | no | Nothing to rank for |

## How the SEO is put together

**Titles and descriptions are per page, and written from what the page shows.** The root
layout sets a `%s | Aura` template and the default title; each page supplies only its own
name. A creator page builds its title the way someone would search — *"Sneha Kapoor —
Beauty Creator in Bengaluru, Karnataka"* — and its description from the real bio, trimmed
at a word boundary to the ~158 characters Google will print.

**Faceted listings do not compete with themselves.** A directory with search, niche,
state and city filters can emit an unbounded number of near-identical URLs. Only the clean
`/creators` listing and its numbered pages are indexable; anything filtered carries a
`noindex` and canonicals back. Niches keep a proper indexable home at `/category/[slug]`,
because *"fitness influencers"* is a real search and a query string is not.

**Slugs in URLs, ids on the wire.** `/category/beauty` is worth something to a search
engine; the API filters on an ObjectId. `resolveCategoryId` in `lib/api.ts` is the single
place that bridges the two.

**Structured data mirrors the page, and nothing more.** A creator page emits `ProfilePage`
→ `Person` with the location, the linked accounts as `sameAs`, and each approved package
as an `Offer` with its real price — all of it visible on the page, which is the line
between rich results and a manual penalty. Listings emit `CollectionPage` + `ItemList`,
and every nested page emits `BreadcrumbList`.

**Share cards are generated, not drawn.** `opengraph-image.tsx` renders a 1200×630 PNG per
creator with their name, niche and city, so there is no static asset to keep in sync.

**`sitemap.xml` is built from the API**, walking every page of creators and listing only
niches that actually have someone in them. `robots.txt` disallows the per-person pages and
the filtered listings.

## Commands

```bash
npm run dev     # development
npm run build   # production build
npm run start   # serve the build
npm run lint    # eslint
npx tsc --noEmit
```
