# Validation record — 28 October 2026

Validated on the managed Linux development environment with Node 24.19, system Python 3.13, bubblewrap, and Chromium. This record covers the current local source changes, not a deployed public service.

- `npm ci --no-audit --no-fund`: passed with the final lockfile.
- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript. Private state/status routes render per request; the build no longer fetches Google Fonts.
- `npm run test:provider`: 5 fixture tests passed. These exercise real adapter code with mocked responses: explicit demo behavior, authenticated HTTPS request shape, configured model ID, provider failure propagation, empty output, and insecure-endpoint rejection. They do not prove live Nebius authorization.
- `npm run test:integration`: 14 API checks passed, plus assertions for authentication, cross-origin rejection, malformed JSON, real task planning/completion, built-in skill audit, worker deduplication, application restart persistence, privacy deletion, runtime status freshness, and refusal to serve unauthenticated production configuration.
- `npm run test:browser`: passed through real Chromium. Exercises saving personal facts, creating/planning/completing tasks, registering a reusable Python skill, chatting with that skill, restoring conversation history after reload, data export, and task creation on a 390px mobile viewport. Browser runtime errors are asserted absent.
- Real Python verification covered successful output, exception propagation, denied host-file access, denied network egress, and output bounds. Unsupported runtimes fail closed.

## Not yet verified

- A real NVIDIA model call on Nebius: no usable Nebius key/model configuration was available during validation. Run `npm run test:live` after configuration.
- The public HTTPS deployment and continuously supervised production worker.
- Docker image build/runtime or installation of the systemd service templates on a destination host. The native Linux app workflow is the tested deployment basis.
- Public YouTube publication and final submission URLs.

NemoClaw/OpenShell, Hermes Agent, Nebius Serverless, external mail/calendar integrations, hardware attestation, and multi-tenant isolation are not implemented or claimed.
