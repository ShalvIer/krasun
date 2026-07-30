# Install the Krasun deployment-ready patch

From the existing Krasun project directory:

```bash
unzip -o ~/Downloads/krasun-deployment-ready.zip
docker compose up -d --build api web
```

The API startup runs the included Prisma migration automatically. Close old
browser tabs and reopen `http://localhost:5173`.

## Local verification

1. Open Map. It should center on your saved current/last-known coordinate.
2. Confirm there is no Simulate button.
3. Press Share. Its play triangle becomes pause bars and the button says
   Sharing.
4. Press Freeze or Hide and verify another signed-in user no longer sees the
   location as live.
5. Stop sharing, close the tab, and reopen it. The previous coordinate may
   remain as last known, but its state must be Offline—not Live.
6. A session refresh after 24 hours of inactivity requires signing in again.

For an internet deployment, follow `DEPLOYMENT.md` and use
`docker-compose.production.yml`. Replace all production placeholders and rotate
all secrets before starting it.

This patch does not add or claim end-to-end encryption. HTTPS is prepared for
deployment; true E2EE remains a separate audited protocol project.
