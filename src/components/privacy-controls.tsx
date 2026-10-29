'use client';
import { useEffect, useState } from 'react';
type Settings = { shareMemoryWithModel: boolean; executeSkills: boolean; backgroundJobs: boolean };
export function PrivacyControls({ onMemoryChanged }: { onMemoryChanged?: (deleted: boolean) => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [mode, setMode] = useState('Checking inference configuration…');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/status').then(async r => { if (!r.ok) throw new Error('Could not load settings'); return r.json(); })
      .then(d => { setSettings(d.settings); setMode(d.inference === 'demo' ? 'Demo mode · no model called' : d.inference === 'not-configured' ? 'Nebius credentials required' : 'Nebius credentials configured · verify with a live prompt'); })
      .catch(e => setNotice(e.message));
  }, []);
  async function update(key: keyof Settings, value: boolean) {
    setBusy(true);
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) });
      if (!r.ok) throw new Error('Setting was not saved');
      setSettings(await r.json()); setNotice('Privacy preference saved on your private disk.');
    } catch (e) { setNotice((e as Error).message); } finally { setBusy(false); }
  }
  async function saveFact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
    const r = await fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: 'User', predicate: String(data.get('predicate')), object: String(data.get('fact')) }) });
    setNotice(r.ok ? 'Fact saved locally.' : 'Fact could not be saved.');
    if (r.ok) { form.reset(); onMemoryChanged?.(false); }
  }
  async function exportMemory() {
    const r = await fetch('/api/export'); if (!r.ok) return setNotice('Export failed');
    const url = URL.createObjectURL(new Blob([JSON.stringify(await r.json(), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'sovereignclaw-private-memory.json'; a.click(); URL.revokeObjectURL(url);
  }
  async function eraseMemory() {
    if (!window.confirm('Delete all saved facts, episodes, chat history, job logs, and approval records from this assistant? Tasks, skills, and privacy preferences are retained.')) return;
    const r = await fetch('/api/memory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
    setNotice(r.ok ? 'Personal memory deleted.' : 'Deletion failed.');
    if (r.ok) onMemoryChanged?.(true);
  }
  return <details className="privacy-controls">
    <summary><strong>{mode}</strong> · Privacy controls &amp; personal memory</summary>
    <p>Memory stays on your server’s disk. Only your prompt goes to Nebius unless you explicitly share matching memory, open tasks, and tool output. No email or calendar account is connected.</p>
    {settings && <div className="privacy-options">{([
      ['shareMemoryWithModel', 'Share matching memory, open tasks, and tool output with the cloud model'],
      ['executeSkills', 'Allow network-isolated Python tools'],
      ['backgroundJobs', 'Allow the background worker to create daily local briefings'],
    ] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={settings[key]} disabled={busy} onChange={e => update(key, e.target.checked)} /> {label}</label>)}</div>}
    <form onSubmit={saveFact} className="privacy-form">
      <input name="predicate" aria-label="Memory relationship" placeholder="Relationship, e.g. prefers" required maxLength={100} />
      <input name="fact" aria-label="Personal fact" placeholder="Fact, e.g. deep work before noon" required maxLength={2000} />
      <button className="btn btn-primary btn-sm" type="submit">Save personal fact</button>
    </form>
    <button className="btn btn-ghost btn-sm" onClick={exportMemory}>Export all personal data</button>
    <button className="btn btn-ghost btn-sm" onClick={eraseMemory}>Delete personal memory</button>
    <p role="status">{notice}</p>
  </details>;
}
