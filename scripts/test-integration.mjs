import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const dataDir = mkdtempSync(join(tmpdir(), 'sovereign-integration-'));
const password = randomBytes(24).toString('hex');
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, INFERENCE_MODE: 'demo', NEBIUS_API_KEY: '', NEBIUS_MODEL: '', ASSISTANT_PASSWORD: password, SOVEREIGN_DATA_DIR: dataDir, ASSISTANT_URL: base };
const headers = { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`owner:${password}`).toString('base64')}` };
let server; let logs = '';
async function start(extra = {}) {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)], { env: { ...env, ...extra }, stdio: ['ignore','pipe','pipe'] });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-10000); });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${logs}`);
    try { const r = await fetch(`${base}/api/status`, { headers }); if (r.status === 200 || r.status === 503) return; } catch { /* starting */ }
    await delay(100);
  }
  throw new Error('Server did not become ready');
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const closed = new Promise(resolve => server.once('close', resolve));
  server.kill('SIGTERM'); const timer = setTimeout(() => server.kill('SIGKILL'), 5000); await closed; clearTimeout(timer);
}
async function run(file) {
  const child = spawn(process.execPath, [file, ...(file.includes('worker') ? ['--once'] : [])], { env, stdio: 'inherit' });
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  assert.equal(code, 0, file);
}
async function req(path, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  assert.equal(r.status, 200, `${method} ${path}: ${await r.clone().text()}`); return r.json();
}
try {
  await start();
  assert.equal((await fetch(`${base}/api/memory`)).status,401);
  assert.equal((await fetch(`${base}/api/tasks`, { method:'POST',headers:{...headers, Origin:'https://attacker.invalid'},body:'{}' })).status,403);
  assert.equal((await fetch(`${base}/api/chat`, { method:'POST',headers,body:'null' })).status,400);
  assert.equal((await req('/api/status')).inference,'demo');
  await run('test_apis.mjs');
  const { task } = await req('/api/tasks', { title: 'Finish private demo', priority: 'high', durationMinutes: 30, dueAt: new Date(Date.now() + 3600000).toISOString() });
  const plan = await req('/api/plan', { start: new Date().toISOString(), availableMinutes: 60 });
  assert.equal(plan.scheduled[0].task.id,task.id);
  await req('/api/settings', { backgroundJobs:true, executeSkills:true },'PATCH');
  const audit = await req('/api/serverless/job', { jobType:'SKILL_SIMULATION' });
  assert.equal(audit.job.status,'COMPLETED',JSON.stringify(audit.job.logs));
  await run('scripts/worker.mjs'); const jobCount = (await req('/api/serverless/job')).jobs.length;
  await run('scripts/worker.mjs'); assert.equal((await req('/api/serverless/job')).jobs.length,jobCount,'daily worker duplicated briefing');
  const memory = await req('/api/memory'); const skills = await req('/api/skills');
  const history = await req('/api/history'); assert.ok(history.conversations.length);
  await stop(); await start();
  assert.deepEqual(await req('/api/memory'),memory,'memory lost on restart');
  assert.deepEqual(await req('/api/history'),history,'chat lost on restart');
  // Built-in skill timestamps are informational; custom records must be identical.
  assert.deepEqual((await req('/api/skills')).skills.filter(s => s.id.startsWith('skill_') && s.name.startsWith('readiness_')),skills.skills.filter(s => s.name.startsWith('readiness_')));
  assert.ok((await req('/api/tasks')).tasks.some(t => t.id === task.id));
  assert.equal((await req('/api/status')).settings.backgroundJobs,true,'status settings were prerendered');
  await req('/api/tasks',{id:task.id,status:'done'},'PATCH');
  assert.equal((await req('/api/plan',{start:new Date().toISOString(),availableMinutes:60})).scheduled.length,0);
  await req('/api/tasks',{id:task.id},'DELETE');
  await req('/api/memory',{},'DELETE');
  assert.equal((await req('/api/memory')).knowledge.length,0);
  assert.equal((await req('/api/history')).conversations.length,0);
  assert.equal((await req('/api/serverless/job')).jobs.length,0);
  if (process.argv.includes('--browser')) await run('scripts/test-browser.mjs');
  await stop(); await start({ ASSISTANT_PASSWORD:'' });
  assert.equal((await fetch(`${base}/api/memory`)).status,503,'production without password must fail closed');
  console.log('PASS: authentication, CSRF, malformed JSON, task planning, skill audit, worker deduplication, restart persistence, privacy deletion, runtime status, production fail-closed');
} catch(e) { console.error(logs); throw e; }
finally { await stop(); rmSync(dataDir,{recursive:true,force:true}); }
