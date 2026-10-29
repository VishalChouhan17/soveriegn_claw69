# Three-minute demo storyboard

Use a real NVIDIA model on Nebius Token Factory for the recording. Demo mode is useful for rehearsals but does not satisfy the model requirement. Use synthetic tasks/preferences and keep keys, passwords, billing details, and environment settings out of frame.

| Time | Screen/action | Suggested narration |
| --- | --- | --- |
| 0:00–0:15 | Title and command cockpit | “SovereignClaw is a private assistant for daily work. It remembers your preferences, plans around your priorities, and uses only the tools and context you allow.” |
| 0:15–0:40 | Privacy controls; save “prefers deep work before noon”; enable selected context sharing | “Personal memory lives on my server. I choose when matching facts, open tasks, and tool results may be sent to the model.” |
| 0:40–1:10 | Daily Planner: add a deadline, make a focus block, show deadline risk | “Here are my real priorities for this demo. The local planner fits them into a work block and shows what cannot fit.” |
| 1:10–1:40 | Discuss with Nemotron; show the actual returned model ID and answer | “This response comes from this NVIDIA model through Nebius Token Factory. It reasons over only the context I opted to share. It does not pretend to update my external calendar.” |
| 1:40–2:05 | Enable Python tools, register a small skill, run it again | “A skill is reusable code. It runs inside a network-isolated Linux environment. This is the actual output; failures are reported as failures.” |
| 2:05–2:30 | Show a saved daily briefing, close/reopen browser or briefly restart app | “The separate worker runs while the browser is closed. Tasks, conversation history, and skills survive restarts.” |
| 2:30–2:50 | Export data; show sharing disabled, optional failed tool request | “I can withdraw sharing permission and export my data. The assistant's access is controlled by me.” |
| 2:50–3:00 | Final screen: category and actual hosted URL | “SovereignClaw, Personal AI Track: persistent memory, explicit control, and NVIDIA inference on Nebius.” |

Before recording:

1. Run `npm run lint`, `npm run build`, and `npm run test:integration`.
2. On the actual host, run `npm run test:live` and verify the model ID and provider response.
3. Verify production authentication and the demo URL from a separate browser session.
4. Start app and worker under supervision; enable background jobs and verify a saved briefing.
5. Rehearse to finish under three minutes. Record readable UI text and the live response rather than a terminal full of configuration.
6. Upload to YouTube with **Public** visibility and copy the real URL into the submission.
