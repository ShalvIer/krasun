# Krasun audio and chat scrolling fix v2

Extract this overlay into the existing `krasun app MVP` project. It is cumulative: it includes the earlier profile/map-avatar changes as well as the corrected audio and scrolling implementation.

## Install on macOS

```bash
cd "/Users/dronyashalver/Desktop/krasun app MVP"
unzip -o ~/Downloads/krasun-audio-scroll-fix-v2.zip
docker compose up -d --build api web
```

When the build finishes, close every old Krasun browser tab and reopen:

```text
http://localhost:5173
```

## Root causes corrected

- Message data pointed to `/api/media/:id`, while Express actually mounted the protected route at `/api/uploads/media/:id`.
- `scrollIntoView()` could move the whole application viewport instead of only the message history.
- The message grid item was allowed to grow with its contents instead of maintaining an internal scrolling region.
- Expired media authentication is refreshed, and genuine media errors now display their HTTP status with a Retry action.

Existing recordings do not need to be re-recorded. Their URL is generated again whenever conversation history loads.

No `.env`, secrets, database files, user uploads, dependencies, or generated build files are included.
