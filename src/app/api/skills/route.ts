import { NextResponse } from 'next/server';
import { TriMemoryEngine } from '@/lib/memory/tri-memory';

export async function GET() {
  const skills = TriMemoryEngine.listSkills();
  return NextResponse.json({ skills });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, code, inputs = {}, language = 'python' } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }

    const { skill, sandboxVerification } = await TriMemoryEngine.forgeSkill(
      name,
      description || 'Autonomous procedural skill',
      code,
      inputs,
      language,
      true
    );

    return NextResponse.json({
      success: true,
      skill,
      sandboxVerification
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error)?.message || 'Failed to forge skill' }, { status: 500 });
  }
}
