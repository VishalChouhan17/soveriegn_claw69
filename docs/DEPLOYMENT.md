# Hosting the full workflow

Use a persistent Linux VM (including Nebius AI Cloud if desired), Node.js 24+, system Python, and bubblewrap. A stateless function host is unsuitable for the local disk store and continuously running worker. This application is for one owner, not a multi-tenant public SaaS.

1. Create a dedicated unprivileged `sovereign` service user. Install Node 24, Python 3, and bubblewrap from trusted sources. Verify that this user can run `bwrap --unshare-all --ro-bind /usr /usr --ro-bind /lib /lib --ro-bind /lib64 /lib64 --proc /proc --dev /dev /usr/bin/python3 --version`. Do not disable isolation to make skill tests pass.
2. Put the checkout at `/opt/sovereignclaw`, owned by the service user. Run `npm ci`, `npm run lint`, `npm run build`, and `npm run test:integration` there.
3. Create `/var/lib/sovereignclaw`, owned by the service user with mode 0700. Mount durable storage there. Back up this directory while app/worker writes are paused; exports are portable JSON but an automated import/migration feature is not provided.
4. Create `/etc/sovereignclaw.env`, readable only by the service user/root, using the variable names in `.env.example`. Set `SOVEREIGN_DATA_DIR=/var/lib/sovereignclaw`, a strong `ASSISTANT_PASSWORD`, the real Nebius key, the exact NVIDIA model ID from your account, `INFERENCE_MODE=live`, and your timezone. Do not commit this file.
5. Adapt and install both service files under `deploy/` using your actual Node binary and checkout paths, then enable them with systemd. They bind the web server to loopback on port 3000. Enable background jobs in the application.
6. Put an HTTPS reverse proxy in front of port 3000. Preserve the original Host header, forward Authorization, disable caching for application/API responses, limit request bodies to 64 KiB, and allow inference requests up to 60 seconds. Do not expose the loopback backend directly.
7. Verify the HTTPS URL prompts for owner credentials, then run `npm run test:live` against it with `ASSISTANT_URL` and the password available securely to the command. Confirm the returned model is the intended NVIDIA model, not demo mode.
8. Use a separate demo instance containing synthetic personal data for judges. Share its access details through the submission's appropriate private field. Record the video against the live endpoint without showing keys or passwords.

The systemd templates are deployment artifacts, not evidence that a public host has been provisioned. A container image is also supplied, but Python isolation depends on the host allowing unprivileged namespaces inside containers. Do not run with `--privileged` as a workaround; prefer the tested native Linux workflow when namespace creation is blocked.

## Failure diagnosis

- `503 Set ASSISTANT_PASSWORD`: configure a runtime password and restart the service.
- `401`: use browser username `owner` and the configured password.
- Nebius HTTP error: check model availability, credits, API scope, endpoint, and proxy policy. The application deliberately does not substitute a fake response.
- `bwrap` error: the host is missing bubblewrap or denies namespaces. Tools remain disabled until the supported isolated runtime works.
- Background briefing absent: enable the privacy preference, run the worker with the same data directory/password/timezone as the app, and check service logs. The one-day checkpoint survives restart.
- Lost data after redeploy: the data directory was not mounted on persistent storage.
