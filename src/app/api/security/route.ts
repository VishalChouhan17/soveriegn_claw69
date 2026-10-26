import { NextResponse } from 'next/server';
import { NemoClawSecurityEngine } from '@/lib/security/nemoclaw';

export async function GET() {
  const pendingApprovals = NemoClawSecurityEngine.listPendingApprovals();
  return NextResponse.json({
    pendingApprovals,
    enclaveActive: true,
    policyVersion: 'NemoClaw-v2.4-ZeroTrust'
  });
}

export async function POST(req: Request) {
  try {
    const { action, id, approved, testPrompt } = await req.json();

    if (action === 'test_scan') {
      const scanResult = NemoClawSecurityEngine.scanAndSanitize(testPrompt || '');
      return NextResponse.json({ scanResult });
    }

    if (action === 'resolve_approval') {
      const success = NemoClawSecurityEngine.resolveApproval(id, Boolean(approved));
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error)?.message || 'Security endpoint error' }, { status: 500 });
  }
}
