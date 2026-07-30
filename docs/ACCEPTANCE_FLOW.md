# Two-user acceptance flow

Use two normal browser profiles (or one normal + incognito) with separate Google accounts. For local demo auth, change the hardcoded demo email temporarily or use Google because the demo button intentionally maps to one account.

1. Sign in both users and complete unique usernames.
2. User A creates a group and shares its invite code; User B joins.
3. Open the group chat in both windows. Send text, record audio, and upload a photo.
4. Share a coordinate snapshot to Chat; verify Open on Map centers it.
5. Open Map in both windows and start location sharing or use Simulate movement.
6. Freeze User A. Confirm the marker remains unchanged and the profile says Frozen.
7. User A creates a public spot. Confirm User B sees it without refreshing.
8. User B opens A’s profile and presses Show Public Spots. Confirm the map fits A’s accessible public spots; an owner with none produces a clear empty notice.
9. Share the spot to the group chat, open it from Chat, then delete the original spot. Reload history and confirm Spot unavailable.
10. From User B’s marker, open/create a direct message. Repeat to confirm the same conversation is returned.
11. Build a walking route to User A, then a driving route to a spot. Confirm the label says the destination is a last-coordinate snapshot and does not reroute.
12. Create a private spot and confirm it is invisible to User B, including when User B is an admin.

Audio recording requires a secure browser context (`localhost` qualifies) and microphone permission. Google login requires an authorized JavaScript origin matching the web URL.
