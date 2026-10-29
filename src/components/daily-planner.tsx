'use client';
import { useCallback, useEffect, useState } from 'react';
import type { PersonalTask } from '@/lib/tasks/planner';
type Plan = { scheduled: { task: PersonalTask; start: string; end: string; deadlineRisk: boolean }[]; unscheduled: PersonalTask[]; explanation: string };
export function DailyPlanner({ askAssistant }: { askAssistant: (prompt: string) => void }) {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { const r = await fetch('/api/tasks'); if (!r.ok) throw new Error('Could not load tasks'); setTasks((await r.json()).tasks); }
    catch(e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/tasks', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('Could not load tasks'); return r.json(); })
      .then(d => setTasks(d.tasks)).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);
  async function mutate(body: object, method = 'POST') {
    setBusy(true); setError('');
    try { const r = await fetch('/api/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); await refresh(); setPlan(null); return true; }
    catch(e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = e.currentTarget; const d = new FormData(f);
    if (await mutate({ title: d.get('title'), priority: d.get('priority'), durationMinutes: Number(d.get('duration')), dueAt: d.get('due') ? new Date(String(d.get('due'))).toISOString() : null })) f.reset();
  }
  async function schedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const d = new FormData(e.currentTarget); setBusy(true); setError('');
    try { const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start: d.get('start') ? new Date(String(d.get('start'))).toISOString() : new Date().toISOString(), availableMinutes: Number(d.get('minutes')) }) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setPlan(data); }
    catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <div className="page-content planner-page">
    <div className="card"><div className="card-header"><h2 className="card-title">Your next focused day</h2></div><div className="card-body">
      <p className="planner-description">Turn your own priorities into a practical plan. Tasks stay on this server; cloud context sharing is your choice in Privacy controls.</p>
      <form className="planner-form" onSubmit={add}>
        <label>Task<input name="title" required maxLength={300} placeholder="Prepare the product demo" /></label>
        <label>Priority<select name="priority" defaultValue="normal"><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label>
        <label>Minutes<input name="duration" type="number" min="5" max="480" defaultValue="30" required /></label>
        <label>Deadline (optional, local time)<input name="due" type="datetime-local" /></label>
        <button className="btn btn-primary" disabled={busy}>Add task</button>
      </form>
      <div className="task-list">{tasks.length === 0 && <p>No tasks yet. Add a real priority to get started.</p>}{tasks.map(task => <article key={task.id} className={`task-row ${task.status === 'done' ? 'done' : ''}`}>
        <label><input aria-label={`Complete ${task.title}`} type="checkbox" checked={task.status === 'done'} disabled={busy} onChange={() => mutate({ id: task.id, status: task.status === 'done' ? 'open' : 'done' }, 'PATCH')} /><strong>{task.title}</strong></label>
        <span>{task.priority} · {task.durationMinutes} min{task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleString()}` : ''}</span>
        <button className="btn btn-ghost btn-sm" disabled={busy} aria-label={`Delete ${task.title}`} onClick={() => { if (window.confirm(`Delete “${task.title}”?`)) void mutate({ id: task.id }, 'DELETE'); }}>Delete</button>
      </article>)}</div>
    </div></div>
    <div className="card"><div className="card-header"><h2 className="card-title">Plan a focus block</h2></div><div className="card-body">
      <form className="planner-form" onSubmit={schedule}>
        <label>Start (blank means now)<input name="start" type="datetime-local" /></label>
        <label>Available minutes<input name="minutes" type="number" min="5" max="720" defaultValue="240" required /></label>
        <button className="btn btn-primary" disabled={busy}>Build local plan</button>
        <button type="button" className="btn btn-ghost" onClick={() => askAssistant('Help me plan my day using my open tasks and saved preferences. Identify deadline risks and suggest a focused work sequence. Do not claim any external calendar changes.')}>Discuss with Nemotron</button>
      </form>
      {plan && <><p className="planner-description">{plan.explanation}</p><ol className="plan-timeline">{plan.scheduled.map(item => <li key={item.task.id}><time>{new Date(item.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–{new Date(item.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><strong>{item.task.title}</strong>{item.deadlineRisk && <span className="deadline-risk">Deadline at risk</span>}</li>)}</ol>{plan.unscheduled.length > 0 && <p>Does not fit: {plan.unscheduled.map(t => t.title).join(', ')}. Choose a longer block or shorten tasks.</p>}</>}
    </div></div>
    {error && <p role="alert" className="deadline-risk">{error}</p>}
  </div>;
}
