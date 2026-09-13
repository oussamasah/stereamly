# Streamly Project Description

Updated: 2026-09-13

Streamly is a full-stack streaming platform for movies, series, live TV and sports. It has a public viewer application, an authenticated account area, and an admin back office for managing sources, imports, users, catalog data, EPG data and playback providers.

The project is a monorepo:

- `apps/web`: Next.js App Router frontend.
- `apps/api`: NestJS backend API.
- `apps/api/prisma`: Prisma schema, migrations and seed.
- `deploy`: production Docker/Caddy configuration.
- `scripts`: operational smoke checks used by root package scripts.

## Runtime Architecture

The frontend is a localized Next.js app with routes under `/:locale`. Supported locales are French, English and Arabic. The web app calls the backend through `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:4000/api/v1`.

The backend is a NestJS API with a global `/api/v1` prefix. It uses PostgreSQL through Prisma, Redis for infrastructure support, JWT access tokens, refresh cookies, role guards and DTO validation.

Core backend modules include:

- Authentication and account security.
- Catalog management for channels, movies, series, packages and metadata.
- Source management for IPTV/M3U/Xtream/Portal-style upstream sources.
- Import jobs for source catalog ingestion.
- Playback session creation and gateway streaming.
- Platform snapshot and public viewing bindings.
- Provider template management for admin-configured movie/series embed servers.
- User library, favorites, progress, history and search history.

## Public User Experience

The public site provides:

- Home page with discovery rails.
- Movies page.
- Series page.
- Live TV page.
- Sports page.
- Search page.
- Watch page.
- My List.
- Account and authentication pages.

Movies and series use TMDB metadata in the browser when `NEXT_PUBLIC_TMDB_API_KEY` is configured. A movie route uses the TMDB movie ID. A series route uses the TMDB TV ID, season number and episode number.

The watch route supports:

- `/:locale/watch/movie/:id`
- `/:locale/watch/tv/:id?season=1&episode=1`
- `/:locale/watch/channel/:id`
- `/:locale/watch/event/:id`
- `/:locale/watch/iptv/:encodedUrl`

For TMDB movie and TV pages, metadata and artwork come from TMDB, while playback URLs come from active admin-managed stream providers.

For live channels and imported catalog content, playback goes through backend-managed variants and sessions.

## Admin Experience

Admin pages are protected by role-based access. Admin roles include:

- `CONTENT_MANAGER`
- `TECHNICAL_ADMIN`
- `SUPER_ADMIN`

`SUPER_ADMIN` can manage users. `TECHNICAL_ADMIN` and `SUPER_ADMIN` can manage technical source/import workflows. Provider management is available to admin roles through `/admin/providers`.

Important admin sections:

- `/admin`: admin dashboard.
- `/admin/providers`: stream provider template management.
- `/admin/sources`: IPTV/source vault management.
- `/admin/imports`: import jobs and source catalog review.
- `/admin/catalog`: catalog administration.
- `/admin/epg`: EPG administration.
- `/admin/users`: user access management for super admins.
- `/admin/help`: admin guidance page.

The first administrator can be created with:

```powershell
npm run admin:bootstrap
```

The bootstrap script creates an active, verified `SUPER_ADMIN` account and asks for the password interactively so secrets are not stored in source code.

## Provider Management

Streamly includes an admin-managed provider engine for TMDB movie and series playback. Providers are stored in the `StreamProvider` Prisma model.

Provider fields:

- `name`: display name shown to admins and users.
- `slug`: unique stable identifier.
- `category`: `vod`, `live` or `sports`.
- `movieTemplate`: movie embed URL template.
- `tvTemplate`: TV episode embed URL template.
- `streamUrl`: direct stream URL, usually HLS.
- `isActive`: controls whether the provider is visible to the player.
- `rank`: ordering priority.

The public endpoint:

```text
GET /api/v1/providers?category=vod
```

returns active providers ordered by rank.

