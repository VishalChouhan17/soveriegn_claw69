import { NextResponse, connection } from 'next/server';
import { getSettings } from '@/lib/storage/local-store';
export async function GET() {
  await connection();
  return NextResponse.json({
    inference: process.env.NEBIUS_API_KEY ? 'live-configured-unverified' : process.env.INFERENCE_MODE === 'demo' ? 'demo' : 'not-configured',
    provider: 'Nebius Token Factory',
    model: process.env.NEBIUS_MODEL || 'Configured NVIDIA Nemotron tier',
    memory: 'Private local disk (persistent volume required in hosting)',
    executor: 'Linux bubblewrap + Python; fail-closed if unavailable',
    worker: 'Separate local worker; not a Nebius Serverless integration',
    settings: getSettings(),
  });
}
