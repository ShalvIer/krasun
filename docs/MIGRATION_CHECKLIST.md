# Source migration checklist

The original repositories are references only and are never edited by this project.

## Map MVP (`ShalvIer/krasun-map-mvp`)

- [x] Preserve React, Mapbox dark map, custom HTML markers, statuses and spots.
- [x] Move `watchPosition` to an application-level provider so sharing survives route switches.
- [x] Preserve development movement simulation.
- [x] Preserve LIVE, FROZEN, HIDDEN and OFFLINE states; persist durable state in PostgreSQL.
- [x] Move avatar media from data URLs/localStorage to validated file uploads.
- [x] Replace room-local in-memory identities with authenticated users and memberships.
- [x] Correct spot privacy: private means owner-only; public requires a shared active group.
- [x] Replace the broken profile toggle with a user-filtered public-spots action that focuses bounds.
- [x] Add walking/driving snapshot route preview through a server proxy.

## Draft Chat App (`ShalvIer/Draft-Chat-App`)

- [x] Preserve room history, text/audio messages, MediaRecorder, typing and presence.
- [x] Rewrite the vanilla browser client in React + TypeScript.
- [x] Replace nickname trust with authenticated socket identity.
- [x] Replace rooms with group and direct conversations.
- [x] Add photo, spot and location messages.
- [x] Migrate audio from PostgreSQL `bytea` to files on disk plus database metadata.
- [x] Add conversation authorization and direct-message deduplication.

## New shared product work

- [x] One user/profile/group/permission model, database and Socket.IO connection.
- [x] Google ID-token verification, in-memory access token and HTTP-only refresh cookie.
- [x] Prisma schema/migration/seed, Docker Compose and local media volume.
- [x] Responsive shared navigation for Chat, Map, Groups and Profile.
- [x] Typed shared socket events and Zod validation.
- [x] Extension points for meetings, nearby places, cloud storage and other OAuth providers.
