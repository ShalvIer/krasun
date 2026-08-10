# Krasun MVP deployment

## Recommended managed beta: Render

`render.yaml` deploys a no-cost test environment from GitHub:

- one Docker web service serving the React app, Express API, and Socket.IO on
  the same origin;
- one managed PostgreSQL 16 database;
- generated JWT and cookie secrets;
- development login disabled.

During Blueprint creation, Render prompts for:

- `GOOGLE_CLIENT_ID`;
- `VITE_MAPBOX_TOKEN` (public browser token);
- `MAPBOX_SERVER_TOKEN` (secret token used for Directions).

After the first deploy, add the assigned `https://...onrender.com` URL to the
Google OAuth client's authorized JavaScript origins.

The free configuration is for testing only. Its database expires after 30 days,
the service can sleep after inactivity, and uploaded media uses an ephemeral
filesystem. Upgrade before inviting beta users.

`render.production.yaml` is the durable variant. It uses a paid web service, a
managed paid PostgreSQL database, and a 1 GB persistent disk mounted at
`/app/uploads`. Confirm current Render pricing before applying it.

## Production baseline

The production compose file runs PostgreSQL 16, the API, the web application,
and Caddy. Only ports 80 and 443 are public. PostgreSQL and the API remain on a
private Docker network. Caddy provisions HTTPS automatically after the domain's
DNS record points to the server.

## First deployment

1. Install Docker Engine and the Compose plugin on a Linux server.
2. Point the chosen domain's `A`/`AAAA` record to the server.
3. Copy `.env.production.example` to `.env.production`.
4. Replace every placeholder. Generate each secret independently:

   ```bash
   openssl rand -hex 32
   ```

5. In Google Cloud, add `https://YOUR_DOMAIN` as an authorized JavaScript
   origin for the OAuth client.
6. Start the stack:

   ```bash
   docker compose --env-file .env.production \
     -f docker-compose.production.yml up -d --build
   ```

7. Verify:

   ```bash
   docker compose --env-file .env.production \
     -f docker-compose.production.yml ps
   curl -fsS https://YOUR_DOMAIN/health
   ```

Prisma migrations run automatically when the API container starts.

## Database choices

The default configuration stores PostgreSQL in the `postgres_data` Docker
volume on the deployment server. For managed PostgreSQL, set `DATABASE_URL` in
`.env.production` to the provider's TLS connection string. Do not point a
public deployment at PostgreSQL running on a laptop: it is unreliable and
would require exposing a sensitive database over the internet.

Back up both `postgres_data` and `uploads_data`. Test restoring backups before
opening the beta to users.

## Session policy

- access JWT: 15 minutes;
- logout after 24 hours without a successful refresh;
- absolute refresh-session lifetime: 7 days;
- refresh token: rotated and stored only in a Secure, HttpOnly cookie.

These values are configurable in `.env.production`.

## Email notifications for messages

Krasun can send transactional email through Resend when a recipient has
explicitly enabled **Email for missed chat messages** in Settings. Delivery is
suppressed while any of that user's connected devices has the same conversation
open. A unique database record and a provider idempotency key prevent duplicate
delivery for the same message and recipient.

The Render hostname is the application URL, but it cannot be used as a sender
domain. Before enabling delivery:

1. Buy a domain and verify a sending subdomain in Resend, for example
   `notify.example.com`.
2. Add `RESEND_API_KEY` to the API service's Render Environment.
3. Set `EMAIL_FROM` to a sender on the verified domain, for example
   `Krasun <notifications@notify.example.com>`.
4. Redeploy the API. The database migration runs automatically.

Leave both variables empty until the domain is verified. The preference remains
available in Settings, but the UI reports that delivery is not configured and
the server does not attempt to send mail.

## End-to-end encryption

This release is not end-to-end encrypted. HTTPS encrypts traffic in transit,
and authorization limits conversation access, but the server still processes
and stores readable messages. JWT authenticates requests; it does not encrypt
message contents.

Before implementing E2EE, define device identity keys, per-conversation key
distribution, group-member removal, multi-device synchronization, attachment
encryption, key verification, and account recovery. Use an audited protocol and
cryptographic library; do not invent a custom cipher or claim E2EE before an
independent security review.
