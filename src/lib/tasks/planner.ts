import { randomUUID } from 'node:crypto';
import { readRecords, saveRecord, removeRecord } from '../storage/local-store';
import { RequestError } from '../http/request';
export interface PersonalTask {
  id: string; title: string; priority: 'high' | 'normal' | 'low';
  durationMinutes: number; dueAt: string | null; status: 'open' | 'done'; createdAt: string;
}
export function listTasks() { return readRecords<PersonalTask>('tasks').sort((a,b) => a.createdAt.localeCompare(b.createdAt)); }
export function createTask(body: Record<string, unknown>) {
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 300) throw new RequestError('Task title must be 1–300 characters');
  const priority = body.priority ?? 'normal';
  if (!['high','normal','low'].includes(String(priority))) throw new RequestError('Invalid task priority');
  const duration = body.durationMinutes ?? 30;
  if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 5 || duration > 480) throw new RequestError('Duration must be 5–480 whole minutes');
  const due = body.dueAt ? new Date(String(body.dueAt)) : null;
  if (due && !Number.isFinite(due.getTime())) throw new RequestError('Invalid due date');
  return saveRecord<PersonalTask>('tasks', { id: randomUUID(), title: body.title.trim(), priority: priority as PersonalTask['priority'], durationMinutes: duration, dueAt: due?.toISOString() || null, status: 'open', createdAt: new Date().toISOString() });
}
export function updateTask(body: Record<string, unknown>) {
  const task = listTasks().find(t => t.id === body.id);
  if (!task) throw new RequestError('Task not found', 404);
  if (body.status !== 'open' && body.status !== 'done') throw new RequestError('Status must be open or done');
  return saveRecord('tasks', { ...task, status: body.status });
}
export function deleteTask(id: unknown) {
  if (typeof id !== 'string' || !listTasks().some(t => t.id === id)) throw new RequestError('Task not found',404);
  removeRecord('tasks', id);
}
export function planDay(start: Date, availableMinutes = 240) {
  if (!Number.isFinite(start.getTime()) || !Number.isInteger(availableMinutes) || availableMinutes < 5 || availableMinutes > 720) throw new RequestError('Choose a valid start time and 5–720 available minutes');
  const priorities = { high: 0, normal: 1, low: 2 };
  const tasks = listTasks().filter(t => t.status === 'open').sort((a,b) =>
    (a.dueAt ? Date.parse(a.dueAt) : Infinity) - (b.dueAt ? Date.parse(b.dueAt) : Infinity) || priorities[a.priority] - priorities[b.priority] || a.createdAt.localeCompare(b.createdAt));
  let cursor = start.getTime(); const end = cursor + availableMinutes * 60000;
  const scheduled: Array<{ task: PersonalTask; start: string; end: string; deadlineRisk: boolean }> = [];
  const unscheduled: PersonalTask[] = [];
  for (const task of tasks) {
    const finish = cursor + task.durationMinutes * 60000;
    if (finish > end) { unscheduled.push(task); continue; }
    scheduled.push({ task, start: new Date(cursor).toISOString(), end: new Date(finish).toISOString(), deadlineRisk: Boolean(task.dueAt && finish > Date.parse(task.dueAt)) });
    cursor = finish + 5 * 60000;
  }
  return { scheduled, unscheduled, explanation: 'Earliest deadline first, then priority. Five-minute breaks between tasks. This is a local proposal; it does not change external calendars.' };
}
