import { NextResponse } from 'next/server';
import { NebiusServerlessDaemon } from '@/lib/serverless/background-daemon';

export async function GET() {
  const jobs = NebiusServerlessDaemon.listJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  try {
    const { jobType } = await req.json();

    if (!jobType) {
      return NextResponse.json({ error: 'jobType is required' }, { status: 400 });
    }

    const job = await NebiusServerlessDaemon.triggerJob(jobType);
    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error)?.message || 'Serverless trigger error' }, { status: 500 });
  }
}
