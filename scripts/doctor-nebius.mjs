// Reads credentials locally; never prints the API key or raw provider errors.
const key = process.env.NEBIUS_API_KEY?.trim();
const selected = (process.argv.find(a => a.startsWith('--model='))?.slice(8) || process.env.NEBIUS_MODEL || process.env.NEBIUS_MODEL_ULTRA || '').trim().replace(/^nebius\//, '');
try {
  if (!key) throw new Error('NEBIUS_API_KEY is missing. Put your real key in .env.local in the project root.');
  const base = new URL((process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1').trim());
  if (base.protocol !== 'https:' || base.username || base.password) throw new Error('Use an HTTPS Nebius endpoint without credentials in its URL.');
  const root = base.href.replace(/\/+$/, '');
  const catalog = await fetch(`${root}/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000), redirect: 'error' });
  if (!catalog.ok) throw new Error(`Model catalog HTTP ${catalog.status}. ${catalog.status === 401 ? 'The key was rejected; check its value and restart the app.' : catalog.status === 403 ? 'Check account access and network policy.' : 'Check the endpoint, account availability, and network connection.'}`);
  const data = await catalog.json();
  const models = (data.data || []).map(m => m.id).filter(id => typeof id === 'string' && /nvidia|nemotron/i.test(id));
  console.log('Nebius authentication: accepted');
  console.log('Available NVIDIA models:\n' + models.map(id => `  ${id}`).join('\n'));
  if (!models.includes(selected)) throw new Error('NEBIUS_MODEL does not exactly match an available model ID above. Copy one into .env.local, restart npm run dev, then rerun this command.');
  console.log(`Selected model: ${selected}`);
  if (!process.argv.includes('--infer')) { console.log('Model configuration is valid. Add -- --infer to make a short live inference request.'); process.exit(0); }
  const r = await fetch(`${root}/chat/completions`, { method:'POST', headers: { Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }, redirect:'error', signal:AbortSignal.timeout(60000), body:JSON.stringify({ model:selected, messages:[{role:'user',content:'In one sentence, what is a personal AI assistant?'}], max_tokens:2048 }) });
  if (!r.ok) throw new Error(`Inference HTTP ${r.status}. Check account credits, rate limits, and model access.`);
  const d = await r.json(); const content = d.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new Error('The model returned no final answer. A reasoning model may need a larger output budget.');
  console.log('Live NVIDIA inference: passed'); console.log(content.trim());
} catch(e) {
  const message = e instanceof Error ? e.message : 'Diagnostic failed';
  console.error(`Nebius diagnostic: ${message === 'fetch failed' ? 'Connection failed. Check HTTPS proxy, firewall, endpoint, and certificate trust.' : message}`);
  process.exitCode = 1;
}
