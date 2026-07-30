# Deferred extension points

- `MEETING`, `VIDEO`, and `FILE` message enums and honest UI placeholders exist, but their workflows are intentionally not implemented.
- A future meeting-route service can accept manual coordinates, a spot, or a suggested midpoint, then produce participant route/ETA cards. It should reuse `RoutePreview` without claiming turn-by-turn navigation.
- Nearby cafés, restaurants, food stores, and other POIs belong behind a provider interface next to the Mapbox route proxy. No fake discovery data is shown in the MVP.
- Cloud object storage can replace local disk by preserving `storagePath` as an opaque storage key and keeping attachment authorization at the API.
- Additional OAuth providers can implement the same verified-identity interface used by Google.
- Native clients can reuse REST contracts, typed Socket.IO events and PostgreSQL entities. Background mobile location and push notifications need platform-specific permission flows.
