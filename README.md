# SovereignClaw — your private daily-work assistant

**Category: Personal AI Track.** SovereignClaw combines owner-controlled local memory, a daily task planner, reusable isolated Python skills, and NVIDIA model inference through Nebius Token Factory. A separate background worker produces a daily briefing while the browser is closed.

## A concrete demo

1. Save a preference such as “prefers deep work before noon” in Privacy controls.
2. Add two real priorities and deadlines in Daily Planner. Build a focus block and inspect deadline risks.
3. Opt in to sharing memory and tasks, then discuss the plan with a live NVIDIA model on Nebius. The response names the configured model; demo mode is always labeled.
4. Enable Python tools, register a small reusable skill, and run it again from the skill list. Failed executions never become successful results.
5. Run the background worker, inspect the saved briefing, restart the server, and show that tasks, conversations, facts, and custom skills remain.
6. Export your data or delete personal memory from Privacy controls.

## Run locally

Requires Node.js 24+, npm, Linux, system Python at `/usr/bin/python3`, and `bubblewrap` with user/network namespaces available. Python tools fail closed on unsupported hosts; chat, planning, and memory still work. On Debian/Ubuntu, install `python3` and `bubblewrap` through the OS package manager.

```bash
npm ci
cp .env.example .env.local  # only if you do not already have local configuration
npm run dev
```

The development server binds to loopback on port 3000. `INFERENCE_MODE=demo` explicitly enables a local demo response; it is not evidence of NVIDIA inference. No fonts or model weights are downloaded during the build.

For real inference, securely configure `NEBIUS_API_KEY`, `NEBIUS_BASE_URL`, and `NEBIUS_MODEL` using an available NVIDIA model ID from your Nebius account. Set `INFERENCE_MODE=live`. Provider errors are reported, never silently replaced with simulated answers. `NEBIUS_MODEL` overrides the optional tier aliases. Run `npm run test:live` against the running application to verify a non-demo NVIDIA response.

The app respects the inherited HTTP(S) proxy through Node 24's `--use-env-proxy` option. Keep TLS verification and configured CA trust enabled. Ensure the configured Nebius endpoint is allowed by your environment's network policy.

## Privacy and access

- This is a **single-owner application**. Production refuses access until `ASSISTANT_PASSWORD` is set. Browser username: `owner`. Serve it behind HTTPS; use a separate test instance with synthetic data for judges.
- Personal facts, tasks, chat history, custom skills, review records, and job logs are stored in `SOVEREIGN_DATA_DIR` (default `.sovereign-data`). Files are private to the service OS user. Use an encrypted persistent volume if you require encryption at rest.
- Memory/task sharing, Python tools, and background jobs are off by default. Your prompt goes to the configured model when you send it; matching memory, open tasks, and tool output are included only with your opt-in.
- The local redactor and injection checks are heuristic, not a guarantee that every secret or attack is detected. Redacted secret values are not restored into model output.
- Export downloads your application data. Delete personal memory removes facts, episodes, chats, reviews, and job logs; tasks, skills, and preferences are retained and explicitly disclosed.
- Python execution uses Linux bubblewrap namespaces, no network, a read-only system filesystem, a private work directory, an 8-second wall deadline, a 3-second CPU limit, and a 256 MiB address-space limit. It does not claim hardware attestation or NVIDIA OpenShell integration.

## Background work

Enable background jobs in Privacy controls, then run:

```bash
npm run worker
```

The worker checks once per minute and creates one local briefing per day in `ASSISTANT_TIMEZONE`. It reads real open tasks and stored facts, records deadline risks, and saves results on disk. Run both app and worker under a supervisor for continuous operation. The worker recovers stale locks from dead processes. A crash between job completion and checkpoint writing can produce a duplicate briefing; this is not an exactly-once distributed queue.

No email or external calendar account is connected. The planner produces proposals and tracks your own tasks; it does not claim to have changed external calendars or sent messages.

## Checks

```bash
npm run lint
npm run build
npm run test:integration
npm run test:provider
# Optional real-browser workflow checks (requires Chromium):
npm run test:browser
```

Integration checks launch a production server with a temporary data directory and random owner password. They exercise API behavior, real Python execution and failures, filesystem/network isolation, task planning, worker deduplication, authentication, deletion, and persistence across restart. They do not require cloud credentials and are not a substitute for `npm run test:live`.

`npm run test:apis` targets an already-running app (`ASSISTANT_URL`, default port 3000). It creates test records; use a disposable data directory. Supply `ASSISTANT_PASSWORD` in the test process when authentication is enabled.

## Deployment and submission

See [deployment instructions](docs/DEPLOYMENT.md), [submission description and requirement mapping](docs/SUBMISSION.md), and the [three-minute video storyboard](docs/DEMO_VIDEO.md).

NVIDIA model inference on Nebius is the required cloud integration. NemoClaw, OpenShell, Hermes Agent, and Nebius Serverless are not currently integrated. The implementation uses a custom privacy filter, bubblewrap, a Python skill registry, and a local background worker; no GPU performance, enclave, or serverless claims should be inferred from legacy internal class names.

## Model not responding on Windows or WSL

Open `.env.local` beside `package.json` (not `.env.example` and not `.env.local.txt`). Set `NEBIUS_MODEL=nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`, the real `NEBIUS_API_KEY`, and `NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1`. This Nano model was verified with a real provider call on 29 October 2026; your account's catalog remains the authority on availability. Set `INFERENCE_MODE=live` for the submission. Stop and restart `npm run dev` after configuration changes.

Run `npm run doctor:nebius` to check authentication and list available NVIDIA models. Then run `npm run doctor:nebius -- --infer` for a short live request. The diagnostic runs without the web server and does not print your key. `npm run test:live` additionally checks the running app. Model IDs are exact identifiers, not display labels such as “Nemotron Ultra.” The diagnostic inherits process environment variables, which override `.env.local`; remove stale shell variables if it reports a different configuration than you expect.
