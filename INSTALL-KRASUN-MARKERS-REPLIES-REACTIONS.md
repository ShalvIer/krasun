# Krasun markers, replies and reactions

This source snapshot includes:

- two-layer Mapbox markers whose positioning root remains under Mapbox control;
- date separators between messages from different local calendar days;
- persistent replies to text, photo and audio messages;
- persistent realtime reactions with six supported emoji;
- Prisma migration `20260811010000_message_replies_reactions`.

No new environment variables are required.

After integrating the source into a branch, run:

```bash
npm install
npm run db:generate
npm run typecheck
npm test
npm run build
```

Deployment must run the existing Prisma deployment command so the new migration is applied:

```bash
npm run db:deploy
```
