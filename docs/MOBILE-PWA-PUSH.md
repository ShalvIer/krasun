# Krasun mobile PWA and Web Push

This build keeps the existing React/Vite, Express, Socket.IO, Prisma, Supabase and Render architecture. It adds a mobile-first app shell, installable PWA support, unread state and background Web Push.

## Included

- Mobile navigation with Map, Chat, Groups and Profile.
- Mobile chat list and conversation views as separate screens.
- Safe-area and dynamic viewport support for iPhone keyboards.
- Compact map controls with a secondary action sheet.
- Mobile profile, group cards, settings and bottom-sheet modals.
- PWA manifest, app icon, offline shell cache and service worker.
- Per-device push subscriptions stored in PostgreSQL.
- System notifications for text, media and structured messages.
- Notification click opens the correct conversation.
- Unread counters backed by `ConversationParticipant.lastReadAt`.
- Realtime Socket.IO updates while Krasun is open.
- Supabase Storage media handling preserved.

## One-time Web Push setup

Generate one VAPID key pair on a trusted development machine:

```bash
npx web-push generate-vapid-keys
```

Add these environment variables to the Render API service:

```text
VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<generated private key>
VAPID_SUBJECT=mailto:<your contact email>
```

Do not add the private key to GitHub or frontend variables. The public key is returned to authenticated clients by the API.

## Deploy

The API Docker image uses Node.js 22. On deploy, Prisma applies `20260804000000_web_push` and creates the `PushSubscription` table.

Before pushing, run:

```bash
npm ci
npm run typecheck
npm run test
npm run build
```

## iPhone test

1. Open Krasun in Safari.
2. Use Share → Add to Home Screen.
3. Open the installed Krasun icon.
4. Open Profile → Settings.
5. Press Enable notifications and approve the system prompt.
6. Close Krasun and send a message from a second account.

On Android and desktop, the same Settings control creates a subscription for that browser/device. Each device can be enabled or disabled independently.

If a phone has no network connection, the push service can deliver after connectivity returns, subject to the browser and operating system delivery window.
