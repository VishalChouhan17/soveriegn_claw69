import { connection } from 'next/server';
import { TriMemoryEngine } from '@/lib/memory/tri-memory';
import { jsonBody, RequestError, errorResponse } from '@/lib/http/request';
export async function GET() { await connection(); return Response.json({ skills: TriMemoryEngine.listSkills() }); }
export async function POST(req: Request) {
  try {
    const { name, description = 'Owner-created Python skill', code, language = 'python' } = await jsonBody(req);
    if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof code !== 'string' || !code.trim() || code.length > 32768 || language !== 'python' || typeof description !== 'string' || description.length > 1000) throw new RequestError('Provide a name, description, and Python code up to 32 KiB');
    const result = await TriMemoryEngine.forgeSkill(name, description, code, {}, 'python', false);
    return Response.json({ success: true, ...result });
  } catch(e) { return errorResponse(e); }
}
