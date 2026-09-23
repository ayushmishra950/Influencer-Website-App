# Aura — Creator Network

An influencer directory platform with **admin-gated verification**: creators register
themselves, but nobody can sign in or appear publicly until an admin approves them.

```
                          ┌──────────────┐
  Influencer ── register ─┤   pending    ├── admin review ──┬── approve ─→ approved ─→ login + public listing
                          └──────────────┘                  ├── reject  ─→ rejected  ─→ login blocked
                                                            └── archive ─→ archived  ─→ hidden, restorable
```

## Three applications

| Folder | Stack | Purpose |
|---|---|---|
| [`backend/`](backend) | Node + Express + MongoDB + **TypeScript** | REST API, JWT auth, verification logic |
| [`admin/`](admin) | React 18 + Vite + **TypeScript** | Dashboard for reviewing and managing influencers |
| [`app/`](app) | Expo SDK 57 + expo-router + **TypeScript** | Creator app — register, profile, public directory |

Everything is TypeScript with `strict: true`, and all three typecheck clean.

---

## Quick start

You need **Node 20+** and a **MongoDB** (local, Atlas, or the bundled throwaway one).

Once `backend/.env` is configured (see below), one command starts the API and the
admin dashboard together, and Ctrl+C stops both:

```bash
./start.sh
```

The steps below are the same thing done by hand, and explain the setup it assumes.

### 1. Backend

```bash
cd backend && npm install && cp .env.example .env
```

Now edit **`.env`** — not `.env.example`. The `.example` file is only a template and is
never read at runtime. Set `MONGODB_URI` and `JWT_SECRET`, then confirm the database
is reachable before anything else:

```bash
npm run db:check
```

It names the exact problem if the connection fails, and never prints your password.
Then, in **three terminals**:

```bash
npm run dev:db
```
> Optional. Starts a throwaway in-memory MongoDB on `127.0.0.1:27017`.
> Skip it if you already have MongoDB running or are using Atlas — **all its data is lost on stop.**

```bash
npm run seed
```
> Creates the admin, 11 categories and 12 demo influencers across every status.

```bash
npm run dev
```
> API on **http://localhost:5050**

### 2. Admin dashboard

```bash
cd admin && npm install && npm run dev
```
Open **http://localhost:5173** → sign in with `admin@aura.dev` / `Admin@12345`.

