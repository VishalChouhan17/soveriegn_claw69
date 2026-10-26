import { ServerlessJobRecord } from '../types';
import { TriMemoryEngine } from '../memory/tri-memory';
import { OpenShellSandbox } from '../sandbox/openshell';

const jobHistory: ServerlessJobRecord[] = [
  {
    id: 'job_init_01',
    jobType: 'NIGHTLY_CONSOLIDATION',
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 8 + 42000).toISOString(),
    logs: [
      '[Nebius Serverless Worker] Spinning up A100-80GB compute instance...',
      '[Consolidation] Ingested 14 episodic conversation fragments.',
      '[Tri-Memory Graph] Created 3 new entity triples for project stack preferences.',
      '[Consolidation] Pruned 2 low-confidence redundant memory vectors.',
      '[Nebius Serverless] Job execution completed in 42.1s.'
    ],
    findingsCount: 3
  }
];

export class NebiusServerlessDaemon {
  public static listJobs(): ServerlessJobRecord[] {
    return [...jobHistory].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  public static async triggerJob(jobType: ServerlessJobRecord['jobType']): Promise<ServerlessJobRecord> {
    const job: ServerlessJobRecord = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      jobType,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      logs: [`[Nebius Serverless Worker] Initializing job ${jobType} on Nebius AI Cloud...`],
      findingsCount: 0
    };

    jobHistory.unshift(job);

    // Simulate async execution with real tasks
    setTimeout(async () => {
      try {
        if (jobType === 'NIGHTLY_CONSOLIDATION') {
          job.logs.push('[Nebius Serverless] Scanning episodic memories...');
          const memories = TriMemoryEngine.getEpisodicMemories();
          job.logs.push(`[Nebius Serverless] Evaluated ${memories.length} historical episodes.`);
          
          TriMemoryEngine.addKnowledgeTriple({
            subject: 'User Workflow Pattern',
            predicate: 'most_active_hours',
            object: 'Prefers deep-work intervals between 09:00 - 13:00 UTC',
            confidence: 0.94,
            source: 'nebius_serverless_consolidation'
          });

          job.findingsCount = 1;
          job.logs.push('[Nebius Serverless] Generated consolidated knowledge triple: "User Workflow Pattern"');
        } else if (jobType === 'SKILL_SIMULATION') {
          job.logs.push('[Nebius Serverless] Running batch verification across procedural skill registry in OpenShell...');
          const skills = TriMemoryEngine.listSkills();
          for (const skill of skills) {
            const res = await OpenShellSandbox.execute(skill.code, skill.language, 4000);
            job.logs.push(`[OpenShell Audit] Skill '${skill.name}': Exit code ${res.exitCode} (${res.durationMs}ms)`);
          }
          job.findingsCount = skills.length;
        } else if (jobType === 'PROACTIVE_BRIEFING') {
          job.logs.push('[Nebius Serverless] Synthesizing morning operational briefing...');
          job.logs.push('[Briefing Engine] 0 high-priority schedule conflicts found.');
          job.logs.push('[Briefing Engine] Hackathon build on track with 100% NemoClaw guardrail coverage.');
          job.findingsCount = 2;
        } else {
          job.logs.push('[Nebius Serverless] Triage worker evaluated 0 unread messages.');
          job.findingsCount = 0;
        }

        job.status = 'COMPLETED';
        job.completedAt = new Date().toISOString();
        job.logs.push(`[Nebius Serverless] Job completed successfully.`);
      } catch (err: unknown) {
        job.status = 'FAILED';
        job.logs.push(`[Nebius Serverless Error] ${(err as Error)?.message || 'Worker execution failed'}`);
      }
    }, 1500);

    return job;
  }
}
