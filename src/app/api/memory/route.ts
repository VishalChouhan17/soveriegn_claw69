import { connection } from 'next/server';
import { clearRecords } from '@/lib/storage/local-store';
import { TriMemoryEngine } from '@/lib/memory/tri-memory';
import { jsonBody, RequestError, errorResponse } from '@/lib/http/request';
export async function GET() {
  await connection();
  return Response.json({ knowledge: TriMemoryEngine.getKnowledgeGraph(), episodes: TriMemoryEngine.getEpisodicMemories() });
}
export async function POST(req: Request) {
  try {
    const { subject, predicate, object, confidence = 0.9 } = await jsonBody(req);
    if (typeof subject !== 'string' || !subject.trim() || subject.length > 2000 || typeof predicate !== 'string' || !predicate.trim() || predicate.length > 2000 || typeof object !== 'string' || !object.trim() || object.length > 2000 || typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new RequestError('Valid subject, predicate, object, and confidence required');
    return Response.json({ success: true, triple: TriMemoryEngine.addKnowledgeTriple({ subject, predicate, object, confidence, source: 'owner' }) });
  } catch(e) { return errorResponse(e); }
}
export async function DELETE() {
  for (const collection of ['knowledge', 'episodes', 'approvals', 'conversations', 'jobs']) clearRecords(collection);
  return Response.json({ success: true });
}