To add your own admin (or reset an existing one's password):

```bash
cd backend && npm run create:admin -- --email you@example.com --password 'Secret@123' --name 'Your Name'
```

Vite proxies `/api` to the backend, so there is one origin and no CORS in development.

#### Serving the admin from the backend

For a deploy there is no need to host the panel separately. Build it into the API:

```bash
cd backend && npm run build:admin
```

That runs the Vite build and copies `admin/dist` into `backend/public`. From then on the
backend answers on a single origin:

| Request | Handled by |
|---|---|
| `/api/*` | the API — an unknown path here is a **JSON 404**, never the HTML shell |
| `/uploads/*` | uploaded images |
| `/socket.io/*` | Socket.IO (attached to the HTTP server, ahead of Express) |
| anything else | the admin panel, with `index.html` as the SPA fallback |

`npm run build:all` does that and compiles the server, so `npm start` serves both halves
on **http://localhost:5050**. Because the admin is built with an empty
`VITE_API_BASE_URL`, every call it makes is relative and its socket falls back to
`window.location.origin` — one origin, nothing host-specific baked into the bundle.

`npm run dev` in `admin/` is still the way to *work* on the panel; the copy in
`backend/public` is a build artifact and only refreshes when you rebuild.

**Pointing the build at a fixed API origin.** `admin/.env.production` sets
`VITE_API_BASE_URL` for `vite build` only, so local development keeps using the proxy.
Note that an absolute origin is baked into the bundle: it matches CSP's `'self'` only
while the panel is served from that exact host, so if you later serve it from anywhere
else — a custom domain, or the backend running locally — add that API origin to
`CLIENT_ORIGINS`, which the `connect-src` policy is built from. Leaving
`VITE_API_BASE_URL` empty avoids the whole question, since relative URLs follow
whatever host is serving the panel.

### 3. Creator app

```bash
cd app && npm install && npx expo start
```
Press `w` for web, `i` for iOS, `a` for Android, or scan the QR code with Expo Go.

Demo creator login: `rahul.sharma@example.com` / `Creator@123`
A **pending** account (to see the gate): `priya.singh@example.com` / `Creator@123`

---

## Things worth knowing

**Port 5050, not 5000.** On macOS, AirPlay Receiver occupies port 5000. Change `PORT`
in `backend/.env` if you need to, and update `admin/vite.config.ts` and
`app/.env` to match.

**The app finds your API automatically.** On a phone, `localhost` points at the phone,
not your laptop, so the app derives the host from the Expo dev server. Set
`EXPO_PUBLIC_API_URL` in `app/.env` to override — required for web and for real builds.

**Admin-created influencers default to `approved`.** The admin creating the record *is*
the verification step. The create form has a Status dropdown to override this.

**There are two location endpoints, on purpose.** `/api/public/locations` only sees
approved, non-archived records, which is right for the public directory and wrong for the
admin filter bar — using it there meant the Archived and Review lists could not be
filtered by the locations they actually contain. `/api/admin/locations` takes the same
`status`/`archived` window the page is showing, so its options always match the rows.

It also returns states and cities whether or not a country is selected: the API filters
on each independently, so the admin dropdowns are not chained together.

**Archive is not delete.**
- *Archive* — reversible. The record is hidden from the directory and login, but kept.
- *Delete* — permanent. Removes the profile **and** its login account.

Bulk delete is refused by the API unless the request carries `confirm: true`, so an
accidental "select all → delete" cannot slip through on a mis-click.

**Authorization is enforced on the server.** Every `/api/admin/*` route runs through
`authenticate` then `authorize('admin')`. Hiding a button in the UI is not security.

---

## Verify it works

```bash
cd backend && npm run test:e2e      # 51 checks — REST behaviour
cd backend && npm run test:realtime # 25 checks — sockets, notifications, forced logout
```

Both need a running server and the seeded demo rows (`npm run seed`). They tolerate
extra real data alongside the seed, and `test:e2e` puts back everything it changes, so
it can be run repeatedly without re-seeding.

> The login limiter allows `AUTH_RATE_LIMIT` attempts per IP per 15 minutes (default 20).
> Each suite uses a dozen or so; raise it in `.env` to run them back to back.

---

## Browser tab title

The tab reads `Admin Panel (<page>)` — `Admin Panel (Review Queue)`, `Admin Panel
(Categories)`, and so on — so several open tabs stay distinguishable.

The route-to-name map lives in `src/hooks/useDocumentTitle.ts` and is matched in order,
because `/influencers/new` and `/influencers/:id/edit` would otherwise be caught by the
`/influencers/:id` rule first. `index.html` ships `Admin Panel` as the pre-React default,
so the tab is never briefly blank or wrong.

Add a route, add a line to that map.

---

## Packages

An influencer lists what they sell and what it costs — "Instagram Reel, ₹3,000, 5 days".
Each one goes through the same gate as the profile itself: **submitting is not
publishing.**

```
Influencer writes a package  →  pending  →  admin reviews  ─┬─ approve → public
                                                            └─ reject  → stays private, with a reason
```

- **Editing an approved package sends it back to `pending`**, so it leaves the public
  profile until it is reviewed again. That is deliberate: a price nobody checked should
  not sit under a verified badge. The trade-off is that fixing a typo briefly hides the
  package — the app says so before the influencer starts typing, not after they submit.
- **Its own collection, not an array on Influencer**, because each package carries its
  own review state and admins work through pending ones across everybody.
- **Ownership is enforced by the query**, not by a check: `findOne({ _id, influencer })`
  means another influencer's id simply does not match, and returns 404.
- Capped at 12 per influencer — a profile is a shop window, not a catalogue.
- Admins get a notification on every submission and edit; the influencer gets one on
  every approval and rejection, with the reason.
- **A package is only as visible as its influencer.** If the profile is pending,
  rejected or archived, the profile itself is not public — so neither is anything on it,
  approved or not. The admin queue flags those rows and the approve dialog says so,
  because approving there achieves nothing on its own.
- **The public profile refetches on focus.** It stays mounted in the stack, so a package
  approved while a viewer was on another screen would otherwise never appear when they
  came back. The directory lists refresh the same way, so a card never outlives the
  profile behind it — and if one does, the profile says *"No longer listed"* with a way
  back rather than a dead end.
- **Both sides update live.** A notification tells someone *that* something happened;
  `package:changed` tells their client the *list* is stale. Without the second one an
  approved package kept showing "Under review" on the influencer's profile until they
  pulled to refresh, and a second admin's queue never moved. The event goes to the
  owner and to every admin, because a shared queue changes for everyone.

Prices are whole rupees. Storing rupees rather than paise keeps the API and the admin UI
honest about what the number means.

---

## Confirmations

Every admin action that writes, deletes or ends a session asks first — including the
reversible ones (approve, restore, show/hide a category) and signing out.

There is **one dialog for the whole dashboard**, awaited like a question:

```tsx
const { confirmed, reason } = await confirm(confirmArchive(influencer.name));
if (!confirmed) return;
```

`ConfirmProvider` owns the dialog; `src/lib/confirmations.ts` owns the wording. Keeping
both in one place is the point — six screens each managing their own dialog state is how
the messages drift apart and how an action quietly ships without one.

The copy says what will actually happen rather than "Are you sure?" — whether the
influencer is notified, whether they can still sign in, whether it can be undone. A
dialog that says nothing trains people to click through it.

Two deliberate exceptions:

- **The category create/rename modal is its own confirmation.** It is already a dialog
  with an explicit *Create category* / *Save changes* button; a second dialog on top
  would be worse, not safer.
- **An invalid form does not ask.** Validation runs first, so nobody confirms a save
  that cannot succeed.

Cancel, Escape and a backdrop click all dismiss without acting. A destructive action
gets a red confirm button and a warning icon; approve and restore get a green one.

---

## Pagination

Every admin list pages server-side at **20 rows by default**, so the server never
assembles more than one page at a time. The bar under each list carries a **Previous**
and **Next** button plus numbered pages for jumping, and a summary of what is on screen
(`21–40 of 44 influencers · page 2 of 3`).

- **It is always visible**, even on a single page, where both buttons simply sit
  disabled. Hiding it entirely made it look as though pagination had not been built.
- **Revisiting a page costs nothing.** React Query caches each page by its filters, so
  going back through Previous is served from memory — measured: stepping across three
  already-visited pages issued one request, and only because that page had gone stale.
- **Paging never blanks the screen.** `placeholderData` holds the current page in place
  until the next one arrives, instead of collapsing to a spinner.
- **Deleting the last row on the last page** steps back rather than stranding the user
  on an empty page.

Categories page the same way. Their dropdown elsewhere in the admin asks for the full
list explicitly (`?limit=200`), because a filter that only offered the first 20 options
would silently hide the rest.

---

## Theming

The dashboard ships dark and light. The control is the sun/moon button in the top right
of the topbar (and on the login screen, which renders outside the dashboard shell).

- **Default follows the OS.** Until the admin picks one, `prefers-color-scheme` decides,
  and a live OS change is applied immediately. Once they choose, that choice is stored
  in `localStorage` and wins.
- **No flash on load.** An inline script in `index.html` sets `data-theme` on `<html>`
  before first paint, so the page never renders in the wrong theme and then correct itself.
- **Components never branch on the theme.** `--ink-*` is a *surface elevation* scale, not
  a fixed colour ramp: 1000 is the page and lower numbers sit closer to the reader. Dark
  mode makes 1000 near-black and raised surfaces lighter; light mode inverts it. Every
  component just asks for an elevation.
- **Both themes were measured, not eyeballed.** Every text token clears WCAG AA (4.5:1)
  against the surface it actually sits on. The status chip colours are darkened in light
  mode for exactly this reason, and dark mode's `--text-3` was lifted from `#6f6f88`
  (4.05:1) to `#7e7e99` after the audit.

To add a colour, define it in both blocks in `src/styles/theme.css`. If a value is
theme-dependent, it belongs there — not inline in a component.

---

## Realtime

Socket.IO runs on the same port as the API. Every socket authenticates with the same JWT
as the REST calls, then joins `user:<id>`, and admins additionally join `admins`.

| Event | Direction | Effect |
|---|---|---|
| `notification:new` | server → recipient | Bell badge increments; toast on the admin, badge on the app's Updates tab |
| `influencer:changed` | server → admins | Influencer list and dashboard counters refetch |
| `session:revoked` | server → one influencer | App signs out immediately and shows why |
| `package:changed` | server → the owner **and** all admins | Both sides refetch their package list |

**Notifications are stored in MongoDB, not just emitted.** A socket only reaches a client
that is connected right now, so the unread count and the history come from the API; the
socket is the instant-delivery path on top. That is why an influencer who was archived
while offline still sees the explanation when they next sign in.

**Forced logout is enforced twice, on purpose.** `session:revoked` handles a connected
app instantly, and `requireActiveInfluencer` re-checks approval on every influencer
request — so a token issued before an archive stops working even for a client that was
offline, force-quit, or ignoring its socket. The socket is UX; the middleware is security.

Notifications older than 60 days are removed by a TTL index.

---

## API

| Method | Route | Access |
|---|---|---|
| `POST` | `/api/auth/register` | public — creates a `pending` influencer |
| `POST` | `/api/auth/login` | public — blocked unless `approved` and not archived |
| `GET` | `/api/auth/me` | any signed-in user |
| `GET` | `/api/public/influencers` | public — approved + non-archived only |
| `GET` | `/api/public/influencers/:id` | public |
| `GET` | `/api/public/influencers/:id/packages` | public — approved packages only |
| `GET` | `/api/public/categories` | public |
| `GET` | `/api/public/locations` | public — approved, non-archived only |
| `GET`·`PUT` | `/api/influencer/profile` | influencer — own record, cannot set `status` |
| `POST` | `/api/influencer/profile/image` | influencer — multipart upload |
| `GET`·`POST` | `/api/influencer/packages` | influencer — own packages, any status |
| `PUT`·`DELETE` | `/api/influencer/packages/:id` | influencer — scoped to the owner |
| `GET` | `/api/admin/stats` | admin |
| `GET` | `/api/admin/locations` | admin — options scoped to a status/archived window |
| `GET` | `/api/admin/packages` | admin — review queue, defaults to pending |
| `PATCH` | `/api/admin/packages/:id/{approve,reject}` | admin |
| `DELETE` | `/api/admin/packages/:id` | admin |
| `GET`·`POST` | `/api/admin/influencers` | admin |
| `GET`·`PUT`·`DELETE` | `/api/admin/influencers/:id` | admin |
| `PATCH` | `/api/admin/influencers/:id/{approve,reject,archive,restore}` | admin |
| `POST` | `/api/admin/influencers/bulk` | admin — `delete` needs `confirm: true` |
| `GET`·`POST` | `/api/admin/categories` | admin |
| `PUT`·`DELETE` | `/api/admin/categories/:id` | admin — in-use categories cannot be deleted |

## Data model

```
User                      Influencer                      Category
├── name                  ├── user  ─────→ User           ├── name
├── email (unique)        ├── name, email, phone, bio     ├── slug
├── password (bcrypt)     ├── profileImage                ├── icon
├── role: admin|influencer├── social { instagram,youtube} └── isActive
└── isActive              ├── category ──→ Category
                          ├── location { country,state,city }
                          ├── status: pending|approved|rejected
                          ├── rejectionReason
                          ├── reviewedBy ─→ User, reviewedAt
                          ├── isArchived, archivedAt
                          └── createdBy: self|admin
```

Auth and profile are separate collections: login concerns stay in `User`, everything
the directory renders stays in `Influencer`. An admin can also create a **directory-only**
listing by leaving the password empty — it appears publicly but has no login.

---

## Database connection not working?

Run `cd backend && npm run db:check` first — it names the cause. The usual ones:

| Symptom | Cause | Fix |
|---|---|---|
| Still connects to `127.0.0.1` | You edited `.env.example` instead of `.env` | Put the URI in `backend/.env` |
| `Server selection timed out` | Your IP is not allowlisted in Atlas | Atlas -> **Network Access** -> Add IP Address -> *Add Current IP Address* |
| `bad auth : authentication failed` | Wrong password, or specials not encoded | Encode in the URI: `@`->`%40` `#`->`%23` `/`->`%2F` `:`->`%3A`. Or set a new alphanumeric password in Atlas -> Database Access |
| `querySrv ENOTFOUND` | Cluster hostname typo, or DNS blocks SRV | Re-copy the string from Atlas -> Connect -> Drivers |
| Connects, but every list is empty | Database never seeded | `npm run seed` |

**Admin shows "The API is not responding"** — the backend is not running. Start it with
`npm run dev` in `backend/`, or just use `./start.sh`.

**Admin shows "Cannot reach the dev server"** — Vite is not running (you are probably
looking at a stale browser tab). Start it with `npm run dev` in `admin/`.

Atlas connection strings must include the **database name** before the `?`:

```
mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/aura?retryWrites=true&w=majority
                                                  ^^^^^
```

Without it the driver connects to `test` and every collection looks empty.

---

## Production notes

Before deploying, these still need doing:

- Set a long random `JWT_SECRET` and restrict `CLIENT_ORIGINS` to your real domains.
- Move uploads off local disk to S3/Cloudinary — `backend/uploads/` does not survive a
  container restart.
- Wire the approve/reject emails. `LOGIN_BLOCKED_MESSAGE` in
  `backend/src/config/constants.ts` already holds the copy.
- `app/` contains its own `.git` from `create-expo-app`. Remove it if you want one
  repository for the whole project.
