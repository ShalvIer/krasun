# Krasun online reload fix

From the Krasun project directory:

```bash
unzip -o ~/Downloads/krasun-online-reload-fix.zip
docker compose build --no-cache web api
docker compose up -d --force-recreate web api
```

Then close old Krasun tabs, reopen `http://localhost:5173`, and hard-refresh
with `Cmd + Shift + R`.

Test:

1. Enable `Sharing`.
2. Reload the page.
3. `Sharing` should remain active and location updates should resume.
4. `Freeze`, `Hide`, or logout should prevent automatic resume.