The admin CRUD endpoints stay under:

```text
/api/v1/admin/providers
```

The admin provider manager has a two-column interface:

- Left column: quick source creator.
- Right column: active sources and test bench.

The quick creator includes presets for:

- VidSrc.
- VidLink.
- 2Embed.
- Custom HLS.

For VOD providers, URL templates support:

- `{id}`: TMDB movie or TV ID.
- `{s}`: season number.
- `{e}`: episode number.

Example movie template:

```text
https://vidsrc.me/embed/movie/{id}
```

Example TV template:

```text
https://vidsrc.me/embed/tv/{id}/{s}/{e}
```

The admin test bench uses a test TMDB ID, defaulting to `550`, and renders a preview. Iframe providers are previewed in a sandboxed iframe inside the admin dashboard. HLS providers are previewed with `hls.js` or native browser HLS when available.

## Movie And Series Playback

The public TMDB player is implemented in:

```text
apps/web/src/features/viewing/player.tsx
```

When the target starts with `tmdb:`, the player fetches active VOD providers from:

```text
NEXT_PUBLIC_API_URL + /providers?category=vod
```

It then creates selectable playback sources from the stored templates.

For movies:

```text
tmdb:movie:{id}
```

uses `movieTemplate`.

For TV episodes:

```text
tmdb:tv:{id}:s:{season}:e:{episode}
```

uses `tvTemplate`.

The player replaces placeholders and renders either:

- an HLS `<video>` player for `.m3u8` URLs.
- an iframe embed for provider player URLs.

The public embed iframe intentionally has no `sandbox` attribute because several third-party provider engines fail inside sandboxed frames. It still uses a cross-origin iframe, `allow` permissions, fullscreen support and `referrerPolicy="origin"`.

Current iframe permissions:

```text
autoplay; fullscreen; picture-in-picture; encrypted-media
```

## Live TV Playback

Live TV content can come from imported sources. Admins configure source accounts in `/admin/sources`.

Supported source types include:

- M3U playlists.
- Xtream-style accounts.
- Portal/MAC-style sources.
- Direct sources.

Source credentials and imported stream references are handled server-side. Sensitive stream values are encrypted before storage when they are part of the source/import pipeline.

Admins can:

- create source accounts.
- upload or reference playlists.
- test sources.
- enable or disable sources.
- import channels.
- review staged items.
- publish selected channels.

Live channels are stored as catalog `Channel` records. Playback variants link channels to playable stream references. The user-facing live guide fetches channels and EPG data, lets users filter by country/language/category/favorites, and opens the selected channel in the player.

The secure live player is implemented in:

```text
apps/web/src/components/secure-player.tsx
```

It calls:

```text
POST /api/v1/playback/sessions
```

The API validates access, selects an enabled playback variant, creates a playback session and returns a manifest URL. The player supports:

- MPEG-TS through `mpegts.js`.
- HLS through native browser support or `hls.js`.
- file playback through the native video element.
- DASH/manifest playback through Shaka Player.

The player also sends heartbeats, records progress for movies and episodes, and reports basic QoE events.

## Sports

Sports are represented as events in the platform layer. Events include:

- title.
- sport.
- competition.
- start and end time.
- status.
- published flag.

Published events appear in the public sports experience. A sports event can have a playback binding or provider-managed stream path depending on how admins configure the content.

## Catalog Management

The backend catalog stores:

- channels.
- media titles.
- movies.
- series.
- seasons.
- episodes.
- genres.
- credits.
- artwork.
- external IDs.
- packages and prices.
- publication status.

Movies and series can exist in two ways:

- Public TMDB-driven browsing for lightweight movie/series discovery.
- Imported or admin-managed catalog entities in PostgreSQL.

Publication status controls whether catalog content is draft, scheduled, published or archived. Channels also have `webAvailable` and rights/availability metadata.

## Library, History And Accounts

