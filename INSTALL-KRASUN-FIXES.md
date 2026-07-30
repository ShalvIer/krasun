# Krasun: four UI fixes

This archive contains only the changed web source files. Extract it into the root of the existing `krasun app MVP` project; do not delete or replace the rest of the project.

## Install on macOS

```bash
cd "/Users/dronyashalver/Desktop/krasun app MVP"
unzip -o ~/Downloads/krasun-four-fixes.zip
docker compose build web
docker compose up -d web
```

Then close old Krasun browser tabs and open `http://localhost:5173` again.

## Included changes

- Authenticated audio/image requests refresh expired access tokens and show a retry action instead of loading forever.
- Chat remains scrollable. Incoming messages only move the view when you are already near the bottom; sending your own message still moves to it.
- The current user's Profile page includes a complete map-avatar editor and preview.
- A selected person's configured emoji, photo, GIF, or video avatar appears in the map information panel.

No `.env`, tokens, database data, uploaded media, dependencies, or generated build files are included.
