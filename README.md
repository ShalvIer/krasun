# Krasun

Krasun is a responsive social map and chat MVP built as a TypeScript monorepo.
Users share live or frozen locations with groups, create spots, send direct and
group messages, and upload supported media.

## Stack

- React, Vite, Mapbox GL JS
- Express, Socket.IO
- PostgreSQL 16, Prisma
- Docker Compose for local and self-hosted production
- Render Blueprint for a managed beta deployment

## Local development

1. Copy the project environment example to `.env` and add development values.
2. Start the Docker stack:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:5173`.

## Validation

```bash
npm ci
npm run typecheck
npm test
npm run build
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md). Never commit `.env` files, tokens, uploads,
database dumps, or production credentials.
