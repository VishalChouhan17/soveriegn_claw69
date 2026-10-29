// One owner, one host. Run under a process supervisor; dates use ASSISTANT_TIMEZONE.
import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
const dir = resolve(process.env.SOVEREIGN_DATA_DIR || '.sovereign-data');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const base = process.env.ASSISTANT_URL || 'http://127.0.0.1:3000';
const stateFile = join(dir, 'worker-state.json');
const lockFile = join(dir, 'worker.lock');
const controller = new AbortController();
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => controller.abort());
function lock() {
  try { const fd = openSync(lockFile, 'wx', 0o600); writeFileSync(fd, String(process.pid)); return fd; }
  catch(e) {
    if (e.code !== 'EEXIST') throw e;
    try {
      const pid = Number(readFileSync(lockFile, 'utf8'));
      if (Number.isInteger(pid) && pid > 0) { try { process.kill(pid, 0); return null; } catch(err) { if (err.code !== 'ESRCH') return null; } }
      else if (Date.now() - statSync(lockFile).mtimeMs < 300000) return null;
      unlinkSync(lockFile);
    } catch(err) { if (err.code !== 'ENOENT') throw err; }
    try { const fd = openSync(lockFile, 'wx', 0o600); writeFileSync(fd, String(process.pid)); return fd; } catch(err) { if (err.code === 'EEXIST') return null; throw err; }
  }
}
async function tick() {
  const fd = lock(); if (fd === null) return;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.ASSISTANT_PASSWORD) headers.Authorization = `Basic ${Buffer.from(`owner:${process.env.ASSISTANT_PASSWORD}`).toString('base64')}`;
    const response = await fetch(`${base}/api/settings`, { headers, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Settings HTTP ${response.status}`);
    const settings = await response.json();
    if (!settings.backgroundJobs) return;
    let state = {};
    try { state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch(e) { if (e.code !== 'ENOENT') throw e; }
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.ASSISTANT_TIMEZONE || 'UTC' }).format(new Date());
    if (state.lastBriefing === today) return;
    const r = await fetch(`${base}/api/serverless/job`, { method: 'POST', headers, body: JSON.stringify({ jobType: 'PROACTIVE_BRIEFING' }), signal: AbortSignal.timeout(30000) });
    const result = await r.json();
    if (!r.ok || result.job?.status !== 'COMPLETED') throw new Error(`Briefing failed (HTTP ${r.status})`);
    writeFileSync(`${stateFile}.tmp`, JSON.stringify({ lastBriefing: today, completedAt: new Date().toISOString() }), { mode: 0o600 });
    renameSync(`${stateFile}.tmp`, stateFile);
    console.log(`${today}: personal briefing saved locally`);
  } finally { closeSync(fd); unlinkSync(lockFile); }
}
do {
  try { await tick(); } catch(e) { console.error(e.message); if (process.argv.includes('--once')) process.exitCode = 1; }
  if (process.argv.includes('--once') || controller.signal.aborted) break;
  try { await delay(60000, undefined, { signal: controller.signal }); } catch { break; }
} while (!controller.signal.aborted);
