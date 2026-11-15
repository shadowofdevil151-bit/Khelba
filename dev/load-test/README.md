# Battle socket load test

1. Set `ACCESS_TOKEN_SECRET` in the environment (normally already in `.env`); `ACCESS_TOKEN_EXPIRY` is optional and defaults to 900 seconds.
2. Each virtual user gets a fresh JOSE token and random Mongo-shaped `userId`/`sessionId`, username, role, tier, and token version. The processor generates it before connecting and sends it in `handshake.auth.accessToken`. This does not create database users or sessions.
3. The existing `authenticateAccessToken` in `src/modules/auth/authenticateAccessToken.js` validates users and sessions in MongoDB. For this local-only test, bypass those lookups and construct the socket user from the token claims; do not deploy that bypass. Then test users/sessions need not be registered, but MongoDB is still needed for MCQs and battle persistence.
4. Ensure the API, Redis, worker, bot accounts, and MCQs for subject `275`/chapter `5` are available.
5. Run against a local or isolated staging system only:

   ```sh
   TARGET_URL=http://localhost:3000 npx artillery run dev/load-test/artillery.yml
   ```

   PowerShell:

   ```powershell
   $env:TARGET_URL = "http://localhost:3000"
   npx artillery run dev/load-test/artillery.yml
   ```

Each virtual user connects to `/battle`, queues for subject `275`/chapter `5`, and submits a random valid option after a random 5–20 second delay following an opponent answer event. It disconnects after the server finalizes all 10 questions. The test ramps to 15 new players/second and caps active virtual users at 300; increase gradually while monitoring API, worker, Redis, and MongoDB capacity.

Tokens are generated per VU and kept in memory. No static tokens or CSV are needed.

Grafana, Prometheus, Loki, and the OpenTelemetry Collector are available with:

```sh
docker compose up -d
```

Grafana: `http://localhost:3001` (default local login `admin` / `admin`; set `GRAFANA_ADMIN_PASSWORD` before startup). Open the provisioned **Khelba API overview** dashboard for metrics and logs together. Use Grafana Explore and select **Loki** to search logs (for example `{service_name="khelba-api"}` or `{service_name="khelba-worker"}`). Prometheus remains available at `http://localhost:9090` for metric queries. The API no longer exposes `/metrics`; the app sends OTLP to the Collector on ports `4317` (gRPC) and `4318` (HTTP).