Users can register, log in, verify email, reset passwords and maintain account sessions.

Viewer library features include:

- favorites.
- continue watching.
- playback progress.
- viewing history.
- search history.
- import/export of library data.

Guest/local viewing data can be stored in the browser for the lightweight viewing experience. Signed-in users can synchronize library data through API endpoints.

## Search And Discovery

The web app includes search and browsing experiences for movies, series, channels and user history. TMDB search is available when a public TMDB key is configured. Backend search and library search work against stored catalog and user records.

Discovery collections and home rails can be managed by the platform/editorial modules. The home page renders available movies, series, live channels and curated sections based on available data.

## EPG

EPG support is provided for live TV. Admins can import XMLTV data, map external channel IDs to internal channels and display program schedules.

The live guide shows:

- current program.
- next program.
- 24-hour guide details.
- stale guide warning when data is old.

Program reminders are stored for authenticated users.

## Security Model

Implemented protections include:

- bcrypt password hashing.
- JWT access tokens.
- refresh cookies.
- role-based guards.
- DTO validation.
- CORS configuration.
- Helmet middleware.
- source credential encryption.
- source URL policy validation.
- playback sessions with expiring stream access.
- admin bootstrap without command-line passwords.

Public TMDB provider iframe embeds are not sandboxed in the customer player for compatibility with provider engines. Admin preview iframes stay sandboxed because they are only for quick testing and do not replace the public playback path.

## Database

The Prisma schema is in:

```text
apps/api/prisma/schema.prisma
```

Main model groups:

- identity: `User`, tokens and devices.
- catalog: `Channel`, `MediaTitle`, `Movie`, `Series`, `Season`, `Episode`, `Genre`, images and credits.
- source/import: `SourceAccount`, `SourceSecret`, `ImportJob`, staged and imported source items.
- playback: `PlaybackVariant`, `PlaybackSession`, `VariantHealth`, QoE events.
- library: favorites, progress, search history and viewer library items.
- provider engine: `StreamProvider`.
- live guide: EPG mappings, programs and reminders.
- commerce foundation: packages, carts, orders, subscriptions and entitlements.

Seed data is in:

```text
apps/api/prisma/seed.ts
```

It inserts default VOD stream providers.

## Development Commands

Install dependencies:

```powershell
npm install
```

Start local infrastructure:

```powershell
docker compose up -d
```

Generate Prisma client:

```powershell
npm run db:generate
```

Apply migrations:

```powershell
npm run db:deploy
```

Seed default providers:

```powershell
node apps/api/scripts/prisma.cjs db seed
```

Run dev servers:

```powershell
npm run dev
```

Run typechecks:

```powershell
npm run typecheck
```

Run tests:

```powershell
npm test
```

Build:

```powershell
npm run build
```

## Production Notes

Production deployment uses Docker Compose and Caddy files under `deploy` and `compose.production.yaml`.

Before production use:

- set real secrets in `.env.production`.
- use strong `JWT_SECRET`, `TOKEN_PEPPER` and `SOURCE_ENCRYPTION_KEY`.
- configure SMTP if email verification/reset flows are required.
- run database migrations.
- create a real super admin account.
- verify provider legality and availability.
- run full tests and browser smoke checks.
- confirm CORS and public URLs.
- back up PostgreSQL and any upload volumes.

## Current Feature Summary

Streamly currently provides:

- Public multilingual streaming interface.
- TMDB movie and series browsing.
- Dynamic admin-managed VOD provider templates.
- Movie and episode playback via active provider templates.
- Live TV catalog and playback through secured backend sessions.
- Source vault for IPTV-style upstream sources.
- M3U upload/import workflows.
- Channel publishing from imported sources.
- EPG import and live guide display.
- Sports event scheduling foundation.
- User accounts and session security.
- Admin roles and super-admin user management.
- Favorites, history and continue-watching data.
- Search and discovery UI.
- Docker-based local and production infrastructure.
