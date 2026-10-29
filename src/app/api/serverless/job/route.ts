import { connection } from 'next/server';
import { NebiusServerlessDaemon } from '@/lib/serverless/background-daemon';
import { ServerlessJobRecord } from '@/lib/types';
import { jsonBody, RequestError, errorResponse } from '@/lib/http/request';
export async function GET() { await connection(); return Response.json({ jobs: NebiusServerlessDaemon.listJobs() }); }
export async function POST(req: Request) {
  try {
    const { jobType } = await jsonBody(req);
    if (typeof jobType !== 'string' || !['NIGHTLY_CONSOLIDATION','PROACTIVE_BRIEFING','SKILL_SIMULATION'].includes(jobType)) throw new RequestError('Unsupported job type; no inbox connector configured');
    return Response.json({ success: true, job: await NebiusServerlessDaemon.triggerJob(jobType as ServerlessJobRecord['jobType']) });
  } catch(e) { return errorResponse(e); }
}
