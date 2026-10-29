import { listTasks, planDay } from '../tasks/planner';
import { randomUUID } from 'node:crypto';
import { ServerlessJobRecord } from '../types';
import { TriMemoryEngine } from '../memory/tri-memory';
import { OpenShellSandbox } from '../sandbox/openshell';
import { getSettings, readRecords, saveRecord } from '../storage/local-store';
export class NebiusServerlessDaemon {
  static listJobs() {
    return readRecords<ServerlessJobRecord>('jobs').sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  static async triggerJob(jobType: ServerlessJobRecord['jobType']) {
    if (!getSettings().backgroundJobs) throw new Error('Enable background jobs in Privacy controls first.');
    if (!['NIGHTLY_CONSOLIDATION','PROACTIVE_BRIEFING','SKILL_SIMULATION'].includes(jobType)) throw new Error('Unsupported job type; no inbox connector is configured.');
    const job: ServerlessJobRecord = { id: randomUUID(), jobType, status: 'RUNNING', startedAt: new Date().toISOString(), logs: ['Local worker started (not Nebius Serverless).'], findingsCount: 0 };
    saveRecord('jobs', job);
    try {
      if (jobType === 'SKILL_SIMULATION') {
        if (!getSettings().executeSkills) throw new Error('Python tool execution is disabled.');
        for (const skill of TriMemoryEngine.listSkills()) {
          const res = await OpenShellSandbox.execute(skill.code, skill.language, 4000);
          job.logs.push(`${skill.name}: ${res.success ? 'PASS' : 'FAIL'}: ${res.stdout || res.stderr}`);
          if (!res.success) throw new Error(`Skill verification failed: ${skill.name}`);
          job.findingsCount++;
        }
      } else {
        const memories = TriMemoryEngine.getEpisodicMemories();
        const knowledge = TriMemoryEngine.getKnowledgeGraph();
        job.findingsCount = memories.length;
        job.logs.push(`Observed ${memories.length} saved episodes and ${knowledge.length} knowledge records.`);
        const summary = knowledge.slice(-10).map(k => `${k.subject}: ${k.predicate} ${k.object}`).join('; ') || 'No personal facts saved yet.';
        job.logs.push(summary);
        const tasks = listTasks().filter(t => t.status === 'open');
        const overdue = tasks.filter(t => t.dueAt && Date.parse(t.dueAt) < Date.now());
        job.logs.push(`${tasks.length} open tasks; ${overdue.length} overdue.`);
        for (const item of planDay(new Date(), 240).scheduled) job.logs.push(`${item.start}: ${item.task.title} (${item.task.durationMinutes} min)${item.deadlineRisk ? ' — deadline at risk' : ''}`);
        job.findingsCount = tasks.length;
        TriMemoryEngine.recordEpisode(jobType === 'PROACTIVE_BRIEFING' ? 'Personal briefing' : 'Memory review', summary, 'neutral', ['background', jobType]);
      }
      job.status = 'COMPLETED';
    } catch (err) {
      job.status = 'FAILED'; job.logs.push(err instanceof Error ? err.message : 'Worker failed');
    }
    job.completedAt = new Date().toISOString();
    return saveRecord('jobs', job);
  }
}
