import { NextResponse } from 'next/server';
import { SovereignAgentOrchestrator } from '@/lib/agent/orchestrator';
import { ModelTier } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { prompt, tier = 'nemotron-3-ultra' } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await SovereignAgentOrchestrator.processUserPrompt(prompt, tier as ModelTier);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Agent processing error:', error);
    return NextResponse.json(
      { error: (error as Error)?.message || 'Internal agent execution error' },
      { status: 500 }
    );
  }
}
