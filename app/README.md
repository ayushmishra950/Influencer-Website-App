# Aura — creator app

Expo (SDK 57) app for influencers and for anyone browsing the public directory.

## Screens

| Route | What it does |
|---|---|
| `welcome` | **Signed-out landing** — the only screen a visitor sees before signing in. No tab bar. |
| `(tabs)/index` | Home for signed-in users — hero, live stats, spotlight carousel, category grid, newest creators |
| `(tabs)/alerts` | Notification inbox with unread badge (signed in only) |
| `(tabs)/profile` | Signed-in creator's profile, or the sign-up pitch when signed out |
| `creators` | Full directory — search, category filter, infinite scroll |
| `about` | What Aura is, why it is verified, and how joining works |
| `influencer/[id]` | Public creator profile with social links |
| `(auth)/login` | Sign in — surfaces the pending/rejected/archived reason |
| `(auth)/register` | Self-registration, submits as `pending` |
| `(auth)/pending` | Post-registration explainer with the review timeline |

## About page

`app/about.tsx` explains what the product is for: why an open directory is worse than a
reviewed one, what brands get, what creators get, and the three-step join flow.

**It is one of the few routes open without an account** (`PUBLIC_SEGMENTS` in the root
layout), because it is what someone reads *before* deciding whether to register. An
**About Aura** button sits on the welcome screen under Sign in; signed-in users reach it
from the landing page and the Profile tab.

Its back arrow falls back to `/welcome` for a signed-out reader and `/(tabs)` otherwise,
so nobody is bounced off the auth gate on the way out.

Its numbers come from `/api/public/stats`; a failed fetch just hides them rather than
blocking the page.

## Navigation

**The app requires an account.** A signed-out visitor only ever sees `welcome`, with a
Sign in button and a Create account link. The tab bar does not exist for them — a
half-usable app with tabs leading to gated screens reads worse than one clear way in.

This is enforced in two places: a `useSegments` gate in the root layout redirects any
non-public route to `welcome`, and `(tabs)/_layout` returns a `<Redirect>` of its own so
the tab bar cannot flash during the frame before that lands.

Every pushed screen gets the same back arrow in the top left, defined once in the
stack's `headerLeft` (`components/BackButton.tsx`) rather than per screen.

It falls back to the landing page when there is no history — which happens on a deep
link, a web reload, or after a forced sign-out — so the arrow is never a dead end.
`(auth)/pending` is the one screen without it: registration is already submitted there,
and going "back" into the form would be wrong.

## Running

```bash
npm install
npx expo start
```

The API host is auto-detected from the Expo dev server, so a physical phone reaches
your laptop without any configuration. Set `EXPO_PUBLIC_API_URL` in `.env` to override —
required for web and for any real build.

The backend must be running (see the [root README](../README.md)).

## Theming

The app ships dark and light, matching the admin dashboard. The sun/moon control sits
top-right on every screen: in `headerRight` for pushed screens, and inline in the header
each tab screen draws for itself.

- **Default follows the device**, until the user picks a theme; that choice is stored in
  AsyncStorage and wins from then on.
- **Screens never branch on the theme.** `ink*` is a surface *elevation* scale — 1000 is
  the screen, lower numbers sit closer to the reader. Dark mode makes 1000 near-black and
  raised surfaces lighter; light mode inverts it. Components bind the live palette with
  `const { colors: Colors } = useTheme()`, so every token name reads the same as before.
- **`StyleSheet.create` cannot read a live theme** — it resolves once. `components/ui.tsx`
  builds one sheet per palette and caches it, so the cost is two sheets for the app's life.
- **The hero band is a brand surface, not a themed one.** It stays violet in both themes
  and always carries light text (`Hero` in `theme/tokens.ts`). Fading it to the page
  background in light mode would put dark body text over saturated violet.
- **Controls on the hero take their icon colours from `Hero` too.** A theme-derived
  colour breaks there for the same reason the text does: light mode's amber is dark, and
  on violet it vanishes. The theme toggle keeps one shape and one size everywhere, and
  only swaps its surface — hero scrim over the gradient, `ink800` on a normal screen.
- **Both themes were measured.** Every text element on every screen clears WCAG AA
  (4.5:1) against the surface it actually sits on, with translucent layers flattened.
  Category accents have separate light values because the bright hues that work on a
  near-black card are unreadable on a white one — and they are darker than plain white
  would need, since the chip sits on its own tint inside a tinted card.

## Notes

- **Dark only.** `userInterfaceStyle` is `dark` so the app and the admin dashboard share
  one brand surface. Tokens live in `src/theme/tokens.ts`.
- **The landing page is curated, not a list.** Search and category tiles push through to
  `/creators` with the filter applied, which keeps the home screen from turning back
  into the flat feed it replaced. Its numbers come from `/api/public/stats`, and
  categories with no approved creators are hidden so a tile never opens onto nothing.
- **No UI framework.** `src/components/ui.tsx` is a small local kit (Txt, Card, Button,
  Field, Avatar, Chip, Banner) built on the tokens.
- Status is never editable in the app — only an admin can change it.
