# What to wear

A mobile-friendly wardrobe cataloging + outfit randomizer app. Catalog clothes
with a photo, category, season, and colors; then generate outfit suggestions
filtered by season and scored for color harmony.

## Status

This is the initial scaffold:

- Add item (photo + category + season + color tags + optional style tags)
- Browse wardrobe (grid, filter by category, archive)
- Generate outfit (season filter, color-harmony scoring, reroll)

Not yet built: AI-assisted color/style tagging from the photo, Pinterest-based
style learning, and outfit history / "don't repeat this week" tracking (the
`outfit_log` table exists in the schema for this, just not wired up yet).

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Supabase (Postgres database + file storage for photos)

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account + new project.
2. In the project, open **SQL Editor** and run the contents of
   `supabase/migrations/0001_init.sql`. This creates the `items` and
   `outfit_log` tables plus a public `wardrobe-photos` storage bucket.
3. Go to **Project Settings -> API** and copy the **Project URL** and
   **anon public key**.

### 2. Configure the app

```bash
cp .env.local.example .env.local
```

Paste the URL and anon key into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 -- on your phone, use your computer's local
network IP instead of localhost (e.g. http://192.168.1.x:3000) so you can
test the camera upload flow on mobile.

### 4. Lock it down with a login (do this before deploying anywhere public)

1. In the Supabase SQL Editor, run `supabase/migrations/0002_auth_lockdown.sql`.
   **Do this only after step 2 below** -- it requires being signed in, so
   running it first would lock you out of your own data via the app (you can
   always still get in through the Supabase dashboard itself).
2. In Supabase, go to **Authentication -> Users -> Add user** and create an
   account (email + password) for yourself, and one for your partner if she
   wants her own login. Self-signup is intentionally not built into the app
   -- accounts are created by you in the dashboard only.
3. Visit the app -- you'll be redirected to `/login`. Sign in with the
   email/password you just created.

### 5. Deploy (so she can use it from her phone)

The easiest path is [Vercel](https://vercel.com):

1. Push this project to a GitHub repo.
2. Import the repo in Vercel.
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Vercel gives you a real `https://` URL.
5. On the iPhone, open that URL in Safari and use **Share -> Add to Home
   Screen**. It launches full-screen like an installed app, and the secure
   `https` connection is what makes the camera upload work reliably (it was
   flaky over plain `http://<lan-ip>` for the same reason `crypto.randomUUID`
   was).

## Notes on the data model

Each item has:

- `category`: top / bottom / dress / outerwear / shoes / accessory
- `season`: summer / winter / all_season
- `colors`: one or more hex colors (tagged manually when adding the item --
  used by the color-harmony scoring in `src/lib/wardrobe/colorHarmony.ts`)
- `style_tags`: free-form tags, currently unused by the generator but in
  place for the future Pinterest-style-learning phase

The outfit generator (`src/lib/wardrobe/generateOutfit.ts`) builds a random
candidate outfit (top+bottom, or a dress, plus optional shoes/outerwear/
accessory), scores a few candidates for color harmony, and keeps the best one.
"Reroll" tries again while avoiding the exact same combination.

## Security note

Row Level Security is enabled, and after running `0002_auth_lockdown.sql`
(see setup step 4) every read/write to `items` and `outfit_log`, plus photo
upload/delete, requires a signed-in Supabase Auth user. There's no per-user
data split -- every signed-in account sees the same shared wardrobe, which is
the point for a two-person household app. Wardrobe photos themselves stay on
a public storage bucket/URL (random-UUID filenames, not listable), which
keeps `imageUrl()` simple; that's a deliberate, low-risk tradeoff for casual
clothing photos, not a place with anything sensitive in it.
