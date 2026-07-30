# Krasun

Krasun is a local-first social coordination MVP that combines authenticated groups, persistent realtime chat, live location sharing, map avatars, saved spots, and route snapshots in one product. It is a clean-room TypeScript monorepo based on the behavior of `ShalvIer/krasun-map-mvp` and `ShalvIer/Draft-Chat-App`; those source repositories are reference-only and are not modified.

## What is included

- Google Identity Services login with server-side ID-token verification
- development-only demo login, disabled independently for production
- short-lived access JWTs kept in browser memory and rotating HTTP-only refresh cookies
- onboarding with unique usernames and optional alternate-email verification
- groups, owners/admins/members, open/approval/invite-only joining, invite regeneration
- persistent group and direct conversations with deduplicated DMs
- realtime text, audio, photo, typing, presence, map state, avatars, and spots over one authenticated Socket.IO connection
- application-level geolocation tracking with live, frozen, hidden, offline, and simulated movement states
- Mapbox map, custom emoji/photo/GIF/video markers, public/private spots, walking/driving snapshot routes
- responsive desktop navigation and mobile bottom navigation
- PostgreSQL persistence, Prisma migration and seed data, protected local media storage
- unit/regression tests, Docker Compose, and documented extension points

## Architecture

```mermaid
flowchart TD
  Browser["React + Vite client"] -->|REST + refresh cookie| API["Express API"]
  Browser <-->|authenticated Socket.IO| Realtime["Socket.IO handlers"]
  API --> DB[(PostgreSQL)]
  Realtime --> DB
  API --> Media["Protected upload volume"]
  API --> Google["Google ID-token verification"]
  API --> Mapbox["Mapbox Directions proxy"]
```

The geolocation watcher lives in `LocationProvider`, above route-level screens, so sharing does not stop when the user moves between Chat, Map, Groups, and Profile. The API derives socket identity from the access token and checks conversation/group authorization server-side.

## Repository layout

```text
apps/api/                    Express, Socket.IO, Prisma, uploads, tests
apps/api/prisma/             Schema, initial SQL migration, seed
apps/web/                    React application and nginx config
packages/shared-types/       Shared API/domain types
packages/shared-validation/  Zod input schemas
packages/shared-socket-events/ Typed client/server event contract
docs/                        Migration checklist, acceptance flow, extensions
app/                         Lightweight Sites-compatible product preview
docker-compose.yml           PostgreSQL + API + web
```

## Quick start with Docker

Requirements: Docker Engine with Docker Compose.

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Set the JWT/cookie secrets and, for the full map/auth experience, Google and Mapbox values described below.

3. Build and start all services:

   ```bash
   docker compose up --build
   ```

   The API container automatically applies checked-in Prisma migrations. Open `http://localhost:5173`; the API listens on `http://localhost:3001`.

4. Optional demo data:

   ```bash
   docker compose exec -w /app/apps/api api npm run db:seed
   ```

PostgreSQL and uploads use named volumes, so data survives container restarts.

## Local development without Docker

Requirements: Node.js 20.19+ and PostgreSQL 16+.

```bash
cp .env.example .env
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:app
```

For a host-installed PostgreSQL server, change `DATABASE_URL` from host `postgres` to `localhost`, for example:

```dotenv
DATABASE_URL=postgresql://krasun:krasun@localhost:5432/krasun
UPLOAD_DIR=./apps/api/uploads
```

`npm run dev:app` starts the API on port 3001 and the Vite client on port 5173. `npm run dev` serves the lightweight product preview used by the Sites-compatible root. The checked-in migration is suitable for deployment via `npm run db:deploy`; `npm run db:migrate` is the development command for creating/applying future migrations.

## Google OAuth setup

1. In Google Cloud Console, configure the OAuth consent screen.
2. Create an OAuth 2.0 Client ID of type **Web application**.
3. Add `http://localhost:5173` as an authorized JavaScript origin.
4. Put the same client ID in both `GOOGLE_CLIENT_ID` (server verification) and `VITE_GOOGLE_CLIENT_ID` (browser button).

The current flow verifies a Google ID token and does not require the client secret. `GOOGLE_CLIENT_SECRET` is reserved for a future authorization-code flow and must remain server-only.

For offline development, `ENABLE_DEV_AUTH=true` and `VITE_ENABLE_DEV_LOGIN=true` expose a clearly labeled demo login. Set both to `false` in production.

## Mapbox setup

Create a Mapbox public token and set:

```dotenv
VITE_MAPBOX_TOKEN=pk.your-public-browser-token
MAPBOX_SERVER_TOKEN=pk.your-directions-capable-token
```

The browser token renders the map. The server token calls the Directions API so routing credentials and request policy stay server-controlled. Never place an `sk.*` token in a `VITE_*` variable because Vite values are public.

## Environment contract

Browser-visible variables:

- `VITE_API_URL`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_MAPBOX_TOKEN`
- `VITE_ENABLE_DEV_LOGIN`

Server-only variables:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `COOKIE_SECRET`
- `MAPBOX_SERVER_TOKEN`
- upload directory/size limits and `ENABLE_DEV_AUTH`

Use independent random values of at least 32 characters for each token/cookie secret.

## Seed and two-user acceptance test

The seed creates Andron, Lena, a Toronto group, conversation history, a public spot, a frozen location, and an emoji map avatar. Invite code: `TORONTO26`. The development login intentionally represents one fixed account; use two Google accounts or adjust the local-only demo identity for a two-user realtime test.

The complete manual flow is in [`docs/ACCEPTANCE_FLOW.md`](docs/ACCEPTANCE_FLOW.md). It covers group joining, text/audio/photo messages, typing, live/frozen/hidden location, spot privacy, Show Public Spots, direct-message deduplication, deleted spot cards, and both route modes.

## Verification commands

```bash
npm run typecheck
npm run lint
npm run test:workspaces
npm run build:workspaces
npm test
```

`npm test` also builds and validates the lightweight Sites preview artifact. Unit tests cover auth mode gating, group policy, DM pair stability, upload validation, status expiry, hidden/frozen map presentation, and the Show Public Spots regression.

## Storage and security notes

- Uploaded audio/photos/avatar media are randomized files outside the public web root; metadata and ownership live in PostgreSQL, and downloads pass through authenticated routes.
- Upload MIME type and size are validated, but production should add content-signature scanning and malware scanning.
- The default disk adapter is intended for a single local instance. Replace it with object storage before horizontally scaling; the database model and URL boundary are already separated for that change.
- Access tokens are not stored in local storage. Refresh tokens are hashed in PostgreSQL, rotated on use, and sent only in HTTP-only cookies.
- Helmet, CORS allowlisting, rate limiting, Zod validation, group/conversation authorization, and owner-only private spot checks are enabled.
- This MVP does not provide end-to-end encrypted chat, push notifications, moderation tooling, background mobile location, automatic rerouting, or production observability.

## Extension points

The message enum reserves `MEETING`, `VIDEO`, and `FILE`; profile identities support additional OAuth providers; storage and route calls are behind server boundaries. See [`docs/EXTENSIONS.md`](docs/EXTENSIONS.md) for planned meetings, nearby-place providers, object storage, native background location, Redis fan-out, and production hardening.

## Migration notes

The former chat app stored audio as PostgreSQL `bytea`; Krasun stores media as protected files with attachment metadata. The map MVP's in-memory identities and browser-only avatar persistence are replaced with authenticated users and durable PostgreSQL records. A detailed behavior-by-behavior checklist is in [`docs/MIGRATION_CHECKLIST.md`](docs/MIGRATION_CHECKLIST.md).
