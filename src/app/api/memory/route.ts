import { NextResponse } from 'next/server';
import { TriMemoryEngine } from '@/lib/memory/tri-memory';

export async function GET() {
  const knowledge = TriMemoryEngine.getKnowledgeGraph();
  const episodes = TriMemoryEngine.getEpisodicMemories();

  return NextResponse.json({
    knowledge,
    episodes
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subject, predicate, object, confidence = 0.9, source = 'manual_injection' } = body;

    if (!subject || !predicate || !object) {
      return NextResponse.json({ error: 'Subject, predicate, and object are required' }, { status: 400 });
    }

    const triple = TriMemoryEngine.addKnowledgeTriple({
      subject,
      predicate,
      object,
      confidence,
      source
    });

    return NextResponse.json({ success: true, triple });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error)?.message || 'Failed to add triple' }, { status: 500 });
  }
}
